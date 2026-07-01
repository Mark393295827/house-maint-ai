# CentralComs Landing Benchmark

Source reviewed: https://centralcoms.com/landing

## What CentralComs Does Well

- Leads with buyer economics: more doors, higher revenue per unit, same staff.
- Uses quantified proof immediately: vacancy reduction, autonomous ticket handling, on-time tour lift.
- Presents six concrete operating workflows instead of generic AI features.
- Shows AI as an autonomous coordinator across tenant support, vendor dispatch, leasing, knowledge hub, verification, and reporting.
- Explains why a full agent beats simple reminders or basic bots.
- Includes an ROI calculator and a demo-capture form on the same page.

## Fit For House Maint AI

| Benchmark | CentralComs angle | House Maint AI refinement |
|---|---|---|
| Hero promise | 3x more doors with same staff | Same promise, localized to Sanya property teams |
| Tenant support | SMS/email replies from lease and ticket history | WeChat Mini Program, Official Account, group chat, photo, voice, and video intake |
| Maintenance coordination | Vendor dispatch and closeout photos | Geo-ranked local 师傅 dispatch, structured lead packs, and WeChat Pay escrow readiness |
| Leasing automation | Lead qualification to signed lease | Not copied; outside current product scope |
| Knowledge hub | Org-wide audit trail | PIPL-aware ticket evidence, owner visibility, SLA, and worker whitelist scoring |
| Repair verification | Tenant follow-up before close | Added as a primary workflow and product metric |
| ROI calculator | Doors, staff, salary, savings | Added a China-market pilot model based on coordination release and DIY deflection |

## Implemented Changes

- Rebuilt `ShowcasePage` as a buyer-facing landing page instead of a developer portfolio.
- Added public `/landing` and public `/showcase` routes.
- Added workflow modules for intake, diagnosis, DIY deflection, dispatch, verification, and owner reporting.
- Added a manual-vs-bot-vs-agent comparison section.
- Added ROI calculator controls and output metrics.
- Added pilot-intake form with local confirmation state.
- Centralized the six-stage operating loop in `src/constants/operatingModel.ts` so app surfaces and AI orchestration reuse the same logic.
- Added focused tests for section rendering, ROI updates, and pilot form confirmation.
