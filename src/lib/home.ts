import { getCheckInHubData } from "@/lib/checkin-hub";
import { streakHeadlineText } from "@/lib/checkin-streak";
import { checkInFormPath } from "@/lib/checkin-routes";
import { ensureUserCoachingSessionsProvisioned } from "@/lib/coaching-provision";
import { getCheckInDate } from "@/lib/forms";
import {
  getHomeNotifications,
  type HomeNotification,
} from "@/lib/home-notifications";
import { getContinueLearning } from "@/lib/learning";
import { displayAuthorName } from "@/lib/post-display";
import { prisma } from "@/lib/prisma";
import { getActiveProducts, type CatalogProduct } from "@/lib/shop-products";
import { formatKrw, getProductDisplayPrice, productKindLabels } from "@/lib/customer-labels";

const HOME_PRODUCT_LIMIT = 3;
const CHECKIN_TIMEZONE = "Asia/Seoul";

type HomeUser = {
  id: string;
  name: string | null;
  email: string;
};

export type HomeCheckin = {
  greeting: string;
  dateLabel: string;
  headline: string;
  ctaLabel: string;
  href: string;
  done: boolean;
};

export type HomeShortcut = {
  id: "course" | "coaching";
  label: string;
  href: string;
  hint: string;
};

export type HomeContinueCourse = {
  href: string;
  title: string;
  meta: string;
  progressPercent: number;
  thumbnailUrl: string | null;
};

export type HomeContinueCoaching = {
  href: string;
  title: string;
  meta: string;
};

export type HomeProductCard = {
  id: string;
  href: string;
  title: string;
  kindLabel: string;
  priceLabel: string;
  listPriceLabel: string | null;
  thumbnailUrl: string | null;
};

export type HomeAlertItem = Omit<HomeNotification, "occurredAt">;

export type HomePageData = {
  isLoggedIn: boolean;
  checkin: HomeCheckin;
  alerts: HomeAlertItem[];
  shortcuts: HomeShortcut[];
  continueCourse: HomeContinueCourse | null;
  lastCoaching: HomeContinueCoaching | null;
  products: HomeProductCard[];
  discoverPriority: "start" | "recommend";
};

function formatHomeDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+09:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: CHECKIN_TIMEZONE,
  });
}

function greetingFor(user: HomeUser | null) {
  if (!user) {
    return "안녕하세요";
  }
  return `${displayAuthorName(user)}님, 안녕하세요`;
}

function guestCheckin(): HomeCheckin {
  const today = getCheckInDate(CHECKIN_TIMEZONE);
  return {
    greeting: greetingFor(null),
    dateLabel: formatHomeDate(today),
    headline: "오늘의 컨디션을 남겨 회복의 리듬을 시작해 보세요.",
    ctaLabel: "오늘의 체크인",
    href: checkInFormPath("daily", today),
    done: false,
  };
}

function mapProductCard(product: CatalogProduct): HomeProductCard {
  const displayPrice = getProductDisplayPrice(product);
  const thumbnailUrl =
    product.items.find((item) => item.course?.thumbnailUrl)?.course?.thumbnailUrl ?? null;

  return {
    id: product.id,
    href: `/shop/${product.id}`,
    title: product.title,
    kindLabel: productKindLabels[product.kind],
    priceLabel: formatKrw(displayPrice),
    listPriceLabel:
      product.salePrice != null && product.salePrice < product.listPrice
        ? formatKrw(product.listPrice)
        : null,
    thumbnailUrl,
  };
}

async function getLastCoachingForHome(userId: string): Promise<HomeContinueCoaching | null> {
  await ensureUserCoachingSessionsProvisioned(userId);

  const session = await prisma.coachingSession.findFirst({
    where: {
      userId,
      publicationStatus: "PUBLISHED",
      entitlement: { status: "ACTIVE" },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      sessionNo: true,
      entitlement: {
        select: {
          id: true,
          coachingOffering: { select: { title: true } },
        },
      },
    },
  });

  if (session) {
    return {
      href: `/coaching/sessions/${session.id}`,
      title: session.title,
      meta: `${session.entitlement.coachingOffering.title} · ${session.sessionNo}회차`,
    };
  }

  const entitlement = await prisma.coachingEntitlement.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      coachingOffering: { select: { title: true } },
    },
  });

  if (!entitlement) {
    return null;
  }

  return {
    href: `/coaching/${entitlement.id}`,
    title: entitlement.coachingOffering.title,
    meta: "열려 있는 회차를 확인해 보세요",
  };
}

export async function getHomePageData(user: HomeUser | null): Promise<HomePageData> {
  if (!user) {
    const products = await getActiveProducts(HOME_PRODUCT_LIMIT);

    return {
      isLoggedIn: false,
      checkin: guestCheckin(),
      alerts: [],
      shortcuts: [],
      continueCourse: null,
      lastCoaching: null,
      products: products.map(mapProductCard),
      discoverPriority: "start",
    };
  }

  const [hub, alerts, continueLearning, lastCoaching, products, enrollmentCount, coachingCount] =
    await Promise.all([
      getCheckInHubData(user.id),
      getHomeNotifications(user.id),
      getContinueLearning(user.id),
      getLastCoachingForHome(user.id),
      getActiveProducts(HOME_PRODUCT_LIMIT),
      prisma.enrollment.count({ where: { userId: user.id, status: "ACTIVE" } }),
      prisma.coachingEntitlement.count({ where: { userId: user.id, status: "ACTIVE" } }),
    ]);

  const hasOwnedContent = enrollmentCount > 0 || coachingCount > 0;
  const continueCourse: HomeContinueCourse | null = continueLearning
    ? {
        href: `/learning/${continueLearning.courseId}/lessons/${continueLearning.lesson.id}`,
        title: continueLearning.courseTitle,
        meta: continueLearning.lesson.title,
        progressPercent: Math.round(continueLearning.progressPercent),
        thumbnailUrl: continueLearning.thumbnailUrl,
      }
    : null;

  return {
    isLoggedIn: true,
    checkin: {
      greeting: greetingFor(user),
      dateLabel: formatHomeDate(hub.today),
      headline: streakHeadlineText(hub.streakHeadline),
      ctaLabel: hub.todayDailyDone ? "오늘 기록 보기" : "오늘의 체크인",
      href: hub.dailyTask.href,
      done: hub.todayDailyDone,
    },
    alerts: alerts.map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      title: item.title,
      href: item.href,
      timeLabel: item.timeLabel,
    })),
    shortcuts: [
      {
        id: "course",
        label: "수강 중 강좌",
        href: continueCourse?.href ?? "/learning",
        hint: continueCourse?.title ?? "내 학습",
      },
      {
        id: "coaching",
        label: "마지막 코칭",
        href: lastCoaching?.href ?? "/coaching",
        hint: lastCoaching?.title ?? "코칭 허브",
      },
    ],
    continueCourse,
    lastCoaching,
    products: products.map(mapProductCard),
    discoverPriority: hasOwnedContent ? "recommend" : "start",
  };
}
