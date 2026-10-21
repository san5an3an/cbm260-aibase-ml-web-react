import { redirect } from "next/navigation";
import { loginPath } from "@/config/navigation";

// Page 이동만 하므로 즉시 이동 검증에서 제외
export const instant = false;

// 첫 경로 접근 시 Login Page로 이동
export default function RootPage() {
  redirect(loginPath);
}
