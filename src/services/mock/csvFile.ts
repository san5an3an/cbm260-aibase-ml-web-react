// 문자열 맨 앞에 붙여 엑셀이 UTF-8로 읽게 하는 표시(BOM)
const BYTE_ORDER_MARK = "\uFEFF";
// Row를 끝내는 문자
const LINE_END = "\r\n";
// 큰따옴표로 감싸야 하는 Cell, 쉼표, 큰따옴표, 줄바꿈이 든 Cell
const NEEDS_QUOTES = /[",\r\n]/;
const CSV_MIME_TYPE = "text/csv;charset=utf-8";

// Cell 하나를 CSV 문자열로 변환, 감싸야 하는 Cell은 큰따옴표로 감싸고 안의 큰따옴표는 두 번 적음
function toCsvCell(value: string): string {
  return NEEDS_QUOTES.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// 헤더 Row와 데이터 Row를 BOM이 붙은 CSV 문자열로 변환, Cell은 쉼표로 잇고 Row마다 CRLF로 끝냄
export function buildCsvText(
  header: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const lines = [header, ...rows].map((cells) => cells.map(toCsvCell).join(",") + LINE_END);
  return BYTE_ORDER_MARK + lines.join("");
}

// 헤더 Row와 데이터 Row로 만든 CSV 파일 내용 반환
export function buildCsvFile(header: readonly string[], rows: readonly (readonly string[])[]): Blob {
  return new Blob([buildCsvText(header, rows)], { type: CSV_MIME_TYPE });
}
