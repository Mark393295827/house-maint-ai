# Product Operating Model

House Maint AI now uses one operating loop across marketing, consumer workflow, enterprise dashboard, and AI orchestration:

1. Intake: WeChat-native tenant, owner, and manager reports with photo, voice, video, and text context.
2. Diagnosis: AI fault classification, urgency, privacy check, and landlord-versus-tenant responsibility.
3. Deflection: Low-risk DIY resolution before dispatch to reduce wasted site visits.
4. Dispatch: Geo-ranked local worker matching with tools, materials, and pricing context.
5. Verification: Completion photo review, tenant follow-up, and relapse reopening.
6. Reporting: Owner-ready SLA, cost, quality, and compliance reporting.

The shared implementation lives in `src/constants/operatingModel.ts`. Product surfaces should import from that model instead of redefining their own stage names, metrics, or ROI math.

## Design Rules

- The buyer-facing promise is operational leverage: same property team, more doors, fewer manual coordination loops.
- UI copy should show the work the AI completes, not only the model or technology used.
- Consumer UI should explain where a case is in the operating loop.
- Enterprise UI should expose throughput, deflection, dispatch, verification, and owner reporting as primary metrics.
- AI configuration should default to the same loop, then let managers customize agents and gates.

## Benchmark Assumptions

- 38% of property-manager coordination capacity can be released by AI handling routine Q&A, evidence gathering, worker chasing, and reporting.
- 22% of low-risk repair attempts can be deflected before a truck roll.
- Each avoided unnecessary site visit is modeled at RMB160.
- Per-door SaaS benchmark remains RMB10/month for the initial Sanya property manager segment.
