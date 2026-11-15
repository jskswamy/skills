# Step 3a: Location Query

1. Call `search_graph` with `semantic_query` (an array of strings, e.g. `["webhook validation"]`) set to a rephrased version of the user's question (extract the core concept from "where does webhook validation happen?"). Set `semantic_limit` to 5.
2. For the top 1-3 results, call `get_code_snippet` with the `qualified_name` to read the actual source.
3. Synthesize the answer: state which file:line the code lives in, what the function does, who calls it (from `search_graph` connected nodes if available), and any relevant context about why it exists.
