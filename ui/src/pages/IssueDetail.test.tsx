// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityEvent, Agent, Approval, Issue, IssueComment, IssueTreeControlPreview, IssueTreeHold } from "@paperclipai/shared";
import type { ActiveRunForIssue, LiveRunForIssue } from "../api/heartbeats";
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IssueDetail } from "./IssueDetail";

const mockIssuesApi = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  listComments: vi.fn(),
  listAttachments: vi.fn(),
  listFeedbackVotes: vi.fn(),
  listApprovals: vi.fn(),
  markRead: vi.fn(),
  update: vi.fn(),
  getDocument: vi.fn(),
  getCostSummary: vi.fn(),
  previewTreeControl: vi.fn(),
  getTreeControlState: vi.fn(),
  listTreeHolds: vi.fn(),
  createTreeHold: vi.fn(),
  releaseTreeHold: vi.fn(),
  checkMonitorNow: vi.fn(),
  listInteractions: vi.fn(),
  acceptInteraction: vi.fn(),
  rejectInteraction: vi.fn(),
  respondToInteraction: vi.fn(),
  cancelInteraction: vi.fn(),
  archiveFromInbox: vi.fn(),
  addComment: vi.fn(),
  cancelComment: vi.fn(),
  upsertFeedbackVote: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  upsertDocument: vi.fn(),
}));

const mockActivityApi = vi.hoisted(() => ({
  forIssue: vi.fn(),
  runsForIssue: vi.fn(),
}));

const mockApprovalsApi = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
}));

const mockHeartbeatsApi = vi.hoisted(() => ({
  liveRunsForIssue: vi.fn(),
  liveRunsForCompany: vi.fn(),
  activeRunForIssue: vi.fn(),
  cancel: vi.fn(),
}));

const mockAgentsApi = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockAccessApi = vi.hoisted(() => ({
  getCurrentBoardAccess: vi.fn(),
  listUserDirectory: vi.fn(),
}));

