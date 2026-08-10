import type { CatalogProduct } from "@/lib/shop-products";

type ProductCreatorSectionProps = {
  instructor: NonNullable<CatalogProduct["items"][number]["course"]>["instructor"];
};

function displayName(user: { name: string | null; email: string }) {
  return user.name ?? user.email.split("@")[0] ?? "크리에이터";
}

export function ProductCreatorSection({ instructor }: ProductCreatorSectionProps) {
  const bio = instructor.profile?.bio ?? instructor.profile?.headline;

  return (
    <section id="pdp-creator" className="shop-pdp-block" aria-labelledby="pdp-creator-heading">
      <h2 id="pdp-creator-heading" className="shop-pdp-block__title">
        크리에이터
      </h2>

      <div className="shop-pdp-creator">
        <div className="shop-pdp-creator__avatar" aria-hidden="true">
          {displayName(instructor).slice(0, 1)}
        </div>
        <div className="shop-pdp-creator__body">
          <p className="shop-pdp-creator__name">{displayName(instructor)}</p>
          {instructor.profile?.headline ? (
            <p className="shop-pdp-creator__headline">{instructor.profile.headline}</p>
          ) : null}
          {bio ? <p className="shop-pdp-creator__bio">{bio}</p> : null}
        </div>
      </div>
    </section>
  );
}
