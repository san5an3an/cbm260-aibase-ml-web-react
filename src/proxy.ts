import { NextResponse, type NextRequest } from "next/server";
import { loginPath, loginScreenPath, pathAfterLogin } from "@/config/navigation";
import { readLoginAccount } from "@/lib/loginAccount";

// 화면을 그대로 통과시킬 때 Browser가 문서를 보관하지 않도록 지정, 뒤로가기가 보관된 문서를 꺼내 이 분기를 건너뛰지 않게 함
function passThrough(): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// 화면이 그려지기 전에 Login 상태 표시(Cookie)로 분기, Login했으면 Login 화면과 첫 경로를 건너뛰고 안 했으면 Login 화면으로 이동
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams, origin } = request.nextUrl;
  const isLoggedIn = readLoginAccount(request.headers.get("cookie") ?? "") !== null;
  const isEntry = pathname === "/" || pathname === loginPath;
  if (isLoggedIn) {
    if (!isEntry) return passThrough();
    return NextResponse.redirect(new URL(pathAfterLogin(searchParams.get("next"), origin), origin));
  }
  if (pathname === loginPath) return passThrough();
  const target = pathname === "/" ? loginPath : loginScreenPath(`${pathname}${search}`);
  return NextResponse.redirect(new URL(target, origin));
}

// Next 내부 파일(_next)과 public의 이미지처럼 점이 든 파일 경로는 제외, 화면 경로 뒤에 Next가 붙이는 .rsc와 .segments는 Next가 matcher에 추가해 처리
export const config = {
  matcher: ["/((?!_next/)[^.]*)"],
};
