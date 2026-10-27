"use client";

type ProductPriceFieldsProps = {
  listPrice: string;
  salePrice: string;
  onListPrice: (value: string) => void;
  onSalePrice: (value: string) => void;
  disabled?: boolean;
};

export function ProductPriceFields({
  listPrice,
  salePrice,
  onListPrice,
  onSalePrice,
  disabled,
}: ProductPriceFieldsProps) {
  const isFree = listPrice.trim() === "0" && (salePrice.trim() === "" || salePrice.trim() === "0");

  function setFree(checked: boolean) {
    if (checked) {
      onListPrice("0");
      onSalePrice("");
      return;
    }
    if (listPrice.trim() === "0") {
      onListPrice("99000");
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isFree}
          disabled={disabled}
          onChange={(event) => setFree(event.target.checked)}
        />
        <span>무료 상품</span>
      </label>
      {isFree ? (
        <p className="text-sm text-zinc-500">결제 없이 바로 수강·코칭을 받을 수 있습니다.</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">정가 (원)</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={listPrice}
            onChange={(event) => onListPrice(event.target.value)}
            required
            disabled={disabled || isFree}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">할인가 (원, 선택)</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={salePrice}
            onChange={(event) => onSalePrice(event.target.value)}
            disabled={disabled || isFree}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>
      </div>
    </div>
  );
}
