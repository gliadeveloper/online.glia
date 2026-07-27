import { requireAdmin } from "@/lib/admin";
import { listCategories, listTags } from "@/lib/taxonomy-admin";

import { TaxonomyManager } from "./taxonomy-manager";

export default async function AdminTaxonomyPage() {
  await requireAdmin();

  const [categories, tags] = await Promise.all([listCategories(), listTags()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Taxonomy</h1>
        <p className="mt-1 text-sm text-zinc-500">카테고리와 태그를 관리하고 코스에 연결합니다.</p>
      </div>

      <TaxonomyManager categories={categories} tags={tags} />
    </div>
  );
}
