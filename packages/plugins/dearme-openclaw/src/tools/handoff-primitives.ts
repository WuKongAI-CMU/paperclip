import {
  DEARME_OUTBOUND_TOOL_BINDINGS,
  DEARME_OUTBOUND_TOOLS,
  type DearMeOutboundToolName,
} from "./types.js";

export const DEARME_EMPLOYEE_HANDOFF_PRIMITIVE_IDS = [
  "publish_social_post",
  "send_linkedin_message",
  "send_telegram_message",
  "send_imessage",
  "send_email",
  "publish_site_update",
  "start_paid_campaign",
] as const;

export type DearMeEmployeeHandoffPrimitiveId =
  (typeof DEARME_EMPLOYEE_HANDOFF_PRIMITIVE_IDS)[number];

export type DearMeEmployeeHandoffPrimitive = Readonly<{
  id: DearMeEmployeeHandoffPrimitiveId;
  toolName: DearMeOutboundToolName;
  gate: "publish" | "send" | "deploy" | "spend";
  channel: string;
  channelLabel: string;
  voiceGateRequired: boolean;
  employeeRole: "content_producer" | "opportunity_scout" | "portfolio_builder" | "growth_analyst";
  employeeLabel: "Content Producer" | "Opportunity Hunter" | "Brand Site Builder" | "Growth Analyst";
  actionLabel: string;
  externalActionStatusLabel: "External action not run";
}>;

const PRIMITIVE_DETAILS: Record<
  DearMeOutboundToolName,
  Omit<DearMeEmployeeHandoffPrimitive, "toolName" | "gate" | "channel" | "voiceGateRequired">
> = {
  post_x: {
    id: "publish_social_post",
    channelLabel: "X",
    employeeRole: "content_producer",
    employeeLabel: "Content Producer",
    actionLabel: "Publish post",
    externalActionStatusLabel: "External action not run",
  },
  send_linkedin_dm: {
    id: "send_linkedin_message",
    channelLabel: "LinkedIn",
    employeeRole: "opportunity_scout",
    employeeLabel: "Opportunity Hunter",
    actionLabel: "Send LinkedIn message",
    externalActionStatusLabel: "External action not run",
  },
  send_telegram_message: {
    id: "send_telegram_message",
    channelLabel: "Telegram",
    employeeRole: "opportunity_scout",
    employeeLabel: "Opportunity Hunter",
    actionLabel: "Send Telegram message",
    externalActionStatusLabel: "External action not run",
  },
  send_imessage: {
    id: "send_imessage",
    channelLabel: "iMessage",
    employeeRole: "opportunity_scout",
    employeeLabel: "Opportunity Hunter",
    actionLabel: "Send iMessage",
    externalActionStatusLabel: "External action not run",
  },
  send_email: {
    id: "send_email",
    channelLabel: "Email",
    employeeRole: "opportunity_scout",
    employeeLabel: "Opportunity Hunter",
    actionLabel: "Send email",
    externalActionStatusLabel: "External action not run",
  },
  deploy_site: {
    id: "publish_site_update",
    channelLabel: "Website",
    employeeRole: "portfolio_builder",
    employeeLabel: "Brand Site Builder",
    actionLabel: "Publish site update",
    externalActionStatusLabel: "External action not run",
  },
  create_meta_campaign: {
    id: "start_paid_campaign",
    channelLabel: "Meta Ads",
    employeeRole: "growth_analyst",
    employeeLabel: "Growth Analyst",
    actionLabel: "Start paid campaign",
    externalActionStatusLabel: "External action not run",
  },
};

export const DEARME_EMPLOYEE_HANDOFF_PRIMITIVES = DEARME_OUTBOUND_TOOLS.map((toolName) => {
  const binding = DEARME_OUTBOUND_TOOL_BINDINGS[toolName];
  return {
    ...PRIMITIVE_DETAILS[toolName],
    toolName,
    gate: binding.gate,
    channel: binding.channel,
    voiceGateRequired: binding.voiceGateRequired,
  };
}) satisfies ReadonlyArray<DearMeEmployeeHandoffPrimitive>;

const PRIMITIVES_BY_TOOL = new Map<DearMeOutboundToolName, DearMeEmployeeHandoffPrimitive>(
  DEARME_EMPLOYEE_HANDOFF_PRIMITIVES.map((primitive) => [primitive.toolName, primitive]),
);

export function dearMeEmployeeHandoffPrimitiveForTool(
  toolName: string | null | undefined,
): DearMeEmployeeHandoffPrimitive | null {
  if (!toolName) return null;
  return PRIMITIVES_BY_TOOL.get(toolName as DearMeOutboundToolName) ?? null;
}
