type SkipLinksProps = {
  showPrimaryNav?: boolean;
  showContextNav?: boolean;
};

export function SkipLinks({
  showPrimaryNav = false,
  showContextNav = false,
}: SkipLinksProps) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        본문 바로가기
      </a>
      {showPrimaryNav && (
        <a href="#primary-nav" className="skip-link">
          주요 메뉴 바로가기
        </a>
      )}
      {showContextNav && (
        <a href="#context-nav" className="skip-link">
          이전 단계 바로가기
        </a>
      )}
    </>
  );
}
