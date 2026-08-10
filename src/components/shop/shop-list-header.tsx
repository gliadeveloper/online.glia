type ShopListHeaderProps = {
  pageTitle: string;
  title: string;
  titleAccent: string;
  description: string;
};

export function ShopListHeader({ pageTitle, title, titleAccent, description }: ShopListHeaderProps) {
  return (
    <header className="shop-trust-header">
      <div className="shop-trust-header__blob shop-trust-header__blob--indigo" aria-hidden="true" />
      <div className="shop-trust-header__blob shop-trust-header__blob--violet" aria-hidden="true" />

      <div className="shop-trust-header__inner">
        <div className="shop-trust-header__copy">
          <p className="shop-trust-header__eyebrow">
            <span className="shop-trust-header__eyebrow-dot" aria-hidden="true" />
            클래스 스토어
          </p>

          <h1 className="shop-trust-page-label max-lg:sr-only">{pageTitle}</h1>
          <h2 className="shop-trust-header__title">
            {title}{" "}
            <span className="corp-trust-gradient-text">{titleAccent}</span>
          </h2>
          <p className="shop-trust-header__desc">{description}</p>

          <ul className="shop-trust-header__pills" aria-label="상품 카테고리">
            <li className="shop-trust-header__pill">VOD 강의</li>
            <li className="shop-trust-header__pill">1:1 코칭</li>
            <li className="shop-trust-header__pill">올인원 번들</li>
          </ul>
        </div>

        <div className="shop-trust-header__visual corp-trust-float" aria-hidden="true">
          <div className="shop-trust-header__iso-wrap">
            <div className="shop-trust-header__iso-card">
              <div className="shop-trust-header__iso-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <p className="shop-trust-header__iso-label">Premium Learning</p>
              <div className="shop-trust-header__iso-bars">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
