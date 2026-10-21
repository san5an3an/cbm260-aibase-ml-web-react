import { expect, test } from "@playwright/test";
import { alarmToastTexts } from "../src/components/organisms/alarmToastTexts";
import { commonToastTexts } from "../src/components/organisms/commonToastTexts";
import { measureToastTexts } from "../src/components/organisms/measureToastTexts";
import { trainingToastTexts } from "../src/components/organisms/trainingToastTexts";
import { datedFileName, downloadFileName } from "../src/lib/downloadFile";
import { buildCsvFile, buildCsvText } from "../src/services/mock/csvFile";

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

test("CSV Text는 맨 앞에 BOM, 쉼표로 Cell을 잇고 Row마다 CRLF, 쉼표, 큰따옴표, 줄바꿈이 든 Cell만 큰따옴표로 감싸고 안의 큰따옴표는 두 번 씀", () => {
  const text = buildCsvText(
    ["이름", "값"],
    [
      ["a,b", 'say "hi"'],
      ["두\n줄", "그대로 · 둠"],
      ["", "끝\r"],
    ],
  );
  expect(text).toBe(
    `${BYTE_ORDER_MARK}이름,값\r\n"a,b","say ""hi"""\r\n"두\n줄",그대로 · 둠\r\n,"끝\r"\r\n`,
  );
  expect(buildCsvText(["이름"], [])).toBe(`${BYTE_ORDER_MARK}이름\r\n`);
});

test("CSV 파일 내용은 UTF-8 바이트로 맨 앞이 EF BB BF이고 파일 종류는 text/csv임", async () => {
  const file = buildCsvFile(["장치"], [["ATC"]]);
  expect(file.type).toBe("text/csv;charset=utf-8");
  expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([
    0xef, 0xbb, 0xbf, ...Buffer.from("장치\r\nATC\r\n", "utf8"),
  ]);
});

test("파일 이름은 영문 이름에 내려받은 때(YYYYMMDD-HHmmss)를 붙이고, Server가 이름을 붙인 File이면 그 이름을 씀", () => {
  expect(datedFileName("measures-worklist", "csv", new Date(2026, 8, 3, 7, 5, 9))).toBe(
    "measures-worklist-20260903-070509.csv",
  );
  expect(datedFileName("training-results", "csv", new Date(2026, 11, 31, 23, 59, 59))).toBe(
    "training-results-20261231-235959.csv",
  );
  expect(downloadFileName(new Blob(["x"]), "measures-worklist-20260903-070509.csv")).toBe(
    "measures-worklist-20260903-070509.csv",
  );
  expect(downloadFileName(new File(["x"], "server-named.csv"), "fallback.csv")).toBe(
    "server-named.csv",
  );
  expect(downloadFileName(new File(["x"], ""), "fallback.csv")).toBe("fallback.csv");
});

test("CSV 내보내기(조치 관리, 재학습 설정)와 담당자 지정(알람/이벤트, 조치 관리)의 같은 문구는 화면마다의 문구 파일이 공용 문구 한 곳을 읽음", () => {
  expect(commonToastTexts.exported).toBe("CSV 파일을 내려받았습니다.");
  expect(commonToastTexts.exportFailed).toBe("CSV 파일을 내려받지 못했습니다.");
  expect(commonToastTexts.assigned(2)).toBe("2건에 담당자를 지정했습니다.");
  expect(commonToastTexts.assignFailed).toBe("담당자를 지정하지 못했습니다.");
  for (const screenTexts of [measureToastTexts, trainingToastTexts]) {
    expect(screenTexts.exported).toBe(commonToastTexts.exported);
    expect(screenTexts.exportFailed).toBe(commonToastTexts.exportFailed);
  }
  for (const screenTexts of [alarmToastTexts, measureToastTexts]) {
    expect(screenTexts.assigned).toBe(commonToastTexts.assigned);
    expect(screenTexts.assignFailed).toBe(commonToastTexts.assignFailed);
  }
});