const mockAuthApi = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const mockProjectsApi = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockInstanceSettingsApi = vi.hoisted(() => ({
  getGeneral: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
const mockOpenPanel = vi.hoisted(() => vi.fn());
const mockClosePanel = vi.hoisted(() => vi.fn());
const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockSetMobileToolbar = vi.hoisted(() => vi.fn());
const mockPushToast = vi.hoisted(() => vi.fn());
const mockIssuesListRender = vi.hoisted(() => vi.fn());
const mockIssueChatThreadRender = vi.hoisted(() => vi.fn());
const mockIssueRunLedgerRender = vi.hoisted(() => vi.fn());
const mockPluginSlotOutletRender = vi.hoisted(() => vi.fn());
const mockPluginSlotMountRender = vi.hoisted(() => vi.fn());
const mockPluginLauncherOutletRender = vi.hoisted(() => vi.fn());
const mockTabsOnValueChange = vi.hoisted(() => ({
  current: null as ((value: string) => void) | null,
}));

vi.mock("../api/issues", () => ({
  issuesApi: mockIssuesApi,
}));

vi.mock("../api/activity", () => ({
  activityApi: mockActivityApi,
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: mockHeartbeatsApi,
}));

vi.mock("../api/approvals", () => ({
  approvalsApi: mockApprovalsApi,
}));

vi.mock("../api/agents", () => ({
  agentsApi: mockAgentsApi,
}));

vi.mock("../api/access", () => ({
  accessApi: mockAccessApi,
}));

vi.mock("../api/auth", () => ({
  authApi: mockAuthApi,
}));

vi.mock("../api/projects", () => ({
  projectsApi: mockProjectsApi,
}));

vi.mock("../api/instanceSettings", () => ({
  instanceSettingsApi: mockInstanceSettingsApi,
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/issues/PAP-1", search: "", hash: "", state: null }),
  useNavigate: () => mockNavigate,
  useNavigationType: () => "PUSH",
  useParams: () => ({ issueId: "PAP-1" }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [{ id: "company-1", name: "Paperclip", issuePrefix: "PAP", status: "active" }],
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Paperclip", issuePrefix: "PAP", status: "active" },
    selectionSource: "manual",
    loading: false,
    error: null,
    setSelectedCompanyId: vi.fn(),
    reloadCompanies: vi.fn(),
    createCompany: vi.fn(),
  }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    openNewIssue: vi.fn(),
  }),
  useDialogActions: () => ({
    openNewIssue: vi.fn(),
  }),
}));

vi.mock("../context/PanelContext", () => ({
  usePanel: () => ({
    openPanel: mockOpenPanel,
    closePanel: mockClosePanel,
    panelVisible: true,
    setPanelVisible: vi.fn(),
  }),
}));

vi.mock("../context/SidebarContext", () => ({
  useSidebar: () => ({
    isMobile: false,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: mockSetBreadcrumbs,
    setMobileToolbar: mockSetMobileToolbar,
  }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastActions: () => ({
    pushToast: mockPushToast,
  }),
}));

vi.mock("../hooks/useProjectOrder", () => ({
  useProjectOrder: ({ projects }: { projects: unknown[] }) => ({
    orderedProjects: projects,
  }),
}));

vi.mock("@/plugins/slots", () => ({
  PluginSlotMount: (props: { slot?: { displayName?: string } }) => {
    mockPluginSlotMountRender(props);
    return <div>Mounted plugin slot</div>;
  },
  PluginSlotOutlet: (props: { slotTypes?: string[] }) => {
    mockPluginSlotOutletRender(props);
    return <div>Plugin outlet {props.slotTypes?.join(",")}</div>;
  },
  usePluginSlots: () => ({
    slots: [{ id: "slot-1", pluginKey: "operator", displayName: "Operator plugin" }],
    isLoading: false,
    errorMessage: null,
  }),
}));

vi.mock("@/plugins/launchers", () => ({
  PluginLauncherOutlet: (props: { placementZones?: string[] }) => {
    mockPluginLauncherOutletRender(props);
    return <div>Plugin launcher {props.placementZones?.join(",")}</div>;
  },
}));

vi.mock("../components/InlineEditor", () => ({
  InlineEditor: ({ value, placeholder }: { value?: string; placeholder?: string }) => (
    <div>{value || placeholder}</div>
  ),
}));

vi.mock("../components/IssueChatThread", () => ({
  IssueChatThread: (props: {
    onStopRun?: (runId: string) => Promise<void>;
    stopRunLabel?: string;
    stoppingRunLabel?: string;
  }) => {
    mockIssueChatThreadRender(props);
    return (
      <div data-testid="issue-chat-thread">
        Chat thread
        {props.onStopRun ? (
          <button type="button" onClick={() => void props.onStopRun?.("run-active-1")}>
            {props.stopRunLabel ?? "Stop run"}
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock("../components/IssueDocumentsSection", () => ({
  IssueDocumentsSection: () => <div>Documents</div>,
}));

vi.mock("../components/IssuesList", () => ({
  IssuesList: (props: { issueBadgeById?: Map<string, string>; liveIssueIds?: Set<string> }) => {
    mockIssuesListRender(props);
    return (
      <div>
        Sub-issues
        {Array.from(props.issueBadgeById?.entries() ?? []).map(([issueId, label]) => (
          <span key={issueId}>{issueId}:{label}</span>
        ))}
      </div>
    );
  },
}));

vi.mock("../components/IssueProperties", () => ({
  IssueProperties: () => <div>Properties</div>,
}));

vi.mock("../components/IssueRunLedger", () => ({
  IssueRunLedger: (props: {
    hideRunSubstrateDetails?: boolean;
    activityEvents?: ActivityEvent[];
    renderActivityEvent?: (event: ActivityEvent) => ReactNode;
  }) => {
    mockIssueRunLedgerRender(props);
    return (
      <div data-testid="issue-run-ledger">
        {props.hideRunSubstrateDetails ? "DearMe work ledger" : "Runs"}
        {props.activityEvents?.map((event) => (
          <div key={event.id}>{props.renderActivityEvent?.(event)}</div>
        ))}
      </div>
    );
  },
}));

vi.mock("../components/IssueWorkspaceCard", () => ({
  IssueWorkspaceCard: () => <div>Workspace</div>,
}));

vi.mock("../components/ImageGalleryModal", () => ({
  ImageGalleryModal: () => null,
}));

vi.mock("../components/ScrollToBottom", () => ({
  ScrollToBottom: () => null,
}));

vi.mock("../components/StatusIcon", () => ({
  StatusIcon: ({ status, blockerAttention }: { status: string; blockerAttention?: Issue["blockerAttention"] }) => (
    <span data-status-icon-state={blockerAttention?.state}>{status}</span>
  ),
}));

vi.mock("../components/PriorityIcon", () => ({
  PriorityIcon: ({ priority }: { priority: string }) => <span>{priority}</span>,
}));

vi.mock("../components/ApprovalCard", () => ({
  ApprovalCard: ({
    detailLink,
    onApprove,
    onReject,
  }: {
    detailLink?: string;
    onApprove?: () => void;
    onReject?: () => void;
  }) => (
    <div>
      Approval
      {detailLink ? <a href={detailLink}>Approval detail</a> : null}
      {onApprove ? (
        <button type="button" onClick={onApprove}>
          Approve linked approval
        </button>
      ) : null}
      {onReject ? (
        <button type="button" onClick={onReject}>
          Reject linked approval
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("../components/Identity", () => ({
  Identity: ({ name }: { name?: string }) => <span>{name}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type = "button",
    variant: _variant,
    size: _size,
    asChild: _asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; asChild?: boolean }) => (
    <button {...props} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children?: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div data-slot="dialog-content" className={className}>{children}</div>
  ),
  DialogDescription: ({ children, className }: { children?: ReactNode; className?: string }) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }: { children?: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children, className }: { children?: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: { children?: ReactNode; className?: string }) => <h2 className={className}>{children}</h2>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    onValueChange,
  }: {
    children?: ReactNode;
    onValueChange?: (value: string) => void;
  }) => {
    mockTabsOnValueChange.current = onValueChange ?? null;
    return <div>{children}</div>;
  },
  TabsContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <button
      type="button"
      onClick={() => {
        if (value) mockTabsOnValueChange.current?.(value);
      }}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function createIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-1",
    companyId: "company-1",
    projectId: null,
    projectWorkspaceId: null,
    goalId: "goal-1",
    parentId: null,
    title: "Issue detail smoke",
    description: "Loads after the initial pending query.",
    status: "todo",
    priority: "medium",
    assigneeAgentId: null,
    assigneeUserId: null,
    checkoutRunId: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    executionWorkspaceId: null,
    executionWorkspacePreference: null,
    executionWorkspaceSettings: null,
    currentExecutionWorkspace: null,
    createdByAgentId: null,
    createdByUserId: null,
    identifier: "PAP-1",
    issueNumber: 1,
    originKind: "manual",
    originId: null,
    originRunId: null,
    originFingerprint: "default",
    requestDepth: 0,
    billingCode: null,
    assigneeAdapterOverrides: null,
    executionPolicy: null,
    executionState: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    createdAt: new Date("2026-04-21T00:00:00.000Z"),
    updatedAt: new Date("2026-04-21T00:00:00.000Z"),
    labels: [],
    labelIds: [],
    ancestors: [],
    documentSummaries: [],
    ...overrides,
  } as Issue;
}

function createLiveRun(overrides: Partial<LiveRunForIssue> = {}): LiveRunForIssue {
  return {
    id: "run-live-1",
    status: "running",
    invocationSource: "manual",
    triggerDetail: null,
    startedAt: "2026-04-21T00:00:00.000Z",
    finishedAt: null,
    createdAt: "2026-04-21T00:00:00.000Z",
    agentId: "agent-1",
    agentName: "CodexCoder",
    adapterType: "codex",
    issueId: "issue-1",
    ...overrides,
  };
}

function createActiveRun(overrides: Partial<ActiveRunForIssue> = {}): ActiveRunForIssue {
  return {
    id: "run-active-1",
    status: "running",
    invocationSource: "manual",
    triggerDetail: null,
    startedAt: "2026-04-21T00:00:00.000Z",
    finishedAt: null,
    createdAt: "2026-04-21T00:00:00.000Z",
    agentId: "agent-1",
    agentName: "CodexCoder",
    adapterType: "codex",
    issueId: "issue-1",
    ...overrides,
  };
}

function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "CodexCoder",
    urlKey: "codexcoder",
    role: "engineer",
    title: "Software Engineer",
    icon: "code",
    status: "active",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-04-21T00:00:00.000Z"),
    updatedAt: new Date("2026-04-21T00:00:00.000Z"),
    ...overrides,
  };
}

function createActivityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "activity-1",
    companyId: "company-1",
    actorType: "agent",
    actorId: "agent-1",
    action: "issue.feedback_vote_saved",
    entityType: "issue",
    entityId: "issue-1",
    agentId: "agent-1",
    runId: "run-secret-1",
    details: {},
    createdAt: new Date("2026-05-08T12:00:00.000Z"),
    ...overrides,
  };
}

function createApproval(overrides: Partial<Approval> = {}): Approval {
  return {
    id: "approval-dearme-1",
    companyId: "company-1",
    type: "dearme_output_next_move",
    requestedByAgentId: "agent-secret-123456",
    requestedByUserId: null,
    status: "pending",
    payload: {
      title: "Approve a private LinkedIn draft",
      summary: "DearMe prepared a short draft for your personal profile.",
      recommendedAction: "Approve after checking tone.",
      nextActionOnApproval: "DearMe will keep it ready for your next review.",
    },
    decisionNote: null,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: new Date("2026-05-08T12:00:00.000Z"),
    updatedAt: new Date("2026-05-08T12:00:00.000Z"),
    ...overrides,
  };
}

function createComment(overrides: Partial<IssueComment> = {}): IssueComment {
  return {
    id: "comment-1",
    companyId: "company-1",
    issueId: "issue-1",
    authorAgentId: null,
    authorUserId: "user-1",
    body: "Comment",
    createdAt: new Date("2026-04-21T00:00:00.000Z"),
    updatedAt: new Date("2026-04-21T00:00:00.000Z"),
    ...overrides,
  };
}

function createPauseHold(overrides: Partial<IssueTreeHold> = {}): IssueTreeHold {
  const now = new Date("2026-04-21T00:00:00.000Z");
  return {
    id: "hold-1",
    companyId: "company-1",
    rootIssueId: "issue-1",
    mode: "pause",
    status: "active",
    reason: null,
    releasePolicy: { strategy: "manual", note: "full_pause" },
    createdByActorType: "user",
    createdByAgentId: null,
    createdByUserId: "user-1",
    createdByRunId: null,
    releasedAt: null,
    releasedByActorType: null,
    releasedByAgentId: null,
    releasedByUserId: null,
    releasedByRunId: null,
    releaseReason: null,
    releaseMetadata: null,
    createdAt: now,
    updatedAt: now,
    members: [
      {
        id: "hold-member-root",
        companyId: "company-1",
        holdId: "hold-1",
        issueId: "issue-1",
        parentIssueId: null,
        depth: 0,
        issueIdentifier: "PAP-1",
        issueTitle: "Issue detail smoke",
        issueStatus: "todo",
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRunId: null,
        activeRunStatus: null,
        skipped: false,
        skipReason: null,
        createdAt: now,
      },
      {
        id: "hold-member-child",
        companyId: "company-1",
        holdId: "hold-1",
        issueId: "child-1",
        parentIssueId: "issue-1",
        depth: 1,
        issueIdentifier: "PAP-2",
        issueTitle: "Held child",
        issueStatus: "todo",
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRunId: null,
        activeRunStatus: null,
        skipped: false,
        skipReason: null,
        createdAt: now,
      },
    ],
    ...overrides,
  };
}

function createResumePreview(): IssueTreeControlPreview {
  return {
    companyId: "company-1",
    rootIssueId: "issue-1",
    mode: "resume",
    generatedAt: new Date("2026-04-21T00:00:00.000Z"),
    releasePolicy: { strategy: "manual" },
    totals: {
      totalIssues: 2,
      affectedIssues: 2,
      skippedIssues: 0,
      activeRuns: 0,
      queuedRuns: 0,
      affectedAgents: 1,
    },
    countsByStatus: { todo: 2 },
    issues: [
      {
        id: "issue-1",
        identifier: "PAP-1",
        title: "Issue detail smoke",
        status: "todo",
        parentId: null,
        depth: 0,
        assigneeAgentId: "agent-1",
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: ["hold-1"],
        action: "resume",
        skipped: false,
        skipReason: null,
      },
      {
        id: "child-1",
        identifier: "PAP-2",
        title: "Held child",
        status: "todo",
        parentId: "issue-1",
        depth: 1,
        assigneeAgentId: "agent-1",
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: ["hold-1"],
        action: "resume",
        skipped: false,
        skipReason: null,
      },
    ],
    skippedIssues: [],
    activeRuns: [],
    affectedAgents: [{ agentId: "agent-1", issueCount: 2, activeRunCount: 0 }],
    warnings: [],
  };
}

function createPausePreview(): IssueTreeControlPreview {
  return {
    companyId: "company-1",
    rootIssueId: "issue-1",
    mode: "pause",
    generatedAt: new Date("2026-04-21T00:00:00.000Z"),
    releasePolicy: { strategy: "manual" },
    totals: {
      totalIssues: 3,
      affectedIssues: 2,
      skippedIssues: 1,
      activeRuns: 1,
      queuedRuns: 0,
      affectedAgents: 0,
    },
    countsByStatus: { todo: 2 },
    issues: [
      {
        id: "issue-1",
        identifier: "PAP-1",
        title: "Issue detail smoke",
        status: "todo",
        parentId: null,
        depth: 0,
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: [],
        action: "pause",
        skipped: false,
        skipReason: null,
      },
      {
        id: "child-1",
        identifier: "PAP-2",
        title: "Paused child",
        status: "in_review",
        parentId: "issue-1",
        depth: 1,
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: [],
        action: "pause",
        skipped: false,
        skipReason: null,
      },
      {
        id: "child-2",
        identifier: "PAP-3",
        title: "Completed child",
        status: "done",
        parentId: "issue-1",
        depth: 1,
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: [],
        action: "pause",
        skipped: true,
        skipReason: "terminal_status",
      },
    ],
    skippedIssues: [
      {
        id: "child-2",
        identifier: "PAP-3",
        title: "Completed child",
        status: "done",
        parentId: "issue-1",
        depth: 1,
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: [],
        action: "pause",
        skipped: true,
        skipReason: "terminal_status",
      },
    ],
    activeRuns: [],
    affectedAgents: [],
    warnings: [],
  };
}

function createRestorePreview(): IssueTreeControlPreview {
  return {
    companyId: "company-1",
    rootIssueId: "issue-1",
    mode: "restore",
    generatedAt: new Date("2026-04-21T00:00:00.000Z"),
    releasePolicy: { strategy: "manual" },
    totals: {
      totalIssues: 2,
      affectedIssues: 1,
      skippedIssues: 1,
      activeRuns: 0,
      queuedRuns: 0,
      affectedAgents: 1,
    },
    countsByStatus: { todo: 1, cancelled: 1 },
    issues: [
      {
        id: "issue-1",
        identifier: "PAP-1",
        title: "Issue detail smoke",
        status: "todo",
        parentId: null,
        depth: 0,
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: [],
        action: "restore",
        skipped: true,
        skipReason: "not_cancelled",
      },
      {
        id: "child-1",
        identifier: "PAP-2",
        title: "Cancelled child",
        status: "cancelled",
        parentId: "issue-1",
        depth: 1,
        assigneeAgentId: "agent-1",
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: ["cancel-hold-1"],
        action: "restore",
        skipped: false,
        skipReason: null,
      },
    ],
    skippedIssues: [
      {
        id: "issue-1",
        identifier: "PAP-1",
        title: "Issue detail smoke",
        status: "todo",
        parentId: null,
        depth: 0,
        assigneeAgentId: null,
        assigneeUserId: null,
        activeRun: null,
        activeHoldIds: [],
        action: "restore",
        skipped: true,
        skipReason: "not_cancelled",
      },
    ],
    activeRuns: [],
    affectedAgents: [{ agentId: "agent-1", issueCount: 1, activeRunCount: 0 }],
    warnings: [],
  };
}

function createCancelPreview(issueCount = 8): IssueTreeControlPreview {
  const issues = Array.from({ length: issueCount }, (_, index) => ({
    id: index === 0 ? "issue-1" : `child-${index}`,
    identifier: index === 0 ? "PAP-1" : `PAP-${index + 1}`,
    title: index === 0 ? "Issue detail smoke" : `Cancellable child ${index}`,
    status: "todo" as const,
    parentId: index === 0 ? null : "issue-1",
    depth: index === 0 ? 0 : 1,
    assigneeAgentId: null,
    assigneeUserId: null,
    activeRun: null,
    activeHoldIds: [],
    action: "cancel" as const,
    skipped: false,
    skipReason: null,
  }));

  return {
    companyId: "company-1",
    rootIssueId: "issue-1",
    mode: "cancel",
    generatedAt: new Date("2026-04-21T00:00:00.000Z"),
    releasePolicy: { strategy: "manual" },
    totals: {
      totalIssues: issueCount,
      affectedIssues: issueCount,
      skippedIssues: 0,
      activeRuns: 0,
      queuedRuns: 0,
      affectedAgents: 0,
    },
    countsByStatus: { todo: issueCount },
    issues,
    skippedIssues: [],
    activeRuns: [],
    affectedAgents: [],
    warnings: [],
  };
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function setNativeTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  const previous = textarea.value;
  valueSetter?.call(textarea, value);
  const tracker = (textarea as HTMLTextAreaElement & { _valueTracker?: { setValue: (v: string) => void } })
    ._valueTracker;
  tracker?.setValue(previous);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

async function waitForAssertion(assertion: () => void, attempts = 20) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flushReact();
    }
  }
  throw lastError;
}

describe("IssueDetail", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    mockIssuesApi.list.mockResolvedValue([]);
    mockIssuesApi.listComments.mockResolvedValue([]);
    mockIssuesApi.listInteractions.mockResolvedValue([]);
    mockIssuesApi.listAttachments.mockResolvedValue([]);
    mockIssuesApi.listFeedbackVotes.mockResolvedValue([]);
    mockIssuesApi.listApprovals.mockResolvedValue([]);
    mockIssuesApi.markRead.mockResolvedValue({ id: "issue-1", lastReadAt: new Date().toISOString() });
    mockIssuesApi.update.mockImplementation((_id: string, data: Partial<Issue>) =>
      Promise.resolve(createIssue(data)),
    );
    mockIssuesApi.getDocument.mockResolvedValue(null);
    mockIssuesApi.getCostSummary.mockResolvedValue(null);
    mockIssuesApi.getTreeControlState.mockResolvedValue({ activePauseHold: null });
    mockIssuesApi.listTreeHolds.mockResolvedValue([]);
    mockIssuesApi.checkMonitorNow.mockResolvedValue({ ok: true });
    mockActivityApi.forIssue.mockResolvedValue([]);
    mockActivityApi.runsForIssue.mockResolvedValue([]);
    mockApprovalsApi.approve.mockResolvedValue(createApproval({ status: "approved" }));
    mockApprovalsApi.reject.mockResolvedValue(createApproval({ status: "rejected" }));
    mockHeartbeatsApi.liveRunsForIssue.mockResolvedValue([]);
    mockHeartbeatsApi.liveRunsForCompany.mockResolvedValue([]);
    mockHeartbeatsApi.activeRunForIssue.mockResolvedValue(null);
    mockAgentsApi.list.mockResolvedValue([]);
    mockAccessApi.getCurrentBoardAccess.mockResolvedValue({
      companyIds: ["company-1"],
      isInstanceAdmin: true,
      source: "session",
      keyId: null,
      user: null,
      userId: null,
    });
    mockAccessApi.listUserDirectory.mockResolvedValue({ users: [] });
    mockAuthApi.getSession.mockResolvedValue({ session: null, user: null });
    mockProjectsApi.list.mockResolvedValue([]);
    mockInstanceSettingsApi.getGeneral.mockResolvedValue({
      keyboardShortcuts: false,
      feedbackDataSharingPreference: "prompt",
    });
    mockNavigate.mockClear();
    mockPushToast.mockClear();
    mockTabsOnValueChange.current = null;
    mockOpenPanel.mockClear();
    mockClosePanel.mockClear();
    mockSetBreadcrumbs.mockClear();
    mockSetMobileToolbar.mockClear();
    mockIssuesListRender.mockClear();
    mockIssueChatThreadRender.mockClear();
    mockIssueRunLedgerRender.mockClear();
    mockPluginSlotOutletRender.mockClear();
    mockPluginSlotMountRender.mockClear();
    mockPluginLauncherOutletRender.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("loads from the pending state into issue detail without changing hook order", async () => {
    const issueRequest = createDeferred<Issue>();
    mockIssuesApi.get.mockReturnValueOnce(issueRequest.promise);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });

    issueRequest.resolve(createIssue());
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("Issue detail smoke");
    expect(container.textContent).toContain("Chat thread");
    expect(container.textContent).toContain("Workspace");
    expect(container.querySelector('button[title="Properties"]')).toBeTruthy();
    expect(container.querySelector('button[title="Show properties"]')).toBeTruthy();
    expect(mockOpenPanel).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("hides workspace controls for DearMe issues", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({ originKind: "dearme_brand_blueprint_apply" }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(container.textContent).toContain("Chat thread");
    });
    expect(container.textContent).not.toContain("Workspace");
  });

  it("hides issue properties controls for DearMe issues", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({ originKind: "dearme_brand_blueprint_apply" }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(container.textContent).toContain("Chat thread");
    });
    expect(container.querySelector('button[title="Properties"]')).toBeNull();
    expect(container.querySelector('button[title="Show properties"]')).toBeNull();
    expect(mockOpenPanel).not.toHaveBeenCalled();
  });

  it("preserves the header identifier for generic issues", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue());

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(container.textContent).toContain("PAP-1");
    });
  });

  it("hides the raw header identifier for DearMe issues", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({ originKind: "dearme_brand_blueprint_apply" }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(container.textContent).toContain("Chat thread");
    });
    expect(container.textContent).not.toContain("PAP-1");
  });

  it("preserves generic issue plugin surfaces", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue());

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(mockPluginSlotOutletRender).toHaveBeenCalled();
      expect(mockPluginLauncherOutletRender).toHaveBeenCalled();
    });

    const renderedSlotTypes = mockPluginSlotOutletRender.mock.calls
      .map(([props]) => props?.slotTypes?.join(","));
    expect(renderedSlotTypes).toEqual(expect.arrayContaining([
      "toolbarButton,contextMenuItem",
      "taskDetailView",
    ]));
    expect(container.textContent).toContain("Plugin launcher toolbarButton");
    expect(container.textContent).toContain("Operator plugin");
  });

  it("hides generic plugin surfaces for DearMe issues", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({ originKind: "dearme_brand_blueprint_apply" }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(container.textContent).toContain("Chat thread");
    });

    expect(mockPluginSlotOutletRender).not.toHaveBeenCalled();
    expect(mockPluginLauncherOutletRender).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Plugin outlet");
    expect(container.textContent).not.toContain("Plugin launcher");
    expect(container.textContent).not.toContain("Operator plugin");
  });

  it("hides tree pause controls for DearMe issues", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Customer-facing child",
    });

    mockIssuesApi.get.mockResolvedValue(createIssue({
      originKind: "dearme_brand_blueprint_apply",
      status: "in_progress",
      assigneeAgentId: "agent-1",
      executionRunId: "run-active-1",
    }));
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockIssuesApi.getTreeControlState.mockResolvedValue({
      activePauseHold: {
        holdId: "hold-1",
        rootIssueId: "issue-1",
        issueId: "issue-1",
        isRoot: true,
        mode: "pause",
        reason: null,
        releasePolicy: { strategy: "manual", note: "full_pause" },
      },
    });
    mockIssuesApi.listTreeHolds.mockResolvedValue([createPauseHold()]);
    mockAgentsApi.list.mockResolvedValue([createAgent()]);
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(container.textContent).toContain("Chat thread");
    });

    expect(mockIssuesApi.getTreeControlState).not.toHaveBeenCalled();
    expect(mockIssuesApi.previewTreeControl).not.toHaveBeenCalled();
    expect(mockIssuesApi.listTreeHolds).not.toHaveBeenCalled();
    expect(mockIssueChatThreadRender.mock.calls.at(-1)?.[0].onPauseWorkRun).toBeUndefined();

    const moreButton = container.querySelector('button[aria-label="More issue actions"]') as HTMLButtonElement | null;
    expect(moreButton).toBeTruthy();
    await act(async () => {
      moreButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flushReact();

    expect(container.textContent).not.toMatch(/Paused by board|Subtree pause is active|Pause work|Resume work|Pause subtree|Resume subtree|Cancel subtree|Restore subtree|wake|held/i);
  });

  it("preserves generic issue live indicators", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Live child",
    });

    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "in_progress",
      executionRunId: "run-active-1",
    }));
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockHeartbeatsApi.liveRunsForIssue.mockResolvedValue([createLiveRun()]);
    mockHeartbeatsApi.activeRunForIssue.mockResolvedValue(createActiveRun());
    mockHeartbeatsApi.liveRunsForCompany.mockResolvedValue([
      createLiveRun({ id: "run-live-child", issueId: "child-1" }),
    ]);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Live");
      expect(mockSetBreadcrumbs.mock.calls.some(([items]) =>
        items.some((item: { label: string }) => item.label === "🔵 Issue detail smoke"),
      )).toBe(true);
      expect(mockIssuesListRender.mock.calls.at(-1)?.[0].liveIssueIds?.has("child-1")).toBe(true);
    });
  });

  it("hides live indicators for DearMe issues", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Customer-facing child",
    });

    mockIssuesApi.get.mockResolvedValue(createIssue({
      originKind: "dearme_brand_blueprint_apply",
      status: "in_progress",
      executionRunId: "run-active-1",
    }));
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockHeartbeatsApi.liveRunsForIssue.mockResolvedValue([createLiveRun()]);
    mockHeartbeatsApi.activeRunForIssue.mockResolvedValue(createActiveRun());
    mockHeartbeatsApi.liveRunsForCompany.mockResolvedValue([
      createLiveRun({ id: "run-live-child", issueId: "child-1" }),
    ]);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Issue detail smoke");
      expect(mockIssuesListRender.mock.calls.at(-1)?.[0].liveIssueIds).toBeUndefined();
    });
    expect(container.textContent).not.toContain("Live");
    expect(mockSetBreadcrumbs.mock.calls.some(([items]) =>
      items.some((item: { label: string }) => item.label === "🔵 Issue detail smoke"),
    )).toBe(false);
  });

  it("routes DearMe linked approval decisions back to DearMe", async () => {
    const dearMeApproval = createApproval();
    mockIssuesApi.get.mockResolvedValue(createIssue());
    mockIssuesApi.listApprovals.mockResolvedValue([dearMeApproval]);
    mockApprovalsApi.approve.mockResolvedValue(createApproval({ status: "approved" }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const activityButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Activity");
    expect(activityButton).toBeTruthy();

    await act(async () => {
      activityButton!.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Approve linked approval");
    });

    const detailLink = Array.from(container.querySelectorAll("a"))
      .find((link) => link.textContent?.trim() === "Approval detail");
    expect(detailLink?.getAttribute("href")).toBe("/dearme?view=decisions&approval=approval-dearme-1");

    mockNavigate.mockClear();
    const approveButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Approve linked approval");
    expect(approveButton).toBeTruthy();

    await act(async () => {
      approveButton!.click();
    });

    await waitForAssertion(() => {
      expect(mockApprovalsApi.approve).toHaveBeenCalledWith("approval-dearme-1");
      expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Decision approved",
        tone: "success",
      }));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/dearme?view=decisions&approval=approval-dearme-1",
        { replace: true },
      );
    });
  });

  it("keeps DearMe activity run metadata and usage details product-safe", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({ originKind: "dearme_brand_blueprint_apply" }));
    mockIssuesApi.getCostSummary.mockResolvedValue({
      inputTokens: 1200,
      outputTokens: 340,
      cachedInputTokens: 80,
      costCents: 42,
      issueCount: 2,
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const activityButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Activity");
    expect(activityButton).toBeTruthy();

    await act(async () => {
      activityButton!.click();
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("DearMe work ledger");
      expect(mockIssueRunLedgerRender.mock.calls.at(-1)?.[0]).toMatchObject({
        hideRunSubstrateDetails: true,
      });
    });
    expect(container.textContent).not.toContain("Cost Summary");
    expect(container.textContent).not.toContain("Tokens");
    expect(container.textContent).not.toContain("$0.4200");
  });

  it("keeps DearMe activity event actors and actions product-safe", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({ originKind: "dearme_brand_blueprint_apply" }));
    mockAgentsApi.list.mockResolvedValue([createAgent()]);
    mockActivityApi.forIssue.mockResolvedValue([
      createActivityEvent({
        id: "activity-feedback",
        action: "issue.feedback_vote_saved",
        details: { source: "OpenClaw adapter", note: "AI output" },
      }),
      createActivityEvent({
        id: "activity-monitor",
        action: "issue.monitor_recovery_wake_queued",
        details: { serviceName: "OpenClaw watchdog", agentId: "agent-1" },
      }),
    ]);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const activityButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Activity");
    expect(activityButton).toBeTruthy();

    await act(async () => {
      activityButton!.click();
    });

    await waitForAssertion(() => {
      const ledgerText = container.querySelector("[data-testid='issue-run-ledger']")?.textContent ?? "";
      expect(ledgerText).toContain("DearMe team");
      expect(ledgerText).toContain("saved your feedback on prepared work");
      expect(ledgerText).toContain("queued follow-up after a scheduled check");
      expect(ledgerText).not.toMatch(
        /CodexCoder|agent-1|run-secret|AI output|monitor|wake|OpenClaw|adapter|provider|runtime|issue\.monitor_recovery_wake_queued/i,
      );
    });
  });

  it("keeps DearMe scheduled follow-up cards product-safe", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({
      originKind: "dearme_brand_blueprint_apply",
      monitorNextCheckAt: new Date("2026-04-21T12:30:00.000Z"),
      monitorAttemptCount: 4,
      monitorNotes: "OpenClaw adapter should wake the provider token",
      executionPolicy: {
        mode: "normal",
        commentRequired: true,
        stages: [],
        monitor: {
          nextCheckAt: "2026-04-21T12:30:00.000Z",
          notes: "OpenClaw adapter should wake the provider token",
          scheduledBy: "board",
          serviceName: "OpenClaw watchdog",
        },
      },
    }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const activityButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Activity");
    expect(activityButton).toBeTruthy();

    await act(async () => {
      activityButton!.click();
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Follow-up scheduled");
      expect(container.textContent).toContain("Next review");
      expect(container.textContent).toContain("DearMe will review this again automatically.");
      expect(container.textContent).toContain("Refresh now");
      expect(container.textContent).not.toMatch(
        /Monitor scheduled|Next check|Check now|Attempt|OpenClaw|adapter|watchdog|provider|token/i,
      );
    });
  });

  it("keeps generic linked approval decisions on the issue detail", async () => {
    const genericApproval = createApproval({
      id: "approval-generic-1",
      type: "request_board_approval",
    });
    mockIssuesApi.get.mockResolvedValue(createIssue());
    mockIssuesApi.listApprovals.mockResolvedValue([genericApproval]);
    mockApprovalsApi.reject.mockResolvedValue(createApproval({
      ...genericApproval,
      status: "rejected",
    }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const activityButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Activity");
    expect(activityButton).toBeTruthy();

    await act(async () => {
      activityButton!.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Reject linked approval");
    });

    const detailLink = Array.from(container.querySelectorAll("a"))
      .find((link) => link.textContent?.trim() === "Approval detail");
    expect(detailLink?.getAttribute("href")).toBe("/approvals/approval-generic-1");

    mockNavigate.mockClear();
    const rejectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Reject linked approval");
    expect(rejectButton).toBeTruthy();

    await act(async () => {
      rejectButton!.click();
    });

    await waitForAssertion(() => {
      expect(mockApprovalsApi.reject).toHaveBeenCalledWith("approval-generic-1");
      expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Approval rejected",
        tone: "success",
      }));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("passes blocker attention to the issue detail header status icon", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "blocked",
      blockerAttention: {
        state: "covered",
        reason: "active_child",
        unresolvedBlockerCount: 1,
        coveredBlockerCount: 1,
        stalledBlockerCount: 0,
        attentionBlockerCount: 0,
        sampleBlockerIdentifier: "PAP-2",
        sampleStalledBlockerIdentifier: null,
      },
    }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.querySelector('[data-status-icon-state="covered"]')?.textContent).toBe("blocked");
  });

  it("lets an assigned reviewer accept in-review output", async () => {
    const reviewIssue = createIssue({
      status: "in_review",
      assigneeUserId: "user-1",
    });
    mockIssuesApi.get.mockResolvedValue(reviewIssue);
    mockIssuesApi.listComments.mockResolvedValue([
      createComment({
        id: "agent-comment-1",
        authorAgentId: "agent-1",
        authorUserId: null,
        body: "Draft output",
      }),
    ]);
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });
    mockIssuesApi.update.mockResolvedValue({
      ...createIssue({
        status: "done",
        assigneeAgentId: null,
        assigneeUserId: null,
      }),
      comment: createComment({
        id: "review-comment-1",
        body: "Accepted this draft for private use.",
      }),
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Review output");
    });

    const acceptButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Accept draft");
    expect(acceptButton).toBeTruthy();

    await act(async () => {
      acceptButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.update).toHaveBeenCalledWith("PAP-1", {
      status: "done",
      assigneeAgentId: null,
      assigneeUserId: null,
      comment: "Accepted this draft for private use.",
    });
    expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Draft accepted",
      tone: "success",
    }));
  });

  it("returns requested changes to the latest draft author", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "in_review",
      assigneeUserId: "user-1",
    }));
    mockIssuesApi.listComments.mockResolvedValue([
      createComment({
        id: "agent-comment-1",
        authorAgentId: "agent-1",
        authorUserId: null,
        body: "Older draft",
        createdAt: new Date("2026-04-21T00:00:00.000Z"),
      }),
      createComment({
        id: "agent-comment-2",
        authorAgentId: "agent-2",
        authorUserId: null,
        body: "Latest draft",
        createdAt: new Date("2026-04-21T00:01:00.000Z"),
      }),
    ]);
    mockAgentsApi.list.mockResolvedValue([
      createAgent({ id: "agent-1", name: "Older Draft Agent" }),
      createAgent({ id: "agent-2", name: "Latest Draft Agent" }),
    ]);
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });
    mockIssuesApi.update.mockResolvedValue({
      ...createIssue({
        status: "todo",
        assigneeAgentId: "agent-2",
        assigneeUserId: null,
      }),
      comment: createComment({
        id: "review-comment-2",
        body: "Revision requested:\n\nTighten the privacy language.",
      }),
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const reviseButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Request changes");
    expect(reviseButton).toBeTruthy();

    await act(async () => {
      reviseButton!.click();
    });
    await flushReact();

    const revisionNotes = container.querySelector('textarea[aria-label="Revision notes"]') as HTMLTextAreaElement | null;
    expect(revisionNotes).toBeTruthy();
    await act(async () => {
      setNativeTextareaValue(revisionNotes!, "Tighten the privacy language.");
    });
    await flushReact();

    const sendButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Send changes");
    expect(sendButton).toBeTruthy();
    expect((sendButton as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      sendButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.update).toHaveBeenCalledWith("PAP-1", {
      status: "todo",
      assigneeAgentId: "agent-2",
      assigneeUserId: null,
      comment: "Revision requested:\n\nTighten the privacy language.",
    });
    expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Changes requested",
      tone: "success",
    }));
  });

  it("does not return requested changes to an unavailable draft author", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "in_review",
      assigneeUserId: "user-1",
    }));
    mockIssuesApi.listComments.mockResolvedValue([
      createComment({
        id: "agent-comment-1",
        authorAgentId: "agent-1",
        authorUserId: null,
        body: "Draft output",
      }),
    ]);
    mockAgentsApi.list.mockResolvedValue([
      createAgent({ id: "agent-1", status: "terminated" }),
    ]);
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const reviseButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Request changes");
    expect(reviseButton).toBeTruthy();

    await act(async () => {
      reviseButton!.click();
    });
    await flushReact();

    const revisionNotes = container.querySelector('textarea[aria-label="Revision notes"]') as HTMLTextAreaElement | null;
    expect(revisionNotes).toBeTruthy();
    await act(async () => {
      setNativeTextareaValue(revisionNotes!, "Try again with a sharper ending.");
    });
    await flushReact();

    expect(container.textContent).toContain("This draft author is no longer available for changes.");
    const sendButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Send changes");
    expect(sendButton).toBeTruthy();
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);
    expect(mockIssuesApi.update).not.toHaveBeenCalled();
  });

  it("lets an assigned reviewer reject in-review output", async () => {
    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "in_review",
      assigneeUserId: "user-1",
    }));
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });
    mockIssuesApi.update.mockResolvedValue({
      ...createIssue({
        status: "cancelled",
        assigneeAgentId: null,
        assigneeUserId: null,
      }),
      comment: createComment({
        id: "review-comment-3",
        body: "Rejected this draft.",
      }),
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const rejectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Reject draft");
    expect(rejectButton).toBeTruthy();

    await act(async () => {
      rejectButton!.click();
    });
    await flushReact();

    const confirmRejectButton = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent?.trim() === "Reject draft")
      .at(-1);
    expect(confirmRejectButton).toBeTruthy();

    await act(async () => {
      confirmRejectButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.update).toHaveBeenCalledWith("PAP-1", {
      status: "cancelled",
      assigneeAgentId: null,
      assigneeUserId: null,
      comment: "Rejected this draft.",
    });
    expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Draft rejected",
      tone: "success",
    }));
  });

  it("refreshes subtree pause state after resuming a hold", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Held child",
    });
    const activeHold = createPauseHold();
    const releasedHold = createPauseHold({
      status: "released",
      releasedAt: new Date("2026-04-21T00:01:00.000Z"),
      releasedByActorType: "user",
      releasedByUserId: "user-1",
      releaseReason: "Ready to continue",
      updatedAt: new Date("2026-04-21T00:01:00.000Z"),
    });
    let activePauseHoldState: null | {
      holdId: string;
      rootIssueId: string;
      issueId: string;
      isRoot: boolean;
      mode: "pause";
      reason: string | null;
      releasePolicy: { strategy: "manual" | "after_active_runs_finish"; note?: string | null } | null;
    } = {
      holdId: "hold-1",
      rootIssueId: "issue-1",
      issueId: "issue-1",
      isRoot: true,
      mode: "pause",
      reason: null,
      releasePolicy: { strategy: "manual", note: "full_pause" },
    };

    mockIssuesApi.get.mockResolvedValue(createIssue());
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockIssuesApi.getTreeControlState.mockImplementation(() =>
      Promise.resolve({ activePauseHold: activePauseHoldState }),
    );
    mockIssuesApi.listTreeHolds.mockResolvedValue([activeHold]);
    mockIssuesApi.previewTreeControl.mockResolvedValue(createResumePreview());
    mockAgentsApi.list.mockResolvedValue([createAgent()]);
    mockIssuesApi.releaseTreeHold.mockImplementation(() => {
      activePauseHoldState = null;
      return Promise.resolve(releasedHold);
    });
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Subtree pause is active.");
      expect(mockIssuesListRender.mock.calls.at(-1)?.[0].issueBadgeById.get("child-1")).toBe("Paused");
      expect(mockIssuesListRender.mock.calls.at(-1)?.[0].showProgressSummary).toBe(true);
    });

    const resumeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Resume subtree");
    expect(resumeButton).toBeTruthy();

    await act(async () => {
      resumeButton!.click();
    });
    await flushReact();

    const applyResumeButton = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent?.trim() === "Resume subtree")
      .at(-1);
    expect(applyResumeButton).toBeTruthy();
    expect(container.textContent).toContain("CodexCoder");

    await act(async () => {
      applyResumeButton!.click();
    });
    await flushReact();
    await flushReact();

    expect(mockIssuesApi.releaseTreeHold).toHaveBeenCalledWith("PAP-1", "hold-1", {
      reason: null,
      metadata: { wakeAgents: true },
    });
    expect(mockIssuesApi.getTreeControlState.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Subtree resumed",
      body: "Ready to continue",
    }));
    await waitForAssertion(() => {
      expect(container.textContent).not.toContain("Subtree pause is active.");
      expect(mockIssuesListRender.mock.calls.at(-1)?.[0].issueBadgeById.has("child-1")).toBe(false);
    });
  });

  it("uses simplified full-subtree pause controls", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Paused child",
    });
    const pausePreview = createPausePreview();
    const pauseHold = createPauseHold({
      id: "pause-hold-1",
      mode: "pause",
      reason: null,
      releasePolicy: { strategy: "manual", note: "full_pause" },
      members: [],
    });

    mockIssuesApi.get.mockResolvedValue(createIssue());
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockIssuesApi.previewTreeControl.mockResolvedValue(pausePreview);
    mockIssuesApi.createTreeHold.mockResolvedValue({ hold: pauseHold, preview: pausePreview });
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const moreButton = container.querySelector('button[aria-label="More issue actions"]') as HTMLButtonElement | null;
    expect(moreButton).toBeTruthy();

    await act(async () => {
      moreButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flushReact();

    const pauseMenuButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Pause subtree...");
    expect(pauseMenuButton).toBeTruthy();

    await act(async () => {
      pauseMenuButton!.click();
    });
    await flushReact();
    await flushReact();

    expect(mockIssuesApi.previewTreeControl).toHaveBeenCalledWith("PAP-1", {
      mode: "pause",
      releasePolicy: { strategy: "manual" },
    });
    expect(container.textContent).not.toContain("Pause mode");
    expect(container.textContent).not.toContain("Release policy");
    expect(container.textContent).not.toContain("Status breakdown");
    expect(container.textContent).not.toContain("Active runs cancelled");
    expect(container.textContent).toContain("Paused child");
    expect(container.textContent).toContain("Completed child");
    expect(container.textContent).toContain("Complete");

    const pauseApplyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Pause and stop work");
    expect(pauseApplyButton).toBeTruthy();

    await act(async () => {
      pauseApplyButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.createTreeHold).toHaveBeenCalledWith("PAP-1", {
      mode: "pause",
      reason: null,
      releasePolicy: { strategy: "manual", note: "full_pause" },
    });
  });

  it("exposes leaf pause controls and routes issue active-run stop through Pause work", async () => {
    const pausePreview = createPausePreview();
    pausePreview.totals = {
      ...pausePreview.totals,
      totalIssues: 1,
      affectedIssues: 1,
      skippedIssues: 0,
      activeRuns: 1,
    };
    pausePreview.issues = [pausePreview.issues[0]!];
    pausePreview.skippedIssues = [];
    const pauseHold = createPauseHold({
      id: "leaf-pause-hold-1",
      mode: "pause",
      reason: "Paused from active run controls.",
      releasePolicy: { strategy: "manual", note: "leaf_pause" },
      members: [],
    });

    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "in_progress",
      assigneeAgentId: "agent-1",
      executionRunId: "run-active-1",
    }));
    mockIssuesApi.previewTreeControl.mockResolvedValue(pausePreview);
    mockIssuesApi.createTreeHold.mockResolvedValue({ hold: pauseHold, preview: pausePreview });
    mockAgentsApi.list.mockResolvedValue([createAgent()]);
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(mockIssueChatThreadRender.mock.calls.at(-1)?.[0]).toMatchObject({
      stopRunLabel: "Pause work",
      stoppingRunLabel: "Pausing...",
    });

    const chatPauseButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Pause work");
    expect(chatPauseButton).toBeTruthy();

    await act(async () => {
      chatPauseButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.createTreeHold).toHaveBeenCalledWith("PAP-1", {
      mode: "pause",
      reason: "Paused from active run controls.",
      releasePolicy: { strategy: "manual", note: "leaf_pause" },
      metadata: { source: "issue_active_run_control", runId: "run-active-1" },
    });

    const moreButton = container.querySelector('button[aria-label="More issue actions"]') as HTMLButtonElement | null;
    expect(moreButton).toBeTruthy();
    await act(async () => {
      moreButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flushReact();

    const pauseMenuButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Pause work...");
    expect(pauseMenuButton).toBeTruthy();
  });

  it("renders Paused by board distinctly and defaults leaf resume to wake the assignee", async () => {
    const activeHold = createPauseHold();
    const releasedHold = createPauseHold({
      status: "released",
      releasedAt: new Date("2026-04-21T00:01:00.000Z"),
      releasedByActorType: "user",
      releasedByUserId: "user-1",
      releaseReason: "Ready to continue",
      updatedAt: new Date("2026-04-21T00:01:00.000Z"),
    });

    mockIssuesApi.get.mockResolvedValue(createIssue({
      status: "in_review",
      assigneeAgentId: "agent-1",
    }));
    mockIssuesApi.getTreeControlState.mockResolvedValue({
      activePauseHold: {
        holdId: "hold-1",
        rootIssueId: "issue-1",
        issueId: "issue-1",
        isRoot: true,
        mode: "pause",
        reason: null,
        releasePolicy: { strategy: "manual", note: "leaf_pause" },
      },
    });
    mockIssuesApi.listTreeHolds.mockResolvedValue([activeHold]);
    mockIssuesApi.previewTreeControl.mockResolvedValue(createResumePreview());
    mockIssuesApi.releaseTreeHold.mockResolvedValue(releasedHold);
    mockAgentsApi.list.mockResolvedValue([createAgent()]);
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Paused by board.");
      expect(container.textContent).toContain("in_review");
      expect(container.textContent).not.toContain("Subtree pause is active.");
    });

    const resumeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Resume work");
    expect(resumeButton).toBeTruthy();

    await act(async () => {
      resumeButton!.click();
    });
    await flushReact();
    await flushReact();

    const wakeCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(wakeCheckbox?.checked).toBe(true);

    const applyResumeButton = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent?.trim() === "Resume work")
      .at(-1);
    expect(applyResumeButton).toBeTruthy();

    await act(async () => {
      applyResumeButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.releaseTreeHold).toHaveBeenCalledWith("PAP-1", "hold-1", {
      reason: null,
      metadata: { wakeAgents: true },
    });
  });

  it("exposes restore subtree from the issue actions menu", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Cancelled child",
      status: "cancelled",
      assigneeAgentId: "agent-1",
    });
    const cancelHold = createPauseHold({
      id: "cancel-hold-1",
      mode: "cancel",
      reason: "bad plan",
      members: [],
    });
    const restorePreview = createRestorePreview();
    const restoreHold = createPauseHold({
      id: "restore-hold-1",
      mode: "restore",
      status: "released",
      reason: null,
      releaseReason: "Restore operation applied",
      releasedAt: new Date("2026-04-21T00:02:00.000Z"),
      members: [],
    });

    mockIssuesApi.get.mockResolvedValue(createIssue());
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockIssuesApi.listTreeHolds.mockImplementation((_issueId, filters?: { mode?: string }) =>
      Promise.resolve(filters?.mode === "cancel" ? [cancelHold] : []),
    );
    mockIssuesApi.previewTreeControl.mockResolvedValue(restorePreview);
    mockIssuesApi.createTreeHold.mockResolvedValue({ hold: restoreHold, preview: restorePreview });
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const moreButton = container.querySelector('button[aria-label="More issue actions"]') as HTMLButtonElement | null;
    expect(moreButton).toBeTruthy();

    await act(async () => {
      moreButton!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flushReact();

    const restoreMenuButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Restore subtree...");
    expect(restoreMenuButton).toBeTruthy();

    await act(async () => {
      restoreMenuButton!.click();
    });
    await flushReact();
    await flushReact();

    expect(mockIssuesApi.previewTreeControl).toHaveBeenCalledWith("PAP-1", {
      mode: "restore",
      releasePolicy: { strategy: "manual" },
    });
    expect(container.textContent).toContain("Restore issues cancelled by this subtree operation so work can resume.");
    expect(container.textContent).toContain("Cancelled child");

    const restoreApplyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Restore 1 issues");
    expect(restoreApplyButton).toBeTruthy();

    await act(async () => {
      restoreApplyButton!.click();
    });
    await flushReact();

    expect(mockIssuesApi.createTreeHold).toHaveBeenCalledWith("PAP-1", {
      mode: "restore",
      reason: null,
      releasePolicy: { strategy: "manual" },
      metadata: { wakeAgents: false },
    });
  });

  it("bounds the subtree control dialog with an internal scroll body", async () => {
    const childIssue = createIssue({
      id: "child-1",
      parentId: "issue-1",
      identifier: "PAP-2",
      issueNumber: 2,
      title: "Cancellable child",
    });

    mockIssuesApi.get.mockResolvedValue(createIssue());
    mockIssuesApi.list.mockImplementation((_companyId, filters?: { descendantOf?: string }) =>
      Promise.resolve(filters?.descendantOf === "issue-1" ? [childIssue] : []),
    );
    mockIssuesApi.previewTreeControl.mockResolvedValue(createCancelPreview(24));
    mockAuthApi.getSession.mockResolvedValue({
      session: { userId: "user-1" },
      user: { id: "user-1" },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <IssueDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const cancelMenuButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Cancel subtree...");
    expect(cancelMenuButton).toBeTruthy();

    await act(async () => {
      cancelMenuButton!.click();
    });
    await flushReact();
    await flushReact();

    expect(mockIssuesApi.previewTreeControl).toHaveBeenCalledWith("PAP-1", {
      mode: "cancel",
      releasePolicy: { strategy: "manual" },
    });

    const dialogContent = container.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null;
    expect(dialogContent).toBeTruthy();
    expect(dialogContent!.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(dialogContent!.className).toContain("overflow-hidden");
    expect(dialogContent!.className).toContain("flex-col");

    const bodyScrollRegion = Array.from(dialogContent!.querySelectorAll("div"))
      .find((element) =>
        typeof element.className === "string"
        && element.className.includes("overflow-y-auto")
        && element.textContent?.includes("Reason (optional)"),
      );
    expect(bodyScrollRegion?.className).toContain("min-h-0");
    expect(bodyScrollRegion?.className).toContain("overscroll-contain");

    const cancelApplyButton = Array.from(dialogContent!.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Cancel 24 issues") as HTMLButtonElement | undefined;
    expect(cancelApplyButton).toBeTruthy();
    expect(cancelApplyButton!.disabled).toBe(true);

    const confirmationCheckbox = dialogContent!.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(confirmationCheckbox).toBeTruthy();
    await act(async () => {
      confirmationCheckbox!.click();
    });
    await flushReact();
    expect(cancelApplyButton!.disabled).toBe(false);

    const footer = Array.from(dialogContent!.querySelectorAll("div"))
      .find((element) =>
        typeof element.className === "string"
        && element.className.includes("border-t")
        && element.textContent?.includes("Close"),
      );
    expect(footer?.className).toContain("bg-background");
  });
});
