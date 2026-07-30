# /orders — 주문 내역

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/orders` · `/orders/[id]` |
| **Tab/Stack** | Stack |
| **목적** | 구매 영수증 |
| **진입** | 마이페이지 |

---

## 목록 row

- 상품명(들), 일시, 금액, OrderStatus pill

## 상세

- 라인별 상품, 결제, fulfillment 요약

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect login |
| 주문 0 | Empty + Shop |

---

## 구현 참고

- `src/app/(app)/(stack)/orders/page.tsx`
- `src/components/orders/order-list.tsx`
