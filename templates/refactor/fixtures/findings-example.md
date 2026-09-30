# Refactoring Scan Findings — 2026-05-05T10-22-00Z

Scope: all  •  Base: HEAD  •  Project: claude-plugins

> Review this file. Edit, delete, or annotate findings.
> When done, return to Claude and reply "proceed" to file beads issues,
> or "abort" to stop without filing anything.
> Anything still in this file (architectural sections + promoted singletons)
> becomes a beads issue.

---

## 1. Extract Class: scattered JSON response writing
**Affected packages:** internal/api, internal/handlers
**Confidence:** high
**Suggested priority:** P2
<!-- evidence-refs: internal-api.yaml#cand-001, internal-api.yaml#cand-014, internal-handlers.yaml#cand-007 -->
<!-- promoted-from: none -->

### What's wrong

Three near-identical JSON response writers exist across `internal/api/`
and `internal/handlers/`. Each handler hand-rolls the same
Content-Type header, status write, and JSON encode sequence. There is
no shared response framework, so any change to the response shape
(e.g. adding request IDs, error envelope) has to be made in every
handler.

### Evidence

#### Current code

**`internal/api/users.go:writeJSONResponse` (line 45–58)**
```go
func writeJSONResponse(w http.ResponseWriter, status int, body any) error {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    return json.NewEncoder(w).Encode(body)
}
```

**`internal/handlers/auth.go:respond` (line 78–92)** — similarity 0.91
```go
func respond(w http.ResponseWriter, code int, payload interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(code)
    _ = json.NewEncoder(w).Encode(payload)
}
```

**`internal/api/orders.go:sendJSON` (line 23–34)** — similarity 0.88
```go
func sendJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}
```

### Suggested target shape

```go
// internal/framework/respond.go (new)
func WriteJSON(w http.ResponseWriter, status int, body any) error
```

After this lands:
- 3 call sites in `internal/api/` collapse to `framework.WriteJSON(w, 200, payload)`
- 1 call site in `internal/handlers/auth.go` similarly
- The 3 duplicate helpers can be deleted

---

## Singletons (won't be filed unless promoted to a section above)

| # | Pattern | Location | Candidate ID | Why no correlation |
|---|---|---|---|---|
| 1 | Parameterize Function | pkg/util/timefmt.go:34 | `pkg-util.yaml#cand-042` | Single isolated finding |
| 2 | Move Function | internal/api/orders.go:formatPrice | `internal-api.yaml#cand-002` | No siblings with same envy pattern |

To promote a singleton, copy its candidate ID into the `evidence-refs`
of a new section above, with `promoted-from: singletons table row N`.
The validator picks up the section the same way as any other
architectural issue.
