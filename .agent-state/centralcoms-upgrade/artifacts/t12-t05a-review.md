# T12 Independent T05A Migration/Schema Review

## Decision

**ACCEPT T05A.** The exact 10-file review unit conforms to accepted T04 and may advance to T05B. PostgreSQL runtime remains `BLOCKED_DEPENDENCY` and is not promoted by this static acceptance.

## Scope and contract findings

- Reviewed only the 10 T05A-owned files plus the frozen T04/T01 contract anchors, Drizzle config/previous snapshot for ancestry, and the commander state receipt.
- All seven additive tables and frozen columns are present across Drizzle, SQLite migration/bootstrap, PostgreSQL bootstrap/forward migration, and the generated snapshot.
- `case_events` includes `projection_patch_json`, reducer version 1, frozen event/actor checks, command/payload hashes, sequence/idempotency uniqueness, organization-scoped FKs, and update/delete rejection triggers.
- Required positive-ID, enum, unit/property, organization-grant, FK/delete, unique, and index rules match the contract. Cross-organization composite relations reject.
- DDL is additive: no DML/backfill, destructive legacy DDL, or existing-table rebuild was found. PostgreSQL trigger replacement touches only the new `case_events` surface.
- Journal entry 6 points to `0006_organization_case_foundation`; snapshot `prevId` equals the 0005 snapshot ID, adds exactly the seven foundation tables, and changes no legacy table definition.
- File territory is exactly 10 files. Human additions excluding the generated snapshot are 897, with 2 tracked deletions (899 total churn), within the 900-line cap. The state ledger records the generator receipt; independent `drizzle-kit check` and ancestry/structure checks passed.

## Independent evidence

- Focused Vitest: 3 files passed, 9 tests passed.
- SQLite migration path: 21 negative behavioral checks plus nullable-unique, `SET NULL`, and `foreign_key_check` checks passed.
- SQLite bootstrap path: the same independent behavioral matrix passed.
- `npx drizzle-kit check --config drizzle.config.ts`: passed.
- Static PostgreSQL parity test: passed as part of the focused suite; no runtime claim is made.
- Diff check: passed; DML hits 0; destructive legacy DDL hits 0; secret hits 0.
- Exact-file aggregate SHA-256 manifest hash: `3BB6B2B4288AC6BA98EBDBCB930EBA8A58A59CD84D76F26C74023E9D3681ED37`.
- Source/config/schema/migration/test edits by T12: none.

## Typed IPC

```json
{
  "task_id": "T12",
  "state": "accepted",
  "artifact": ".agent-state/centralcoms-upgrade/artifacts/t12-t05a-review.md",
  "evidence": {
    "reviewed_files": 10,
    "focused_tests": "3 files / 9 tests passed",
    "sqlite_independent_checks": "migration and bootstrap passed 21 negative checks each plus nullable uniques, SET NULL, and foreign_key_check",
    "drizzle_check": "passed",
    "snapshot_ancestry": "0006.prevId == 0005.id; exactly seven tables added; zero legacy table changes",
    "human_added_lines_excluding_snapshot": 897,
    "tracked_deleted_lines": 2,
    "dml_hits": 0,
    "destructive_legacy_ddl_hits": 0,
    "secret_hits": 0,
    "aggregate_sha256": "3BB6B2B4288AC6BA98EBDBCB930EBA8A58A59CD84D76F26C74023E9D3681ED37",
    "source_edits": []
  },
  "decision": "ACCEPT_T05A_ADVANCE_TO_T05B",
  "unknowns": ["PostgreSQL runtime migration, trigger, and constraint behavior lacks an approved executable harness"],
  "dependency": "T05B may start only after commander integrates this accepted T05A unit; PostgreSQL promotion remains blocked",
  "next_action": "Integrate T05A serially, then launch T05B transaction-adapter work"
}
```
