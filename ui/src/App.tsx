import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { Route, Routes } from "react-router-dom";
import { CloudAccessGate } from "./components/CloudAccessGate";

function lazyNamed<T extends Record<K, ComponentType<any>>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K
) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

function RouteFallback() {
  return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading...</div>;
}

const BoardProviders = lazyNamed(() => import("./components/BoardProviders"), "BoardProviders");
const BoardAppRoutes = lazyNamed(() => import("./BoardAppRoutes"), "BoardAppRoutes");
const DearMeAbout = lazyNamed(() => import("./pages/DearMeAbout"), "DearMeAbout");
const DearMeFaq = lazyNamed(() => import("./pages/DearMeFaq"), "DearMeFaq");
const DearMeLanding = lazyNamed(() => import("./pages/DearMeLanding"), "DearMeLanding");
const DearMePricing = lazyNamed(() => import("./pages/DearMePricing"), "DearMePricing");
const DearMeProof = lazyNamed(() => import("./pages/DearMeProof"), "DearMeProof");
const Terms = lazyNamed(() => import("./pages/legal/Terms"), "Terms");
const Privacy = lazyNamed(() => import("./pages/legal/Privacy"), "Privacy");
const AcceptableUse = lazyNamed(() => import("./pages/legal/AcceptableUse"), "AcceptableUse");
const IssueChatLongThreadPerf = lazyNamed(() => import("./pages/IssueChatLongThreadPerf"), "IssueChatLongThreadPerf");
const AuthPage = lazyNamed(() => import("./pages/Auth"), "AuthPage");
const BoardClaimPage = lazyNamed(() => import("./pages/BoardClaim"), "BoardClaimPage");
const CliAuthPage = lazyNamed(() => import("./pages/CliAuth"), "CliAuthPage");
const InviteLandingRoute = lazyNamed(() => import("./pages/InviteLandingRoute"), "InviteLandingRoute");
const DearMeErrorPage = lazyNamed(() => import("./pages/DearMeErrorPages"), "DearMeErrorPage");

function BoardRouteProviders() {
  return (
    <BoardProviders>
      <BoardAppRoutes />
    </BoardProviders>
  );
}

export function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="auth" element={<AuthPage />} />
          <Route path="board-claim/:token" element={<BoardClaimPage />} />
          <Route path="cli-auth/:id" element={<CliAuthPage />} />
          <Route path="invite/:token" element={<InviteLandingRoute />} />
          <Route path="landing" element={<DearMeLanding />} />
          <Route path="about" element={<DearMeAbout />} />
          <Route path="faq" element={<DearMeFaq />} />
          <Route path="pricing" element={<DearMePricing />} />
          <Route path="proof" element={<DearMeProof />} />
          <Route path="404" element={<DearMeErrorPage kind="404" />} />
          <Route path="500" element={<DearMeErrorPage kind="500" />} />
          <Route path="legal/terms" element={<Terms />} />
          <Route path="legal/privacy" element={<Privacy />} />
          <Route path="legal/acceptable-use" element={<AcceptableUse />} />
          <Route path="tests/perf/long-thread" element={<IssueChatLongThreadPerf />} />

          <Route element={<CloudAccessGate publicRootElement={<DearMeLanding />} />}>
            <Route path="*" element={<BoardRouteProviders />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
