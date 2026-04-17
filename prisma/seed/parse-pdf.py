#!/usr/bin/env python3
"""
Parse nav_list.pdf into a clean CSV: fund_code,date,nav,investor_return,buy_unit
Handles the multi-column PDF layout by using pdfplumber's word coordinates
to reconstruct rows instead of relying on text order.
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber

PDF_PATH = Path(r"C:\Users\USER\OneDrive\Desktop\nav_list.pdf")
OUT_PATH = Path(__file__).parent / "nav-from-pdf.json"

FUND_MAP = {
    "ekush first unit fund": "EFUF",
    "ekush growth fund": "EGF",
    "ekush stable return fund": "ESRF",
}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
NUM_RE = re.compile(r"^-?\d+(?:\.\d+)?$")


def row_key(top: float, tol: float = 3.0) -> int:
    return int(round(top / tol))


def extract_rows(pdf_path: Path):
    out = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            words = page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
            if not words:
                continue
            # Group by row (top coordinate)
            rows = {}
            for w in words:
                key = row_key(w["top"], tol=4.0)
                rows.setdefault(key, []).append(w)
            for key in sorted(rows):
                line = sorted(rows[key], key=lambda w: w["x0"])
                yield page_idx + 1, line


def parse_fund_prefix(words):
    """Return (fund_code, remaining_words) or (None, words).
    Fund name spans first several words. Try longest match first.
    """
    text = " ".join(w["text"] for w in words).lower()
    for name, code in FUND_MAP.items():
        if text.startswith(name):
            # Figure out how many words to consume
            name_words = name.split()
            if len(words) >= len(name_words):
                joined = " ".join(w["text"].lower() for w in words[: len(name_words)])
                if joined == name:
                    return code, words[len(name_words):]
    return None, words


def main():
    header_seen = False
    records = []  # list of {fund_code, date, nav, ir, buy}
    skipped = 0

    for page, line in extract_rows(PDF_PATH):
        # Skip header row
        first_text = line[0]["text"].lower() if line else ""
        if "fund" in first_text and "name" in " ".join(w["text"].lower() for w in line[:2]):
            header_seen = True
            continue

        fund_code, rest = parse_fund_prefix(line)
        if not fund_code:
            # This happens on continuation columns — skip for now and handle below
            continue
        if not rest:
            skipped += 1
            continue

        # Next token should be date
        date_tok = rest[0]["text"]
        if not DATE_RE.match(date_tok):
            skipped += 1
            continue

        nums = [w["text"] for w in rest[1:] if NUM_RE.match(w["text"])]
        # Accept rows with [nav, ir, buy] OR just date (no values — skip)
        nav = ir = buy = None
        if len(nums) >= 3:
            nav, ir, buy = float(nums[0]), float(nums[1]), float(nums[2])
        elif len(nums) == 2:
            nav, ir = float(nums[0]), float(nums[1])
        elif len(nums) == 1:
            nav = float(nums[0])

        records.append({
            "page": page,
            "fund_code": fund_code,
            "date": date_tok,
            "nav": nav,
            "investor_return": ir,
            "buy_unit": buy,
        })

    print(f"Parsed {len(records)} records (skipped {skipped})", file=sys.stderr)

    # Deduplicate on (fund_code, date) — keep last
    by_key = {}
    for r in records:
        k = (r["fund_code"], r["date"])
        by_key[k] = r
    deduped = list(by_key.values())
    print(f"After dedupe: {len(deduped)}", file=sys.stderr)

    # Only keep rows that have at least nav or investor_return populated
    useful = [r for r in deduped if r["nav"] is not None or r["investor_return"] is not None]
    print(f"Useful rows (nav or IR present): {len(useful)}", file=sys.stderr)

    by_fund = {}
    for r in useful:
        by_fund.setdefault(r["fund_code"], 0)
        by_fund[r["fund_code"]] += 1
    print(f"By fund: {by_fund}", file=sys.stderr)

    OUT_PATH.write_text(json.dumps(useful, indent=2))
    print(f"Wrote {OUT_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
