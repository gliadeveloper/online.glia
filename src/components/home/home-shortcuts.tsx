import Link from "next/link";

import { CoachingIcon, CourseIcon } from "@/components/home/home-icons";
import type { HomeShortcut } from "@/lib/home";

const iconById = {
  course: CourseIcon,
  coaching: CoachingIcon,
} as const;

type HomeShortcutsProps = {
  items: HomeShortcut[];
};

export function HomeShortcuts({ items }: HomeShortcutsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="glia-section" aria-labelledby="home-shortcuts-heading">
      <h2 id="home-shortcuts-heading" className="sr-only">
        바로가기
      </h2>
      <ul className="glia-shortcuts">
        {items.map((item) => {
          const Icon = iconById[item.id];
          return (
            <li key={item.id}>
              <Link href={item.href} className={`glia-shortcut glia-shortcut--${item.id}`}>
                <span className="glia-shortcut__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="glia-shortcut__label">{item.label}</span>
                <span className="glia-shortcut__hint">{item.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
