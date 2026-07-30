const DATE_SEGMENT = /^\d{4}-\d{2}-\d{2}$/;

export type StackNavContext = {
  backHref: string;
  backLabel: string;
  title: string;
  /** Minimal chrome — back + trailing slot only (step forms). */
  immersive?: boolean;
};

export function resolveStackNav(pathname: string): StackNavContext {
  if (pathname === "/mypage") {
    return { backHref: "/", backLabel: "홈", title: "마이페이지" };
  }

  if (pathname === "/mypage/edit") {
    return { backHref: "/mypage", backLabel: "마이페이지", title: "프로필 수정" };
  }

  if (pathname === "/orders") {
    return { backHref: "/mypage", backLabel: "마이페이지", title: "주문 내역" };
  }

  if (/^\/orders\/[^/]+$/.test(pathname)) {
    return { backHref: "/orders", backLabel: "주문 내역", title: "주문 상세" };
  }

  if (pathname === "/shop") {
    return { backHref: "/", backLabel: "홈", title: "상품" };
  }

  if (/^\/shop\/[^/]+$/.test(pathname)) {
    return { backHref: "/shop", backLabel: "상품", title: "상품 상세" };
  }

  if (pathname === "/checkin/history") {
    return { backHref: "/checkin", backLabel: "체크인", title: "작성한 목록" };
  }

  if (pathname === "/checkin") {
    return { backHref: "/", backLabel: "홈", title: "체크인" };
  }

  if (pathname === "/checkin/daily") {
    return { backHref: "/", backLabel: "홈", title: "체크인" };
  }

  if (pathname.startsWith("/checkin/daily/")) {
    const segments = pathname.split("/");
    const date = segments[3] ?? "";
    if (DATE_SEGMENT.test(date)) {
      if (segments[4] === "report") {
        return {
          backHref: "/checkin",
          backLabel: "체크인",
          title: "",
          immersive: true,
        };
      }
      return {
        backHref: "/checkin",
        backLabel: "체크인",
        title: "",
        immersive: true,
      };
    }
  }

  if (pathname.startsWith("/checkin/weekly/")) {
    const segments = pathname.split("/");
    const date = segments[3] ?? "";
    if (DATE_SEGMENT.test(date)) {
      if (segments[4] === "report") {
        return {
          backHref: "/checkin",
          backLabel: "체크인",
          title: "",
          immersive: true,
        };
      }
      return {
        backHref: "/checkin",
        backLabel: "체크인",
        title: "",
        immersive: true,
      };
    }
    return { backHref: "/checkin", backLabel: "체크인", title: "주간 체크" };
  }

  const learningCourseMatch = pathname.match(/^\/learning\/([^/]+)$/);
  if (learningCourseMatch) {
    return { backHref: "/learning", backLabel: "내 학습", title: "강의" };
  }

  const learningLessonMatch = pathname.match(/^\/learning\/([^/]+)\/lessons\/[^/]+$/);
  if (learningLessonMatch) {
    const slug = learningLessonMatch[1];
    return { backHref: `/learning/${slug}`, backLabel: "강의", title: "레슨" };
  }

  if (pathname === "/coaching") {
    return { backHref: "/learning", backLabel: "내 학습", title: "코칭" };
  }

  if (/^\/coaching\/sessions\/[^/]+$/.test(pathname)) {
    return { backHref: "/coaching", backLabel: "코칭", title: "코칭 세션" };
  }

  return { backHref: "/", backLabel: "홈", title: "" };
}
