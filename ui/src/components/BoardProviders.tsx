import type { ReactNode } from "react";
import { BreadcrumbProvider } from "../context/BreadcrumbContext";
import { CompanyProvider } from "../context/CompanyContext";
import { DialogProvider } from "../context/DialogContext";
import { EditorAutocompleteProvider } from "../context/EditorAutocompleteContext";
import { LiveUpdatesProvider } from "../context/LiveUpdatesProvider";
import { PanelProvider } from "../context/PanelContext";
import { SidebarProvider } from "../context/SidebarContext";
import { PluginLauncherProvider } from "../plugins/launchers";
import { OnboardingWizard } from "./OnboardingWizard";
import { TooltipProvider } from "./ui/tooltip";

export function BoardProviders({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <EditorAutocompleteProvider>
        <LiveUpdatesProvider>
          <BreadcrumbProvider>
            <SidebarProvider>
              <PanelProvider>
                <PluginLauncherProvider>
                  <DialogProvider>
                    <TooltipProvider>
                      {children}
                      <OnboardingWizard />
                    </TooltipProvider>
                  </DialogProvider>
                </PluginLauncherProvider>
              </PanelProvider>
            </SidebarProvider>
          </BreadcrumbProvider>
        </LiveUpdatesProvider>
      </EditorAutocompleteProvider>
    </CompanyProvider>
  );
}
