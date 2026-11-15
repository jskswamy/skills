# Step 3d: Onboarding Query

1. Call `get_architecture` with `project` set to the current project. Request aspects: `["packages", "services", "dependencies", "entry_points"]`.
2. Call `search_graph` with `semantic_query` (array of strings) to find existing implementations similar to what the user wants to add. Set `semantic_limit` to 5.
3. For the top 1-2 matches, call `trace_path` with `direction: "both"`, `depth: 2` to understand the interfaces and patterns.
4. Call `get_code_snippet` for key files the user will need to understand.
5. Synthesize: "To add [X], you'll want to look at how [similar thing] is implemented. Here's the pattern..." Include: files to model after, interfaces to implement, configuration to update, test patterns to follow.
