# HeyPuter/builder → Boss port

Source: https://github.com/HeyPuter/builder (Apache-2.0)

## Capabilities cloned into panupanboss chat

| Builder tool | Boss tool |
|--------------|-----------|
| write | `builder_write` |
| edit | `builder_edit` |
| multi_edit | `builder_multi_edit` |
| read / readdir | `builder_read` / `builder_readdir` |
| search_files | `builder_search_files` |
| delete / mkdir | `builder_delete` / `builder_mkdir` |
| update_preview | `builder_update_preview` |
| publish_site | `builder_publish_site` |
| SuggestNextSteps | `builder_suggest_next_steps` |
| clarify / todo | `builder_clarify` / `builder_todo` |

## Wiring

- Tools: `src/lib/builder/tools.ts` + `execute.ts`
- Prompt: `src/lib/builder/prompt.ts` (injected when user asks to build a site/app)
- Loader: `puter-tool-loader` includes native builder tools
- Agent: `agent-loop` prepends builder prompt on build intents

## Project root

Default Puter path: `/BossBuilder/current`
