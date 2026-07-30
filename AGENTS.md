<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guidelines

## `(app)` UI — App Tone v1

Customer-facing routes under `src/app/(app)/` follow **App Tone v1** (neutral chrome + subtle motion).

- **Quick ref:** [docs/visual-direction.md](docs/visual-direction.md)
- **Full tokens & patterns:** [docs/design-system.md](docs/design-system.md)
- **Color palette:** [docs/colors.md](docs/colors.md)
- **Typography:** [docs/typography.md](docs/typography.md)
- **Chrome policy:** [docs/navigation-chrome-policy.md](docs/navigation-chrome-policy.md)
- **Cursor rule:** `.cursor/rules/app-visual-direction.mdc`

When the user says **「App Tone v1」**, **「design-system 따라」**, or **「바텀탭 톤」**, apply the above without re-asking for color/motion direction.

**Scope:** `(app)` + related components only — not `admin`, `(customer)`, or `login` unless explicitly requested.
