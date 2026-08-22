import Link from "next/link";

import { ProfileIcon } from "@/components/home/home-icons";

type HomeChromeProps = {
  isLoggedIn: boolean;
};

export function HomeChrome({ isLoggedIn }: HomeChromeProps) {
  return (
    <header className="glia-home__chrome lg:hidden">
      <Link href="/" className="glia-home__wordmark">
        <span>GLIA</span>
      </Link>
      <div className="glia-home__utilities">
        <Link
          href={isLoggedIn ? "/mypage" : "/login"}
          className="glia-home__utility"
          aria-label={isLoggedIn ? "마이페이지" : "로그인"}
        >
          <ProfileIcon />
        </Link>
      </div>
    </header>
  );
}
