import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  Database,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { DearMeGdprExport } from "../api/dearme";
import { dearmeApi } from "../api/dearme";
import {
  DearMeCockpitGrid,
  DearMeHero,
  DearMeMetricStrip,
  DearMePageShell,
  DearMePanel,
  DearMeWorkbenchCard,
  DearMeWorkbenchSectionHeader,
} from "../components/DearMeShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";

const DELETE_CONFIRMATION = "DELETE DEARME";
const GRACE_DAYS = 7;

function countRows(exportData: DearMeGdprExport | undefined) {
  if (!exportData) {
    return {
      users: 0,
      voice: 0,
      receipts: 0,
      opportunities: 0,
      connections: 0,
      audit: 0,
      total: 0,
    };
  }

  const users = exportData.users.length;
  const voice = exportData.voiceProfiles.length + exportData.voiceSamples.length;
  const receipts = exportData.paidBetaReceipts.length;
  const opportunities = exportData.opportunities.length;
  const connections = exportData.channelConnections.length;
  const audit = exportData.auditLog.length;
  return {
    users,
    voice,
    receipts,
    opportunities,
    connections,
    audit,
    total: users + voice + receipts + opportunities + connections + audit + (exportData.company ? 1 : 0),
  };
}

function formatGraceDate(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + GRACE_DAYS);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DearMeDangerSettings() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState("");
  const [acknowledgedGrace, setAcknowledgedGrace] = useState(false);
  const companyId = selectedCompanyId ?? "";
  const graceDate = useMemo(() => formatGraceDate(), []);

  useEffect(() => {
    setBreadcrumbs([{ label: "DearMe" }, { label: "Danger Zone" }]);
  }, [setBreadcrumbs]);

  const exportQuery = useQuery({
    queryKey: queryKeys.dearme.gdprExport(companyId || "__none__"),
    queryFn: () => dearmeApi.exportGdprData(companyId),
    enabled: companyId.length > 0,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => dearmeApi.deleteGdprData(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.gdprExport(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
    },
  });

  const counts = countRows(exportQuery.data);
  const canDelete = Boolean(companyId)
    && acknowledgedGrace
    && confirmation.trim() === DELETE_CONFIRMATION
    && !deleteMutation.isPending;

  return (
    <DearMePageShell className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <DearMeHero
        eyebrow="Settings"
        title="Danger Zone"
        description="Review the private data tied to this DearMe profile, then request deletion only when you are ready to start the seven-day account grace window."
      />

      <DearMeMetricStrip>
        {[
          { label: "Grace period", value: `${GRACE_DAYS} days` },
          { label: "Rows in scope", value: String(counts.total) },
          { label: "Delete status", value: deleteMutation.isSuccess ? "Requested" : "Not requested" },
        ].map((metric) => (
          <DearMeWorkbenchCard
            key={metric.label}
            eyebrow={metric.label}
            title={<span className="text-2xl font-semibold">{metric.value}</span>}
          />
        ))}
      </DearMeMetricStrip>

      <DearMeCockpitGrid>
        <DearMePanel className="space-y-5">
          <DearMeWorkbenchSectionHeader
            icon={Database}
            eyebrow="Deletion scope"
            title="What DearMe will scrub"
            description="This preview comes from the existing privacy export service before the delete request runs."
          />

          {exportQuery.isLoading ? (
            <div className="flex min-h-28 items-center gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading deletion scope...
            </div>
          ) : exportQuery.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Deletion scope is unavailable right now. Refresh before requesting deletion.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Profile", value: exportQuery.data?.company ? 1 : 0 },
                { label: "People", value: counts.users },
                { label: "Voice memory", value: counts.voice },
                { label: "Receipts", value: counts.receipts },
                { label: "Opportunities", value: counts.opportunities },
                { label: "Connections", value: counts.connections },
                { label: "Audit rows", value: counts.audit },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-background p-4">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </DearMePanel>

        <DearMePanel className="space-y-5 border-destructive/30 bg-destructive/5">
          <DearMeWorkbenchSectionHeader
            icon={ShieldAlert}
            eyebrow="Delete profile"
            title={`Seven-day grace window ends ${graceDate}.`}
            description="The privacy service scrubs data when this request runs. The seven-day grace window is for account follow-up before DearMe treats the profile closure as final."
          />

          <div className="space-y-3 rounded-lg border border-destructive/30 bg-background p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-muted-foreground">
                The delete request scrubs profile details, voice memory, opportunities, channel connections, receipts, and audit details for{" "}
                <span className="font-medium text-foreground">{selectedCompany?.name ?? "this DearMe profile"}</span>.
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={acknowledgedGrace}
                onCheckedChange={(checked) => setAcknowledgedGrace(checked === true)}
                aria-label="Acknowledge seven-day deletion grace period"
              />
              <span>I understand this scrubs data now and starts a seven-day account grace window.</span>
            </label>
            <div className="space-y-2">
              <label htmlFor="dearme-delete-confirmation" className="text-sm font-medium">
                Type {DELETE_CONFIRMATION} to request deletion
              </label>
              <Input
                id="dearme-delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={!canDelete}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Request deletion
            </Button>
          </div>

          {deleteMutation.isSuccess ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CalendarClock className="h-4 w-4" />
                Delete request recorded
              </div>
              <p className="mt-2 text-muted-foreground">
                The privacy service scrubbed {deleteMutation.data.rowsAffected.auditLog} audit rows and marked this profile for deletion.
              </p>
            </div>
          ) : null}

          {deleteMutation.error ? (
            <div className="rounded-lg border border-destructive/30 bg-background p-4 text-sm text-destructive">
              Delete request failed. Refresh the page and try again before starting the account grace window.
            </div>
          ) : null}
        </DearMePanel>
      </DearMeCockpitGrid>
    </DearMePageShell>
  );
}
