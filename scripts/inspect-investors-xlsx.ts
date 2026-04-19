import ExcelJS from "exceljs";
import * as path from "node:path";

async function main() {
  const file = path.join(process.cwd(), "public", "Investors Database.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  wb.eachSheet((ws, idx) => {
    console.log(`\n=== Sheet ${idx}: ${ws.name} (rows=${ws.rowCount}, cols=${ws.columnCount}) ===`);
    const maxRows = Math.min(3, ws.rowCount);
    for (let r = 1; r <= maxRows; r++) {
      const row = ws.getRow(r);
      const vals: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const v = row.getCell(c).value;
        vals.push(`${c}:${String(v ?? "")}`);
      }
      console.log(`row ${r}: ${vals.join(" | ")}`);
    }
  });
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
