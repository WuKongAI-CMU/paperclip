import type { Issue } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { formatMonitorOffset } from "@/lib/issue-monitor";
import { formatDateTime } from "@/lib/utils";

function resolveScheduledMonitor(issue: Issue) {
  const nextCheckAt =
    issue.monitorNextCheckAt?.toISOString() ??
    issue.executionPolicy?.monitor?.nextCheckAt ??
    issue.executionState?.monitor?.nextCheckAt ??
    null;
  if (!nextCheckAt) return null;

  return {
    nextCheckAt,
    notes: issue.executionPolicy?.monitor?.notes ?? issue.monitorNotes ?? issue.executionState?.monitor?.notes ?? null,
    attemptCount: issue.monitorAttemptCount ?? issue.executionState?.monitor?.attemptCount ?? 0,
    serviceName: issue.executionPolicy?.monitor?.serviceName ?? issue.executionState?.monitor?.serviceName ?? null,
  };
}

interface IssueMonitorActivityCardProps {
  issue: Issue;
  onCheckNow?: (() => void) | null;
  checkingNow?: boolean;
  hideSubstrateDetails?: boolean;
}

export function IssueMonitorActivityCard({
  issue,
  onCheckNow = null,
  checkingNow = false,
  hideSubstrateDetails = false,
}: IssueMonitorActivityCardProps) {
  const monitor = resolveScheduledMonitor(issue);
  if (!monitor) return null;

  const title = hideSubstrateDetails ? "Follow-up scheduled" : "Monitor scheduled";
  const timingLabel = hideSubstrateDetails ? "Next review" : "Next check";
  const safeNotes = hideSubstrateDetails ? "DearMe will review this again automatically." : monitor.notes;
  const actionLabel = hideSubstrateDetails
    ? (checkingNow ? "Refreshing..." : "Refresh now")
    : (checkingNow ? "Checking..." : "Check now");

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">
            {timingLabel} {formatDateTime(monitor.nextCheckAt)} ({formatMonitorOffset(monitor.nextCheckAt)})
          </div>
          {safeNotes ? (
            <div className="mt-1 text-xs text-muted-foreground">{safeNotes}</div>
          ) : null}
          {!hideSubstrateDetails && monitor.serviceName ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {monitor.serviceName}
            </div>
          ) : null}
          {!hideSubstrateDetails && monitor.attemptCount > 0 ? (
            <div className="mt-1 text-xs text-muted-foreground">Attempt {monitor.attemptCount}</div>
          ) : null}
        </div>
        {onCheckNow ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 shadow-none"
            onClick={onCheckNow}
            disabled={checkingNow}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
