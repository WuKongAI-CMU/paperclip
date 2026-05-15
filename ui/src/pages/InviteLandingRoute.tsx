import { CompanyProvider } from "@/context/CompanyContext";
import { InviteLandingPage } from "./InviteLanding";

export function InviteLandingRoute() {
  return (
    <CompanyProvider>
      <InviteLandingPage />
    </CompanyProvider>
  );
}
