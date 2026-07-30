# /shop — 상품 목록

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/shop` |
| **Tab/Stack** | Stack |
| **목적** | 판매 중 Product 탐색 |
| **진입** | 내학습 empty, 만료 CTA, 홈 featured |

---

## 카드

- 상품명, kind (VOD/코칭/번들), 가격
- → `/shop/[slug]`

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| 상품 0 | Empty |
| 비로그인 | 목록 OK |

---

## 구현 참고

- `src/app/(app)/(stack)/shop/page.tsx`
- `product-list-card.tsx`
