# Step 3: Gather Content Based on Mode

#### Mode: Conversation

1. **Analyze the conversation history** to extract:
   - Main topics discussed
   - Key decisions made
   - Important concepts explained
   - Action items or next steps
   - Relationships between ideas

2. **Create a visual hierarchy:**
   - Central theme/topic
   - Major branches for subtopics
   - Connections between related concepts
   - Callouts for important points

3. **Structure for Excalidraw:**
   - Title box at top
   - Main concept boxes arranged spatially
   - Arrows showing relationships
   - Text annotations for context

#### Mode: Code Architecture

1. **Discover project structure:**
   - Use Glob to find source files: `**/*.{ts,tsx,js,jsx,py,go,rs,java}`
   - Read key files to understand architecture
   - Identify main modules/packages

2. **Extract architecture elements:**
   - Entry points (main files, index files)
   - Core modules and their responsibilities
   - Dependencies between modules
   - External integrations (APIs, databases)

3. **Create architecture diagram:**
   - Boxes for modules/services
   - Arrows for dependencies/data flow
   - Groups for related components
   - Labels for key interfaces

4. **Ask for scope if large codebase:**
   ```
   This is a large codebase. Which area should I focus on?
   ○ Full overview - High-level architecture only
   ○ Specific directory - Choose a directory to visualize
   ○ Entry point flow - Trace from main entry point
   ```

#### Mode: Custom

1. **Use the description from arguments** or prompt:
   ```
   Describe what you'd like to sketch:
   > [user input]
   ```

2. **Parse the description** to identify:
   - Main entities/concepts
   - Relationships between them
   - Flow direction (if applicable)
   - Groupings or categories

3. **Generate appropriate diagram type:**
   - Flowchart for processes
   - Mind map for concepts
   - Architecture diagram for systems
   - Sequence for interactions
