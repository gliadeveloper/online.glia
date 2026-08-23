import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachProductEditPanel } from "@/components/coach/coach-product-panels";
import { requireCoach } from "@/lib/coach";
import { assertCoachOwnsProduct, getCoachProductCatalog } from "@/lib/coach-commerce";

type PageProps = { params: Promise<{ id: string }> };

export default async function CoachProductDetailPage({ params }: PageProps) {
  const user = await requireCoach();
  const { id } = await params;

  let product;
  try {
    product = await assertCoachOwnsProduct(user.id, id);
  } catch {
    notFound();
  }

  const catalog = await getCoachProductCatalog(user.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/coach/products" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 상품 목록
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{product.title}</h1>
        <p className="mt-1 text-zinc-600">가격·노출·연결 콘텐츠를 수정합니다.</p>
      </div>

      <CoachProductEditPanel
        productId={product.id}
        kind={product.kind}
        title={product.title}
        description={product.description}
        descriptionMetadata={product.descriptionMetadata}
        supplies={product.supplies ?? []}
        listPrice={product.listPrice}
        salePrice={product.salePrice}
        isActive={product.isActive}
        items={product.items}
        courses={catalog.courses}
        offerings={catalog.offerings}
      />
    </div>
  );
}
