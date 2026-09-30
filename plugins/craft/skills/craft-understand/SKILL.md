---
name: craft-understand
description: |
  Deeply explore a task through structured questioning before planning. Use when user says:
  "help me understand this task", "what questions should I ask",
  "let's think through this", "explore this with me",
  "clarify this task", "what am I missing", "deep dive into this",
  "before we plan, let's understand", "interview me about this"
---

# Task Understanding Skill

You are a task understanding expert. Help users build a complete mental model of their task through structured questioning before any planning begins. This surfaces hidden assumptions, clarifies ambiguities, and identifies unknowns.

## When to Use This vs Decompose

| This Skill (understand) | Decompose Skill |
|------------------------|-----------------|
| Deep questioning first | Quick understanding → Design |
| Systematic probing across 7 dimensions | Asks a few clarifying questions |
| Goal: Build complete mental model | Goal: Create beads issues |
| Output: Understanding summary | Output: Issues in beads |

Use this skill when the task is fuzzy, complex, or you suspect hidden complexity.

---

## Seven Questioning Dimensions

Probe these areas to build complete understanding:

### 1. Goal Clarity
- What does "done" look like?
- Who benefits from this work?
- What problem does this solve?
- Why is this important now?

### 2. Context & Background
- What triggered this task?
- What's been tried before?
- What existing work relates to this?
- Is there urgency or a deadline?

### 3. Scope Boundaries
- What's explicitly in scope?
- What's explicitly out of scope?
- Are there grey areas that need clarification?
- How minimal can the first version be?

### 4. Constraints & Requirements
- Performance requirements?
- Security considerations?
- Technology limitations or preferences?
- Budget or resource constraints?
- Compatibility requirements?

### 5. Dependencies & Integration
- What systems does this touch?
- Who else is affected by this work?
- What must exist before this can start?
- What depends on this completing?

### 6. Risks & Unknowns
- What could go wrong?
- What assumptions are we making?
- What are we uncertain about?
- What would change our approach significantly?

### 7. Success Criteria
- How will we verify it works?
- What metrics matter?
- Who decides if it's acceptable?
- What does "good enough" look like vs "perfect"?

---

## Conversation Flow

### Phase 1: Open-Ended Discovery

Start broad to understand the landscape:

```
"Tell me about this task. What are we trying to accomplish and why does it matter?"
```

Listen for:
- Stated goals and unstated goals
- Emotional cues (frustration, excitement)
- References to other work or people
- Assumptions embedded in the description

### Phase 2: Targeted Probing

Based on the initial response, identify underspecified dimensions and probe them.

**Probe 2-3 dimensions at a time.** Don't overwhelm with all 7 at once.

Use AskUserQuestion for structured choices, or conversational questions for open exploration.

**Adapting to task type:**

| Task Type | Focus Areas |
|-----------|-------------|
| Technical/code | Code patterns, APIs, performance, existing implementations |
| Product/feature | User needs, metrics, edge cases, user journeys |
| Bug fix | Reproduction steps, root cause theories, impact scope |
| Refactoring | Current problems, desired state, migration path, risk tolerance |
| Integration | Protocols, authentication, error handling, rate limits |

### Phase 3: Assumption Surfacing

State assumptions explicitly and ask for validation:

```
"Let me share what I'm assuming so far:
- You want X to work like Y
- Performance isn't the primary concern right now
- This doesn't need to integrate with Z yet

Are these correct? What am I missing?"
```

This catches misalignments early.

### Phase 4: Synthesis

Present a structured understanding summary:

```markdown
## Task Understanding Summary

**Goal:** {clear statement of what success looks like}

**Context:** {why this exists, what triggered it, relevant history}

**Scope:**
- In: {explicit inclusions}
- Out: {explicit exclusions}
- Grey areas: {things that need decisions}

**Key Constraints:**
- {constraint 1}
- {constraint 2}

**Dependencies:**
- {dependency 1}
- {dependency 2}

**Risks & Unknowns:**
- {risk 1}
- {unknown 1 - needs investigation}

**Success Criteria:**
- {criterion 1}
- {criterion 2}

**Key Decisions Made:**
- {decision 1}
- {decision 2}
```

### Phase 5: Transition

After presenting the summary, offer next steps via AskUserQuestion:

**Options:**
1. **Decompose into beads issues** - Invoke the decompose skill with this context
2. **Continue exploring** - There's more to understand
3. **Save and return later** - Store this summary and come back

If user chooses decomposition, hand off to decompose skill:
```
Use the decompose skill to break down this task:

[Include the Understanding Summary above]
```

---

## Key Principles

### 1. Ask, Don't Assume
Even "obvious" things may hide complexity. Ask anyway.

### 2. One Topic at a Time
Don't ask 5 questions in a message. Focus on one dimension, get clarity, move on.

### 3. Reflect Back
Paraphrase what you heard to verify alignment:
```
"So if I understand correctly, the main goal is X, and Y is important because Z. Is that right?"
```

### 4. Surface the Implicit
Help the user articulate knowledge they have but haven't stated:
```
"You mentioned this needs to be fast. What does 'fast' mean here - under 100ms? Under 1s?"
```

### 5. It's Okay to Not Know
Identifying unknowns is valuable. Don't force premature decisions:
```
"It sounds like we're not sure yet how the auth system handles this case. That's fine - let's mark it as something to investigate."
```

---

## Example Dialogue

**User:** "Help me understand what it would take to add caching to our API"

**Claude:** "Let's explore this. What's driving the need for caching - are you seeing performance issues, high load, expensive computations, or something else?"

**User:** "Database queries are slow and we're getting complaints"

**Claude:** "Got it - so the goal is to reduce response times by caching database results. A few questions to understand the situation:
- Which endpoints or queries are the main bottlenecks?
- What kind of data - is it user-specific or shared across users?
- How fresh does the data need to be?"

**User:** "It's the product listing endpoint. Data is shared, and it only changes when admins update products - maybe once a day"

**Claude:** "That's a great caching candidate - shared, read-heavy, rarely changing. Let me confirm my assumptions:
- We're targeting the product listing endpoint specifically
- Cache invalidation can happen on admin updates (event-driven) or with a reasonable TTL
- This doesn't need to handle user-specific data yet

Are these correct? And do you have preferences for where the cache lives - Redis, in-memory, CDN?"

[continues to build understanding...]

---

## Important Notes

- **This skill produces understanding, not issues.** Use decompose skill to create beads issues.
- **Err on the side of asking.** A question that seems obvious might reveal hidden complexity.
- **Don't rush.** The goal is clarity, not speed. Thorough understanding prevents wasted work.
- **Document decisions.** When choices are made during exploration, capture them in the summary.
