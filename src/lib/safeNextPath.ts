// 다른 사이트로 이동시킬 수 있는 경로 형식, 두 번째 문자가 슬래시나 역슬래시이거나 역슬래시, 공백, 제어 문자가 든 경로
const UNSAFE_PATH = /^\/[/\\]|[\\\s\u0000-\u001f\u007f]/;

// Login 후 돌아갈 경로가 같은 사이트의 경로일 때만 그대로 사용하고 아니면 대체 경로 반환
export function safeNextPath(next: string | null, origin: string, fallback: string): string {
  if (next === null || !next.startsWith("/") || UNSAFE_PATH.test(next)) return fallback;
  try {
    return new URL(next, origin).origin === origin ? next : fallback;
  } catch {
    return fallback;
  }
}
