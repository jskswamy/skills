# Step 4: Load Style Configuration

Read style definitions from `<package-root>/templates/sketch-note/styles/` based on preferences. Resolve the package root as the nearest ancestor containing `registry.json` or `package.json`:

**Map preferences to Excalidraw properties:**

| Preference | Excalidraw Property |
|------------|---------------------|
| `background_color: white` | `appState.viewBackgroundColor: "#ffffff"` |
| `background_color: cream` | `appState.viewBackgroundColor: "#faf8f5"` |
| `background_color: light-gray` | `appState.viewBackgroundColor: "#f5f5f5"` |
| `background_color: light-blue` | `appState.viewBackgroundColor: "#f0f8ff"` |
| `background_color: light-yellow` | `appState.viewBackgroundColor: "#fffef0"` |
| `roughness: hand-drawn` | `roughness: 2` |
| `roughness: sketchy` | `roughness: 1` |
| `roughness: clean` | `roughness: 0` |
| `stroke_width: thin` | `strokeWidth: 1` |
| `stroke_width: medium` | `strokeWidth: 2` |
| `stroke_width: bold` | `strokeWidth: 4` |

**Visual effects mapping:**
- `shadow`: Add `shadow` element property
- `glow`: Lighter stroke color with blur effect simulation
- `cursive`: Use `fontFamily: 3` (Virgil handwriting font)

**Resolution mapping:**
- `standard`: Default canvas size
- `high`: 2x element scaling
- `4k`: 4x element scaling
