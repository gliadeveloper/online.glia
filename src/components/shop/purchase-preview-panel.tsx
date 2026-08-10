import type { PurchasePreviewLine } from "@/lib/shop-purchase-state";

type PurchasePreviewPanelProps = {
  preview: PurchasePreviewLine[];
};

export function PurchasePreviewPanel({ preview }: PurchasePreviewPanelProps) {
  if (preview.length === 0) {
    return null;
  }

  return (
    <div className="corp-trust-info-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">구매 시 적용</p>
      <ul className="mt-3 space-y-2.5">
        {preview.map((line) => (
          <li
            key={`${line.label}-${line.value}`}
            className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span className="shrink-0 font-semibold text-slate-900">{line.label}</span>
            <span className="text-slate-600">{line.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
