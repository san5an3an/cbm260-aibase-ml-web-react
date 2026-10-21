import { formatLocalIsoDateTime } from "@/lib/formatTime";

// 내려받기를 시작한 뒤 파일 URL을 해제하기까지 기다리는 밀리초, Browser가 내용을 읽는 도중에 해제하지 않도록 넉넉히 설정
const REVOKE_DELAY_MS = 40_000;

// "이름-YYYYMMDD-HHmmss.확장자" 형식의 파일 이름 반환, 시각은 사용자 컴퓨터의 시각
export function datedFileName(baseName: string, extension: string, at: Date): string {
  const stamp = formatLocalIsoDateTime(at).replace(/[-:]/g, "").replace("T", "-");
  return `${baseName}-${stamp}.${extension}`;
}

// 저장할 파일 이름 반환, 이름이 있는 File이면 그 이름, 아니면 전달받은 이름
export function downloadFileName(content: Blob, fallbackName: string): string {
  return content instanceof File && content.name !== "" ? content.name : fallbackName;
}

// 파일 내용을 Browser의 내려받기로 저장, 숨은 Link를 잠시 붙여 Click하고 시간이 지나면 파일 URL 해제
export function saveFile(content: Blob, fallbackName: string): void {
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadFileName(content, fallbackName);
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
