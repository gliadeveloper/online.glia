import { CoachingIcon, CommunityIcon, HomeIcon, LearningIcon } from "@/components/shell/nav-icons";

export const primaryNavItems = [
  { href: "/", label: "홈", exact: true as const, Icon: HomeIcon },
  { href: "/community", label: "커뮤니티", Icon: CommunityIcon },
  { href: "/coaching", label: "코칭", Icon: CoachingIcon },
  { href: "/learning", label: "내학습", Icon: LearningIcon },
] as const;

export function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
