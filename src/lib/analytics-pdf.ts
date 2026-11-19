import type { AdminAnalyticsData } from "./analytics";
import { BUSINESS } from "./business";
const rs = (n: number) => `Rs. ${n.toFixed(2)}`;
// Small text/table PDF: English labels keep export independent of remote font downloads.
export function createAnalyticsPdf(data: AdminAnalyticsData): Uint8Array {
  const lines = [
    BUSINESS.name + " - Income Report", `Owner: ${BUSINESS.owner} | Phone: ${BUSINESS.mobile}`,
    `Period (India): ${data.start} to ${data.end}`, `Generated: ${new Date(data.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    "Verified payments only, grouped by order date (IST).", "Gross collections before refunds, gateway fees and expenses; not profit.", "",
    "SELECTED PERIOD", `Paid orders: ${data.report.totals.orders} | Printed sides: ${data.report.totals.sides}`,
    `Print income: ${rs(data.report.totals.print)}`, `Spiral binding: ${rs(data.report.totals.binding)} (${data.report.totals.bindingSets} sets)`,
    `Platform fee: ${rs(data.report.totals.fee)}`, `CUSTOMER PAID TOTAL: ${rs(data.report.totals.total)}`, "",
    "PRINTWISE BREAKDOWN (binding and platform fee excluded)", "Paper / Color                 Orders     Sides       Print income",
    ...data.report.printwise.map(g => `${(g.paper + " / " + (g.color === "bw" ? "B&W" : "Color")).padEnd(30)}${String(g.orders).padEnd(11)}${String(g.sides).padEnd(12)}${rs(g.income)}`),
    ...(data.report.printwise.length ? [] : ["No paid orders in this period."]), "",
    "DAILY INCOME (includes binding and platform fee)", "Date                          Orders                Collections",
    ...data.report.daily.map(d => `${d.date.padEnd(30)}${String(d.orders).padEnd(22)}${rs(d.total)}`), "",
    `MONTHLY INCOME - ${data.year} (independent of selected period)`, "Month                         Orders                Collections",
    ...data.monthly.map(d => `${d.date.padEnd(30)}${String(d.orders).padEnd(22)}${rs(d.total)}`), "",
    "Files expire after pickup; retained financial records support this report.",
  ];
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += 47) chunks.push(lines.slice(i, i + 47));
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"];
  const refs: number[] = [];
  const clean = (s: string) => s.replace(/[^\x20-\x7E]/g, " ").replace(/([\\()])/g, "\\$1");
  chunks.forEach((chunk, i) => {
    const page = objects.length + 1, stream = page + 1;
    refs.push(page);
    let content = "0.94 0.96 0.99 rg 30 792 535 28 re f\n0.08 0.15 0.26 rg\n";
    content += `BT /F1 10 Tf 40 803 Td (${clean(BUSINESS.name)} | Income report) Tj ET\n`;
    chunk.forEach((line, j) => { content += `BT /F1 9 Tf 40 ${775 - j * 15} Td (${clean(line)}) Tj ET\n`; });
    content += `BT /F1 9 Tf 40 35 Td (Page ${i + 1} of ${chunks.length} | Amounts in INR) Tj ET\n`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${stream} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  });
  objects[1] = `<< /Type /Pages /Kids [${refs.map(r => `${r} 0 R`).join(" ")}] /Count ${refs.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
export function downloadAnalyticsPdf(data: AdminAnalyticsData) {
  const url = URL.createObjectURL(new Blob([createAnalyticsPdf(data) as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a"); a.href = url; a.download = `BOSS-PrintGo-Income-${data.start}-to-${data.end}.pdf`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
