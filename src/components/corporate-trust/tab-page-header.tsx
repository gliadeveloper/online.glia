import "./tab-page-header-glia.css";

type TabPageHeaderProps = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  /** compact = coaching/learning tab; stack = stack L3 intro band */
  variant?: "default" | "compact" | "stack";
  /** Card-embedded header — no full-bleed margin */
  inCard?: boolean;
};

export function TabPageHeader({
  eyebrow,
  title,
  titleAccent,
  description,
  variant = "default",
  inCard = false,
}: TabPageHeaderProps) {
  const variantClass =
    variant === "compact"
      ? " tab-trust-header--compact"
      : variant === "stack"
        ? " tab-trust-header--stack"
        : "";

  const inCardClass = inCard ? " tab-trust-header--in-card" : "";

  return (
    <header className={`tab-trust-header${variantClass}${inCardClass}`}>
      <div className="tab-trust-header__inner">
        <p className="tab-trust-header__eyebrow">
          <span className="tab-trust-header__eyebrow-dot" aria-hidden="true" />
          {eyebrow}
        </p>

        <h2 className="tab-trust-header__title">
          {titleAccent ? (
            <>
              {title} <span className="tab-trust-header__title-accent">{titleAccent}</span>
            </>
          ) : (
            title
          )}
        </h2>
        <p className="tab-trust-header__desc">{description}</p>
      </div>
    </header>
  );
}
