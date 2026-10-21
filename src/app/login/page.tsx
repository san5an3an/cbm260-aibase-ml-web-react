import type { Metadata } from "next";
import { LoginPage } from "@/components/pages/login/LoginPage";
import { systemConfig } from "@/config/system";

export const metadata: Metadata = {
  title: `로그인 · ${systemConfig.name}`,
};

// 공통 Layout 밖에 배치되는 Login Page
export default function Page() {
  return <LoginPage />;
}
