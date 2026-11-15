# Step 3b: Understanding Query

1. Call `get_architecture` with `project` set to the current project. Request aspects: `["packages", "services", "entry_points"]`.
2. Call `search_graph` with `semantic_query` (array of strings) to find the entry point or main function related to the user's question. Set `semantic_limit` to 5.
3. For the most relevant result, call `trace_path` with `direction: "outbound"`, `depth: 3` to trace the flow from that entry point.
4. For key nodes in the trace (up to 3), call `get_code_snippet` to read the source.
5. Synthesize a narrative explanation: start with the entry point, walk through the call chain, explain what each step does and why, and how data flows through the system. Reference file:line for each function mentioned.
