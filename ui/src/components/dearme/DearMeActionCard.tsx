import type { ComponentProps, ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  PauseCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DearMeWorkbenchCard } from "../DearMeShell";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];
type ButtonVariant = ComponentProps<typeof Button>["variant"];

export type DearMeActionCardBadge = {
  label: ReactNode;
  variant?: BadgeVariant;
};

export type DearMeActionCardChip = {
  label: ReactNode;
  variant?: BadgeVariant;
};

export type DearMeActionCardAction = {
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
  icon?: LucideIcon | null;
  onClick: () => void;
  variant?: ButtonVariant;
};

export type DearMeActionCardAttentionKind =
  | "decision_needed"
  | "paused"
  | "retry"
  | "blocked";

export type DearMeActionCardAttention = {
  kind: DearMeActionCardAttentionKind;
  label: ReactNode;
  detail?: ReactNode;
};

export type DearMeActionCardProps = {
  title: ReactNode;
  summary?: ReactNode;
  eyebrow?: ReactNode;
  statusBadges?: DearMeActionCardBadge[];
  chips?: DearMeActionCardChip[];
  attention?: DearMeActionCardAttention | null;
  calloutLabel?: ReactNode;
  callout?: ReactNode;
  footer?: ReactNode;
  action?: DearMeActionCardAction | null;
  children?: ReactNode;
  className?: string;
  focused?: boolean;
  "aria-label"?: string;
};

export function DearMeActionCard({
  title,
  summary,
  eyebrow,
  statusBadges = [],
  chips = [],
  attention,
  calloutLabel,
  callout,
  footer,
  action,
  children,
  className,
  focused = false,
  "aria-label": ariaLabel,
}: DearMeActionCardProps) {
  const ActionIcon = action?.icon === null ? null : action?.icon ?? ArrowRight;
  const statusBadgeNode =
    statusBadges.length > 0 ? <DearMeActionCardBadges badges={statusBadges} /> : null;

  return (
    <DearMeWorkbenchCard
      title={title}
      description={summary}
      eyebrow={eyebrow}
      badge={statusBadgeNode}
      footer={footer}
      action={
        action ? (
          <Button
            type="button"
            size="sm"
            variant={action.variant ?? "outline"}
            aria-label={action.ariaLabel ?? action.label}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
            {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
          </Button>
        ) : null
      }
      className={className}
      focused={focused}
      aria-current={focused ? "true" : undefined}
      surface="action-card"
      aria-label={ariaLabel}
    >
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {chips.map((chip, index) => (
            <Badge key={index} variant={chip.variant ?? "outline"}>
              {chip.label}
            </Badge>
          ))}
        </div>
      ) : null}
      {attention ? (
        <DearMeActionCardAttentionNotice
          attention={attention}
          className={chips.length > 0 ? "mt-3" : undefined}
        />
      ) : null}
      {callout ? (
        <div
          className={cn(
            "rounded-md border border-border bg-background/80 p-3",
            chips.length > 0 || attention ? "mt-3" : undefined,
          )}
        >
          {calloutLabel ? (
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {calloutLabel}
            </p>
          ) : null}
          <div
            className={cn("text-sm text-foreground/85", calloutLabel ? "mt-1" : undefined)}
          >
            {callout}
          </div>
        </div>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </DearMeWorkbenchCard>
  );
}

const DEARME_ACTION_CARD_ATTENTION_STYLES: Record<
  DearMeActionCardAttentionKind,
  {
    Icon: LucideIcon;
    className: string;
    iconClassName: string;
  }
> = {
  decision_needed: {
    Icon: AlertCircle,
    className: "border-primary/30 bg-primary/5",
    iconClassName: "text-primary",
  },
  paused: {
    Icon: PauseCircle,
    className: "border-amber-500/30 bg-amber-500/10",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  retry: {
    Icon: RefreshCw,
    className: "border-sky-500/30 bg-sky-500/10",
    iconClassName: "text-sky-600 dark:text-sky-400",
  },
  blocked: {
    Icon: AlertTriangle,
    className: "border-destructive/30 bg-destructive/10",
    iconClassName: "text-destructive",
  },
};

function DearMeActionCardAttentionNotice({
  attention,
  className,
}: {
  attention: DearMeActionCardAttention;
  className?: string;
}) {
  const style = DEARME_ACTION_CARD_ATTENTION_STYLES[attention.kind];
  const Icon = style.Icon;

  return (
    <div
      className={cn("flex items-start gap-2 rounded-md border p-3", style.className, className)}
      data-dearme-action-attention={attention.kind}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconClassName)} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{attention.label}</p>
        {attention.detail ? (
          <div className="mt-1 text-sm text-muted-foreground">{attention.detail}</div>
        ) : null}
      </div>
    </div>
  );
}

function DearMeActionCardBadges({ badges }: { badges: DearMeActionCardBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      {badges.map((badge, index) => (
        <Badge key={index} variant={badge.variant ?? "outline"}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
