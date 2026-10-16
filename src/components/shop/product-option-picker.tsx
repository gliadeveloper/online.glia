import Link from "next/link";

import { formatKrw } from "@/lib/customer-labels";
import type { ShopProductOption } from "@/lib/product-groups";

export function ProductOptionPicker({
  options,
  selectedId,
  className,
}: {
  options: ShopProductOption[];
  selectedId: string;
  className?: string;
}) {
  return (
    <nav className={className ? `glia-pdp__options ${className}` : "glia-pdp__options"} aria-label="옵션">
      <p className="glia-pdp__options-label">옵션</p>
      <div className="glia-pdp__options-list">
        {options.map((option) => {
          const selected = option.productId === selectedId;
          return (
            <Link
              key={option.productId}
              href={`/shop/${option.productId}`}
              className={selected ? "glia-pdp__option glia-pdp__option--selected" : "glia-pdp__option"}
              aria-current={selected ? "true" : undefined}
            >
              <span>{option.label}</span>
              <strong>{formatKrw(option.price)}</strong>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
