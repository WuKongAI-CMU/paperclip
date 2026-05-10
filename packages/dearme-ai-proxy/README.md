# @paperclipai/dearme-ai-proxy

DearMe AI proxy contract — types, function definitions, and wire-protocol
constants for the proxy that sits in front of every LLM call DearMe makes.

This package exports the **contract**. The HTTP server implementation
(routes, model picker, cache layer, cost-ledger writer) is delivered in a
follow-up ticket (DM-145) and ingests these types.

## Why a proxy

DearMe role plugins must not pick a model directly. The proxy centralizes:

1. **Cost attribution** — every call is tagged with `task` (OpenAI
   side channel) or `X-Subscription-ID` (Anthropic side channel). The
   proxy emits a `CostLedgerEvent` per terminal call.
2. **Model routing** — `complexity` 1-10 → fast / balanced / deep tier.
   Plugins assert intent ("this is a 4 — drafting a tweet"), the proxy
   picks the model.
3. **Prompt cache economics** — the proxy applies Anthropic prompt-cache
   structure to drive cache-read ratio toward 90% on the steady-state
   chief-of-staff loop.
4. **Brand identity** — keys start with `dm_sk_`. Substrate keys
   (`sk-ant-…`, `sk-…`) are never exposed to plugins.

## Key exports

```ts
import {
  DEARME_TOOL_DEFINITIONS, // 6 production-verified OpenAI function defs
  DEARME_TOOL_NAMES,
  getFunctionDefinition,
  markDearMePromptCacheBreakpoint,
  normalizeDearMeProxyUsage,
  buildDearMeCostLedgerEvent,
  DM_API_KEY_PREFIX,         // "dm_sk_"
  DM_PROXY_HEADERS,          // { task, subscriptionId, ... }
  isDearMeApiKey,
  type AgentRunRequest,
  type AgentRunResponse,
  type CostLedgerEvent,
  type OpenAiChatRequestExtensions,
  type AnthropicMessagesRequestExtensions,
} from "@paperclipai/dearme-ai-proxy";
```

## Lineage

The 6 function definitions, dual-protocol design, cost-attribution
side-channels, and `agent/run` endpoint shape are ported from research-
captured production behavior in DearMe's internal AI runtime. Voice rules,
state machines, and tool sequences live in
`@paperclipai/dearme-agent-prompts`. This package owns only the proxy wire
contract.

See `docs/dearme/PRODUCT-ARCHITECTURE.md` for how this fits into the
overall topology.
