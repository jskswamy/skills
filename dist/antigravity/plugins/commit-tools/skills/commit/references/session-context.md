# Step 6b: Session Context Extraction

## What to extract from the conversation

**What to look for in the conversation:**

| Context Type | What to Extract |
|--------------|-----------------|
| **User Intent** | What did the user originally ask for? What problem were they solving? |
| **Decisions Made** | What approaches were discussed? Why was this implementation chosen? |
| **Trade-offs** | What alternatives were considered and rejected? |
| **Requirements** | Any specific constraints or requirements mentioned? |
| **References** | Issue numbers, ticket IDs, PR references, or external links discussed? |

**Extraction process:**

1. **Identify the original request**
   - Find the user's initial message that led to these changes
   - Note the problem being solved or feature being added
   - Capture any specific requirements stated

2. **Trace key decisions**
   - What implementation approaches were discussed?
   - Why was the current approach chosen over alternatives?
   - Were there any trade-offs mentioned?

3. **Gather important context**
   - Issue/ticket numbers mentioned (e.g., "fixes #123", "JIRA-456")
   - Breaking changes or migration notes discussed
   - Performance or security considerations
   - Dependencies or prerequisites mentioned

4. **Note user clarifications**
   - Any follow-up questions and answers
   - Scope adjustments or refinements
   - Explicit preferences stated by the user

**Example extraction:**

If the conversation included:
> User: "The login page crashes when users enter invalid emails. Can you add validation?"
> Claude: "I'll add email validation with regex. Should I also add rate limiting?"
> User: "Yes, add rate limiting too - we've been getting bot attacks"

Extract:
- **Intent:** Fix login crash on invalid emails
- **Decision:** Added email validation with regex
- **Additional context:** Rate limiting added due to bot attacks
- **Problem:** Users experiencing crashes, security concern with bots

**Use this context to:**
- Write a commit body that explains the "why" not just the "what"
- Include relevant background that future developers need
- Reference issues or decisions from the conversation
- Capture the reasoning that would otherwise be lost
