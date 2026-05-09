import type { ComponentProps, ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

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

export type DearMeActionCardProps = {
  title: ReactNode;
  summary?: ReactNode;
  eyebrow?: ReactNode;
  statusBadges?: DearMeActionCardBadge[];
  chips?: DearMeActionCardChip[];
  calloutLabel?: ReactNode;
  callout?: ReactNode;
  footer?: ReactNode;
  action?: DearMeActionCardAction | null;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function DearMeActionCard({
  title,
  summary,
  eyebrow,
  statusBadges = [],
  chips = [],
  calloutLabel,
  callout,
  footer,
  action,
  children,
  className,
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
      {callout ? (
        <div
          className={cn(
            "rounded-md border border-border bg-background/80 p-3",
            chips.length > 0 ? "mt-3" : undefined,
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
