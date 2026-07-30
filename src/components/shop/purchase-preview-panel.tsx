import type { PurchasePreviewLine } from "@/lib/shop-purchase-state";

type PurchasePreviewPanelProps = {
  preview: PurchasePreviewLine[];
};

export function PurchasePreviewPanel({ preview }: PurchasePreviewPanelProps) {
  if (preview.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
      <p className="typo-subTypography12 font-medium text-[var(--color-text-secondary)]">구매 시 적용</p>
      <ul className="mt-2 space-y-2">
        {preview.map((line) => (
          <li key={`${line.label}-${line.value}`} className="flex flex-col gap-0.5 typo-subTypography11 sm:flex-row sm:gap-3">
            <span className="shrink-0 font-medium text-[var(--color-text-primary)]">{line.label}</span>
            <span className="text-[var(--color-text-secondary)]">{line.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
