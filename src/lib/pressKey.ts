// Click할 수 있는 Row를 Keyboard로 누르는 키(Enter, Space)인지 판정
export function isPressKey(event: { key: string }): boolean {
  return event.key === "Enter" || event.key === " ";
}
