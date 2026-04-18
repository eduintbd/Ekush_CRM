const ONES = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const TENS = [
  "",
  "",
  "TWENTY",
  "THIRTY",
  "FORTY",
  "FIFTY",
  "SIXTY",
  "SEVENTY",
  "EIGHTY",
  "NINETY",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${ONES[h]} HUNDRED`);
  if (rest > 0) parts.push(twoDigits(rest));
  return parts.join(" ");
}

// Bangladeshi lakh/crore system:
//   1,00,000           -> ONE LAKH
//   1,00,00,000        -> ONE CRORE
export function numberToWordsBDT(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative finite number");
  }

  let n = Math.round(amount);
  if (n === 0) return "ZERO TAKA ONLY";

  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const remainder = n;

  if (crore > 0) parts.push(`${threeDigits(crore)} CRORE`);
  if (lakh > 0) parts.push(`${threeDigits(lakh)} LAKH`);
  if (thousand > 0) parts.push(`${threeDigits(thousand)} THOUSAND`);
  if (remainder > 0) parts.push(threeDigits(remainder));

  return `${parts.join(" ").trim()} TAKA ONLY`;
}
