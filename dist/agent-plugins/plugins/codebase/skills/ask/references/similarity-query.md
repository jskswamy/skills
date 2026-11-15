# Step 3c: Similarity Query

1. Call `search_graph` with `semantic_query` (array of strings) describing the function or concept the user is asking about. Set `semantic_limit` to 10.
2. Filter results: skip results from the same file. Group by package.
3. For the top 3-5 matches, call `get_code_snippet` to read the actual source and confirm similarity.
4. Synthesize: describe each match, explain how it's similar and how it differs, and note which ones could potentially be unified.
