import {
  Component,
  Suspense,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";

import { cn } from "../lib/utils";

type DearMePageShellProps = {
  children: ReactNode;
  className?: string;
};

export function DearMePageShell({ children, className }: DearMePageShellProps) {
  return (
    <div className={cn("space-y-6", className)} data-dearme-surface="page-shell">
      {children}
    </div>
  );
}

type DearMeHeroProps = {
  eyebrow: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function DearMeHero({
  eyebrow,
  title,
  description,
  actions,
  className,
}: DearMeHeroProps) {
  return (
    <header
      className={cn("rounded-lg border border-border bg-muted/20 p-5", className)}
      data-dearme-surface="hero"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            {eyebrow}
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type DearMePanelProps = ComponentPropsWithoutRef<"section"> & {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function DearMePanel({
  children,
  className,
  "aria-label": ariaLabel,
  ...sectionProps
}: DearMePanelProps) {
  return (
    <section
      {...sectionProps}
      className={cn("rounded-lg border border-border p-5", className)}
      aria-label={ariaLabel}
      data-dearme-surface="panel"
    >
      {children}
    </section>
  );
}

type DearMeIcon = ComponentType<{ className?: string }>;

type DearMeWorkbenchSectionHeaderProps = {
  icon: DearMeIcon;
  eyebrow: string;
  title?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function DearMeWorkbenchSectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  trailing,
  className,
}: DearMeWorkbenchSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      data-dearme-surface="workbench-section-header"
    >
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4" />
          {eyebrow}
        </div>
        {title ? <h2 className="mt-2 text-xl font-semibold">{title}</h2> : null}
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

type DearMeCockpitGridProps = {
  children: ReactNode;
  className?: string;
  variant?: "balanced" | "primary";
};

export function DearMeCockpitGrid({
  children,
  className,
  variant = "balanced",
}: DearMeCockpitGridProps) {
  return (
    <div
      className={cn(
        variant === "primary"
          ? "grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]"
          : "grid gap-4 xl:grid-cols-2",
        className,
      )}
      data-dearme-surface="cockpit-grid"
    >
      {children}
    </div>
  );
}

type DearMeMetricStripProps = {
  children: ReactNode;
  className?: string;
};

export function DearMeMetricStrip({ children, className }: DearMeMetricStripProps) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
      data-dearme-surface="metric-strip"
    >
      {children}
    </div>
  );
}

type DearMeFocusSurfaceProps = {
  children: ReactNode;
  className?: string;
  tone?: "active" | "empty";
  "aria-label"?: string;
};

export function DearMeFocusSurface({
  children,
  className,
  tone = "active",
  "aria-label": ariaLabel,
}: DearMeFocusSurfaceProps) {
  return (
    <section
      className={cn(
        tone === "empty"
          ? "rounded-lg border border-dashed border-border p-5"
          : "rounded-lg border border-primary/30 bg-primary/5 p-5",
        className,
      )}
      aria-label={ariaLabel}
      data-dearme-surface="focus-surface"
    >
      {children}
    </section>
  );
}

type DearMeEvidenceGridProps = {
  children: ReactNode;
  className?: string;
  columns?: "two" | "three";
};

export function DearMeEvidenceGrid({
  children,
  className,
  columns = "three",
}: DearMeEvidenceGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === "two" ? "md:grid-cols-2" : "md:grid-cols-3",
        className,
      )}
      data-dearme-surface="evidence-grid"
    >
      {children}
    </div>
  );
}

type DearMeWorkbenchCardProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  surface?: "workbench-card" | "action-card";
  tone?: "default" | "empty";
  focused?: boolean;
  "aria-current"?: "true";
  "aria-label"?: string;
};

export function DearMeWorkbenchCard({
  title,
  description,
  eyebrow,
  badge,
  footer,
  action,
  children,
  className,
  surface = "workbench-card",
  tone = "default",
  focused = false,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
}: DearMeWorkbenchCardProps) {
  return (
    <article
      className={cn(
        "rounded-md border px-3 py-3",
        tone === "empty" ? "border-dashed border-border" : "border-border",
        focused ? "border-primary/50 bg-primary/5 ring-2 ring-primary/70 ring-offset-2 ring-offset-background" : undefined,
        className,
      )}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      data-dearme-card-focused={focused ? "true" : undefined}
      data-dearme-surface={surface}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
          <p className={cn("text-sm font-medium", eyebrow ? "mt-1" : undefined)}>{title}</p>
          {description ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
      {footer || action ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : <span />}
          {action ? <div className="flex shrink-0 justify-end">{action}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

type DearMeEmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: DearMeIcon;
  actions?: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
  className?: string;
  "aria-label"?: string;
};

export function DearMeEmptyState({
  title,
  description,
  icon: Icon,
  actions,
  children,
  align = "start",
  className,
  "aria-label": ariaLabel,
}: DearMeEmptyStateProps) {
  return (
    <div
      className={cn("rounded-md border border-dashed border-border px-4 py-5", className)}
      aria-label={ariaLabel}
      data-dearme-surface="empty-state"
    >
      <div
        className={cn(
          align === "center"
            ? "flex h-full min-h-[320px] flex-col items-center justify-center text-center"
            : "flex items-start gap-3",
        )}
      >
        {Icon ? (
          <div
            className={cn(
              "rounded-md border border-border bg-muted/30 p-2",
              align === "start" ? "mt-0.5" : undefined,
            )}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : null}
        <div className={cn("min-w-0", align === "center" ? "mt-3 max-w-sm" : undefined)}>
          <p className="text-sm font-medium">{title}</p>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

type DearMeChecklistProps = {
  items: ReactNode[];
  icon?: DearMeIcon;
  className?: string;
  itemClassName?: string;
  "aria-label"?: string;
};

export function DearMeChecklist({
  items,
  icon: Icon,
  className,
  itemClassName,
  "aria-label": ariaLabel,
}: DearMeChecklistProps) {
  return (
    <div
      className={cn("grid gap-2", className)}
      aria-label={ariaLabel}
      data-dearme-surface="checklist"
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm",
            itemClassName,
          )}
          data-dearme-surface="checklist-item"
        >
          {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

type DearMeSectionBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type DearMeErrorBoundaryState = {
  hasError: boolean;
};

class DearMeErrorBoundary extends Component<
  Omit<DearMeSectionBoundaryProps, "loading">,
  DearMeErrorBoundaryState
> {
  override state: DearMeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DearMeErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DearMeSectionFallback />;
    }
    return this.props.children;
  }
}

export function DearMeSectionBoundary({
  children,
  fallback,
  loading,
  onError,
}: DearMeSectionBoundaryProps) {
  return (
    <Suspense fallback={loading ?? <DearMeSectionLoading />}>
      <DearMeErrorBoundary fallback={fallback} onError={onError}>
        {children}
      </DearMeErrorBoundary>
    </Suspense>
  );
}

function DearMeSectionLoading() {
  return (
    <div className="min-h-24 animate-pulse rounded-lg border border-border bg-muted/30" />
  );
}

function DearMeSectionFallback() {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      DearMe could not load this section. Try refreshing the page.
    </div>
  );
}
