# Grok Bot → Panupan33 capability absorption

Source product: [Grok Bot on Google Play](https://play.google.com/store/apps/details?id=ai.x.grok.bot) (`ai.x.grok.bot`)

All listed product abilities are now entries in `src/lib/boss-engine/capabilities.ts` under category **Grok Bot Parity** (+ Grok Skills + Boss Engine).

`GET /api/capabilities` version **0.2.0** exposes the full set.

## Product claims → Panupan ids

| Grok Bot claim | Capability id | Status policy |
|----------------|---------------|---------------|
| Hand off real work across tools/websites | `bot.handoff_real_work` | partial |
| Multi-step workflows (not chat drafts) | `bot.multi_step_workflow` | partial |
| Message coworker phone/desktop | `bot.message_like_coworker` | partial |
| Many bots in parallel | `bot.parallel_bots` | planned |
| Teach once → routine | `bot.teach_once_routine` | planned |
| Approve only when needed | `bot.approve_gate` | partial |
| Continues after laptop closed | `bot.cloud_computer` | partial |
| Login to portals/CRM/ads | `bot.connector_login` | planned |
| Sales outbound | `bot.sales_outbound` | planned |
| Talent scout | `bot.talent_scout` | planned |
| Inbox manager | `bot.inbox_manager` | planned |
| Expense manager | `bot.expense_manager` | planned |
| Invoice collector | `bot.invoice_collector` | planned |
| Account health | `bot.account_health` | planned |
| Bug reproduction | `bot.bug_reproduction` | partial |
| Competitive intel overnight | `bot.competitive_intel` | planned |
| Shared thread mobile↔desktop | `bot.shared_thread` | partial |
| Preference memory across handoffs | `bot.context_memory` | partial |
| Specialist lanes + coordinator | `bot.specialist_lanes` | planned |
| Mobile notifications | `bot.mobile_notifications` | planned |

## Also absorbed

- **12 Grok workspace skills** → category `Grok Skills` (design-ui, building-games, controls, …)
- **Boss engine** deep items → GitHub loop driver, task memory, evidence gate, SOUL, SUPER1

## Honest rule

Registry can list everything. **Implemented** only when code + evidence exist. Absorbing ≠ claiming finished product parity with Grok Bot mobile coworker.
