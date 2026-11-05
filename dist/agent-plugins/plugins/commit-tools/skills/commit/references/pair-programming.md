# Step 6: Pair Programming

## Selecting and saving a co-author

1. Read saved pairs from `.claude/git-commit.local.md`

2. If pairs exist, show selection:
   ```
   Select co-author for this commit:
   ○ John Doe <john@example.com>
   ○ Jane Smith <jane@example.com>
   ○ Add new pair - Enter new co-author details
   ```

3. If "Add new pair" selected OR no pairs saved:
   ```
   Enter co-author name:
   > [user input]

   Enter co-author email:
   > [user input]

   Save this pair for future use?
   ○ Yes
   ○ No
   ```

4. If saving, update `.claude/git-commit.local.md`:
   ```yaml
   ---
   commit_style: classic
   pairs:
     - name: "John Doe"
       email: "john@example.com"
     - name: "New Person"
       email: "new@example.com"
   ---
   ```

5. Store selected co-author for commit message generation
