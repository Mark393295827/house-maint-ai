import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "C:/Users/高杰/Desktop/House Maint AI 设计和商业计划/House Maint AI (系统性商业化）/House Maint AI 建构）/工程问题解决模型3.0_完整工作手册新版.xlsx";

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 20000,
  tableMaxRows: 10,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});

console.log("=== WORKBOOK SUMMARY ===");
console.log(summary.ndjson);

const sheetList = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 12000,
});

console.log("=== SHEETS ===");
console.log(sheetList.ndjson);

const searchTerms = [
  "流程",
  "步骤",
  "问题",
  "定义",
  "原因",
  "方案",
  "成本",
  "造价",
  "执行",
  "验证",
  "复盘",
  "SOP",
  "闭环",
];

for (const term of searchTerms) {
  const matches = await workbook.inspect({
    kind: "match",
    searchTerm: term,
    maxChars: 12000,
    options: { maxResults: 40 },
  });
  console.log(`=== MATCH ${term} ===`);
  console.log(matches.ndjson);
}
