import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { SensorIntegration } from "@/components/sensors/SensorIntegration";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-extrabold">404</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">요청하신 페이지를 찾을 수 없습니다.</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold">화면을 표시하지 못했습니다</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          잠시 후 다시 시도하거나 홈으로 이동하세요.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold"
          >
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      { title: "침수퇴로 AI" },
      {
        name: "description",
        content:
          "집중호우·하천범람·지하차도 침수 위험에서 가장 안전한 대피 경로를 추천하는 재난 대응 AI",
      },
      { name: "theme-color", content: "#2563EB" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();
  const isOps = pathname.startsWith("/ops");
  const citizenBottomNavSpace = "calc(64px + env(safe-area-inset-bottom))";

  return (
    <QueryClientProvider client={queryClient}>
      <SensorIntegration />
      <div
        className="mx-auto bg-[var(--bg)] min-h-screen flex flex-col"
        style={{
          boxSizing: "border-box",
          height: isOps ? undefined : "100dvh",
          maxWidth: isOps ? "none" : 480,
          overflow: isOps ? undefined : "hidden",
          paddingBottom: citizenBottomNavSpace,
        }}
      >
        <AppHeader context={isOps ? "field" : "citizen"} />
        <main
          className="flex-1 flex flex-col"
          style={{ minHeight: 0, overflowY: isOps ? undefined : "auto" }}
        >
          <Outlet />
        </main>
        <BottomTabs />
      </div>
    </QueryClientProvider>
  );
}
