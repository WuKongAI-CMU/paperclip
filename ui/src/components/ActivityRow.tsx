import { Link } from "@/lib/router";
import { Identity } from "./Identity";
import { IssueReferenceActivitySummary } from "./IssueReferenceActivitySummary";
import { timeAgo } from "../lib/timeAgo";
import { cn } from "../lib/utils";
import { formatActivityVerb } from "../lib/activity-format";
import { deriveProjectUrlKey, type ActivityEvent, type Agent } from "@paperclipai/shared";
import type { CompanyUserProfile } from "../lib/company-members";
import { dearMeApprovalDecisionHref, isDearMeApprovalType } from "../lib/dearmeApprovals";

function detailString(details: Record<string, unknown> | null, key: string) {
  const value = details?.[key];
  return typeof value === "string" ? value : null;
}

function isDearMeApprovalActivity(event: ActivityEvent) {
  if (event.entityType !== "approval") return false;
  return (
    isDearMeApprovalType(detailString(event.details, "type")) ||
    event.action.startsWith("dearme.")
  );
}

function entityLink(event: ActivityEvent, name?: string | null): string | null {
  switch (event.entityType) {
    case "issue": return `/issues/${name ?? event.entityId}`;
    case "agent": return `/agents/${event.entityId}`;
    case "project": return `/projects/${deriveProjectUrlKey(name, event.entityId)}`;
    case "goal": return `/goals/${event.entityId}`;
    case "approval":
      return isDearMeApprovalActivity(event)
        ? dearMeApprovalDecisionHref(event.entityId)
        : `/approvals/${event.entityId}`;
    default: return null;
  }
}

interface ActivityRowProps {
  event: ActivityEvent;
  agentMap: Map<string, Agent>;
  userProfileMap?: Map<string, CompanyUserProfile>;
  entityNameMap: Map<string, string>;
  entityTitleMap?: Map<string, string>;
  className?: string;
}

export function ActivityRow({ event, agentMap, userProfileMap, entityNameMap, entityTitleMap, className }: ActivityRowProps) {
  const verb = formatActivityVerb(event.action, event.details, { agentMap, userProfileMap });

  const isHeartbeatEvent = event.entityType === "heartbeat_run";
  const heartbeatAgentId = isHeartbeatEvent
    ? (event.details as Record<string, unknown> | null)?.agentId as string | undefined
    : undefined;

  const name = isHeartbeatEvent
    ? (heartbeatAgentId ? entityNameMap.get(`agent:${heartbeatAgentId}`) : null)
    : entityNameMap.get(`${event.entityType}:${event.entityId}`);

  const entityTitle = entityTitleMap?.get(`${event.entityType}:${event.entityId}`);

  const link = isHeartbeatEvent && heartbeatAgentId
    ? `/agents/${heartbeatAgentId}/runs/${event.entityId}`
    : entityLink(event, name);

  const actor = event.actorType === "agent" ? agentMap.get(event.actorId) : null;
  const userProfile = event.actorType === "user" ? userProfileMap?.get(event.actorId) : null;
  const actorName = actor?.name ?? (event.actorType === "system" ? "System" : userProfile?.label ?? (event.actorType === "user" ? "Board" : event.actorId || "Unknown"));
  const actorAvatarUrl = userProfile?.image ?? null;

  const inner = (
    <div className="space-y-2">
      <div className="flex gap-3">
        <p className="flex-1 min-w-0 truncate">
          <Identity
            name={actorName}
            avatarUrl={actorAvatarUrl}
            size="xs"
            className="align-middle"
          />
          <span className="text-muted-foreground ml-1">{verb} </span>
          {name && <span className="font-medium">{name}</span>}
          {entityTitle && <span className="text-muted-foreground ml-1">— {entityTitle}</span>}
        </p>
        <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{timeAgo(event.createdAt)}</span>
      </div>
      <IssueReferenceActivitySummary event={event} />
    </div>
  );

  const classes = cn(
    "px-4 py-2 text-sm",
    link && "cursor-pointer hover:bg-accent/50 transition-colors",
    className,
  );

  if (link) {
    return (
      <Link to={link} className={cn(classes, "no-underline text-inherit block")}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={classes}>
      {inner}
    </div>
  );
}
