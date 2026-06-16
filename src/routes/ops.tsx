import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { FieldCctv } from "@/components/field/FieldCctv";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "전국 CCTV — 침수퇴로 AI" },
      {
        name: "description",
        content: "화면 진입과 동시에 전국 CCTV 위치를 확인하는 공개 현장정보입니다.",
      },
    ],
  }),
  component: OpsRouteShell,
});

export const shouldRenderOpsCctvFallback = (pathname: string) => pathname === "/ops";

function OpsRouteShell() {
  const { pathname } = useLocation();

  if (shouldRenderOpsCctvFallback(pathname)) return <FieldCctv />;

  return <Outlet />;
}
