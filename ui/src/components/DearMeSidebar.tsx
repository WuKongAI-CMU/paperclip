import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  Home,
  Mic2,
  NotebookText,
  PenLine,
  Search,
  Sparkles,
  Telescope,
} from "lucide-react";
import { Link, useLocation } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";
import { cn } from "../lib/utils";

interface DearMeNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const primaryItems: DearMeNavItem[] = [
  { to: "/dearme", label: "Home", icon: Home },
  { to: "/dearme?view=decisions", label: "Decisions", icon: ClipboardCheck },
  { to: "/dearme?view=work-ready", label: "Work Ready", icon: Sparkles },
];

const growthItems: DearMeNavItem[] = [
  { to: "/dearme?view=voice", label: "Voice & Memory", icon: Mic2 },
  { to: "/dearme?view=brand-os", label: "Brand OS", icon: NotebookText },
  { to: "/dearme?view=content", label: "Content", icon: PenLine },
  { to: "/dearme?view=opportunities", label: "Opportunities", icon: Telescope },
  { to: "/dearme?view=portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { to: "/dearme?view=reports", label: "Reports", icon: BarChart3 },
];

function openSearch() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
}

function isItemActive(pathname: string, search: string, to: string): boolean {
  const [targetPath, targetQuery] = to.split("?");
  const normalizedPath = targetPath?.toLowerCase() ?? "";
  const pathMatches = pathname.toLowerCase().endsWith(normalizedPath);
  if (!pathMatches) return false;
  if (!targetQuery) return search === "";

  const currentParams = new URLSearchParams(search);
  const targetParams = new URLSearchParams(targetQuery);
  return [...targetParams.entries()].every(
    ([key, value]) => currentParams.get(key) === value,
  );
}

function DearMeNavLink({ item }: { item: DearMeNavItem }) {
  const location = useLocation();
  const Icon = item.icon;
  const active = isItemActive(location.pathname, location.search, item.to);

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-foreground/80 hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function DearMeNavSection({ label, items }: { label: string; items: DearMeNavItem[] }) {
  return (
    <section className="space-y-1">
      <div className="px-3 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <DearMeNavLink key={item.to} item={item} />
        ))}
      </div>
    </section>
  );
}

export function DearMeSidebar() {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-border bg-background">
      <div className="flex h-12 shrink-0 items-center gap-1 px-3">
        <SidebarCompanyMenu />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          onClick={openSearch}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <nav className="scrollbar-auto-hide flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Personal brand team</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Team is working. Decisions stay with you.</p>
        </div>
        <DearMeNavSection label="Today" items={primaryItems} />
        <DearMeNavSection label="Brand OS" items={growthItems} />
      </nav>
    </aside>
  );
}
