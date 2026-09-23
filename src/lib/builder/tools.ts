/**
 * Builder tools — capability port from https://github.com/HeyPuter/builder
 * Backed by Puter FS / hosting when available; otherwise returns structured plans.
 */

export type BuilderToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  builderSource: true;
};

const pathProp = { type: "string", minLength: 1, maxLength: 2000 };
const textProp = { type: "string", maxLength: 500000 };

export function nativeBuilderTools(): BuilderToolDef[] {
  return [
    {
      name: "builder_write",
      description: "Create or overwrite a project file (full content). Prefer builder_edit for small changes.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: { path: pathProp, content: textProp },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_edit",
      description: "Replace an exact old_content section with new_content in an existing file (fast partial edit).",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: { path: pathProp, old_content: textProp, new_content: textProp },
        required: ["path", "old_content", "new_content"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_multi_edit",
      description: "Apply several exact replacements to the same file in one atomic pass.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          path: pathProp,
          edits: {
            type: "array",
            items: {
              type: "object",
              properties: { old_content: textProp, new_content: textProp },
              required: ["old_content", "new_content"],
            },
          },
        },
        required: ["path", "edits"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_read",
      description: "Read a project file as text.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: { path: pathProp },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_readdir",
      description: "List files/directories under a project path.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: { path: pathProp },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_search_files",
      description: "Search project text for a query string; returns matching paths + line snippets.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 1, maxLength: 500 },
          path: pathProp,
          max_results: { type: "integer", minimum: 1, maximum: 50 },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_delete",
      description: "Delete a project file or empty directory.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: { path: pathProp },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_mkdir",
      description: "Create a directory (recursive).",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: { path: pathProp },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_update_preview",
      description: "Refresh the live preview after file changes. Call after UI edits.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          entry: { type: "string", description: "Entry HTML path, e.g. index.html" },
          note: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "builder_publish_site",
      description: "Publish the project folder to a public Puter hosting URL.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          subdomain: { type: "string", minLength: 1, maxLength: 80 },
          rootDir: pathProp,
        },
        required: ["subdomain", "rootDir"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_suggest_next_steps",
      description: "End-of-turn: 4–5 next-step chips the app does not already have.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                prompt: { type: "string" },
              },
              required: ["label", "prompt"],
            },
          },
        },
        required: ["suggestions"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_clarify",
      description: "Ask the user focused clarifying questions before building.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 5,
          },
        },
        required: ["questions"],
        additionalProperties: false,
      },
    },
    {
      name: "builder_todo",
      description: "Track a short build checklist for complex apps.",
      builderSource: true,
      inputSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                status: { type: "string", enum: ["pending", "doing", "done"] },
              },
              required: ["id", "text", "status"],
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  ];
}

export function isBuilderTool(name: string): boolean {
  return name.startsWith("builder_");
}
