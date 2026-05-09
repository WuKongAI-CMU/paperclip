/**
 * OpenAI native function definitions for the DearMe AI proxy.
 *
 * Lineage: ported from research-captured production proxy
 * (`buildToolDefinitions()` at line 1031 of the captured runloop
 * server.js, 6 verbatim function defs). Names, descriptions,
 * parameter shapes, and required-fields lists are preserved
 * because plugin agents and downstream tool dispatchers depend
 * on the exact contract.
 *
 * These definitions are independent of any specific LLM provider.
 * The proxy translates them to Anthropic `tools` and OpenAI
 * `tools` shapes at the wire.
 */

export interface OpenAiFunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description?: string;
        }
      >;
      required?: ReadonlyArray<string>;
    };
  };
}

export const DEARME_TOOL_DEFINITIONS: ReadonlyArray<OpenAiFunctionDefinition> = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task for another agent to execute",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: {
            type: "string",
            description: "Detailed task description",
          },
          agent_id: {
            type: "integer",
            description: "Agent ID to assign (optional)",
          },
          priority: { type: "integer", description: "Priority 1-10" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description:
        "Search company memory (domain knowledge, preferences, patterns)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_company_documents",
      description:
        "Get all company documents (mission, product_overview, brand_voice, etc)",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_report",
      description: "Create a structured report",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Report type" },
          title: { type: "string", description: "Report title" },
          content: {
            type: "object",
            description: "Report content (JSON object)",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "content_generate",
      description:
        "Generate content (blog posts, social media, marketing copy)",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Content generation prompt",
          },
          type: { type: "string", description: "Content type" },
          tone: { type: "string", description: "Tone/voice" },
        },
        required: ["prompt"],
      },
    },
  },
];

export function getFunctionDefinition(
  name: string,
): OpenAiFunctionDefinition | undefined {
  return DEARME_TOOL_DEFINITIONS.find((def) => def.function.name === name);
}

export const DEARME_TOOL_NAMES = DEARME_TOOL_DEFINITIONS.map(
  (def) => def.function.name,
) as ReadonlyArray<string>;
