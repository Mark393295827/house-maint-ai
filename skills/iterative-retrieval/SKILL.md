---
name: Iterative Retrieval Pattern
description: Pattern for progressive context refinement and search
---

# Iterative Retrieval Pattern

## The Problem
Standard retrieval is often "one-and-done". You ask a question, the agent searches once, and tries to answer. This fails for:
- Vague initial queries
- Deeply nested codebases
- Complex dependencies

## The Solution: Iterative Retrieval
A 4-phase loop that mimics human research behavior:

1. **DISPATCH**: Initial broad search based on keywords
2. **EVALUATE**: Assess retrieved context relevance
3. **REFINE**: Narrow scope based on findings (or expand if nothing found)
4. **LOOP**: Repeat until high confidence or depth limit

## Phase 1: DISPATCH
Start with broad, low-cost searches.

```bash
# Don't start with reading files. Start with finding them.
fd -t f "Authentication"
grep -r "login" .
```

## Phase 2: EVALUATE
Check the results. Do they look promising?

* "Found 50 files matching 'auth'..." -> Too broad. **Action: Refine**
* "Found 0 files..." -> Too specific. **Action: Expand**
* "Found 3 relevant files..." -> Good. **Action: Read**

## Phase 3: REFINE
Adjust the query based on Phase 2.

* **Broaden:** `grep "auth" -> grep "login"`
* **Narrow:** `fd "auth" -> fd "auth" src/services`
* **Pivot:** "Oh, they use 'session' not 'auth'" -> `grep "session"`

## Phase 4: LOOP
Repeat 1-3 until you have the answer or hit a limit (usually 3-5 hops).

## Practical Examples

### Example 1: Bug Fix Context
**User:** "Fix the login bug where it hangs."

1. **Iter 1:** `grep "login" src/` -> Finds `src/auth/login.ts`
2. **Iter 2:** Read `src/auth/login.ts` -> Sees call to `userService.validate()`
3. **Iter 3:** Find definition of `userService` -> `src/services/user.ts`
4. **Iter 4:** Read `validate()` in `src/services/user.ts` -> Found the infinite loop.

**Result:** Pinpointed bug across 2 files without reading the whole repo.

### Example 2: Feature Implementation
**User:** "Add a new payment method."

1. **Iter 1:** `fd "payment"` -> `src/payments/stripe.ts`, `src/payments/paypal.ts`
2. **Iter 2:** Read `src/payments/stripe.ts` to understand the interface.
3. **Iter 3:** Search for usage: `grep -r "PaymentProvider"` -> `src/core/checkout.ts`
4. **Iter 4:** Plan implementation based on existing provider pattern.

## Integration with Agents
The **Planner** agent uses this loop naturally.
The **Architect** agent uses this to map dependencies.

## Best Practices
- **Read file outlines** (`grep -n` or custom tools) before reading full content.
- **Trace imports** to find hidden dependencies.
- **Timebox** your retrieval (e.g. "Spend max 5 mins searching").

## Related
- `strategic-compact`: How to manage the context you find.
- `continuous-learning-v2`: Remembering where things are.
