<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guidelines

## Policy hub

**전체 정책 한 페이지:** [docs/policies.md](docs/policies.md) — 구역·역할·Commerce·Coach·Live·문서 인덱스.  
**User 화면 명세:** [docs/screens/README.md](docs/screens/README.md) — URL·구성·상태 매트릭스·플로우. 작성 틀: [SCREEN-SPEC-GUIDE.md](docs/screens/SCREEN-SPEC-GUIDE.md).

## `(app)` UI — Corporate Trust

Customer-facing routes under `src/app/(app)/` follow **Corporate Trust** (indigo gradient chrome + Plus Jakarta typography).

- **Scope root:** `src/components/corporate-trust/corp-trust-scope.tsx` — `.corp-trust` + shared tokens
- **UI primitives:** `src/components/corporate-trust/app-trust-ui.tsx` — TrustButton, TrustInput, etc.
- **Page headers:** `src/components/corporate-trust/tab-page-header.tsx`
- **Shell chrome:** `src/components/shell/*-trust.css` — nav, header, back nav
- **Shop (stack):** `src/components/shop/shop-trust-root.tsx` — nested trust scope
- **Auth:** `src/components/auth/corporate-trust/` — separate trust scope

When the user says **「Corporate Trust」**, **「corp-trust」**, or **「design-system 따라」**, apply the above without re-asking for color/motion direction.

**Scope:** `(app)` + related components only — not `admin`, `(customer)` unless explicitly requested.
