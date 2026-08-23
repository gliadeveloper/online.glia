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
    <section id="pdp-creator" className="glia-pdp__section" aria-labelledby="pdp-creator-heading">
      <h2 id="pdp-creator-heading" className="glia-pdp__section-title">
        크리에이터
      </h2>

      <div className="glia-pdp__creator">
        <div className="glia-pdp__avatar" aria-hidden="true">
          {displayName(instructor).slice(0, 1)}
        </div>
        <div>
          <p className="glia-pdp__creator-name">{displayName(instructor)}</p>
          {instructor.profile?.headline ? (
            <p className="glia-pdp__creator-headline">{instructor.profile.headline}</p>
          ) : null}
          {bio ? <p className="glia-pdp__creator-bio">{bio}</p> : null}
        </div>
      </div>
    </section>
  );
}
