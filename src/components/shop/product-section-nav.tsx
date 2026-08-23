"use client";

import { useEffect, useRef, useState } from "react";

export type ProductSectionItem = {
  id: string;
  label: string;
  count?: number;
};

function scrollParent() {
  return window.matchMedia("(max-width: 1023px)").matches
    ? document.getElementById("main-content")
    : null;
}

function sectionFromScroll(ids: string[]) {
  const nodes = ids
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => Boolean(node));
  if (nodes.length === 0) return null;

  const parent = scrollParent();
  const top = parent ? parent.scrollTop : window.scrollY;
  const view = parent ? parent.clientHeight : window.innerHeight;
  const max = parent ? parent.scrollHeight : document.documentElement.scrollHeight;
  if (top + view >= max - 24) return nodes[nodes.length - 1].id;

  const line =
    (document.querySelector(".glia-pdp__nav")?.getBoundingClientRect().bottom ?? 80) + 8;
  let current = nodes[0].id;
  for (const node of nodes) {
    if (node.getBoundingClientRect().top <= line) current = node.id;
  }
  return current;
}

export function ProductSectionNav({ items = [] }: { items?: ProductSectionItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const hold = useRef(false);
  const ids = items.map((item) => item.id).join();

  useEffect(() => {
    const list = ids.split(",").filter(Boolean);
    if (list.length === 0) return;

    const hash = window.location.hash.slice(1);
    if (list.includes(hash)) setActiveId(hash);

    let frame = 0;
    const sync = () => {
      if (hold.current) return;
      const next = sectionFromScroll(list);
      if (next) setActiveId(next);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    const parent = scrollParent();
    const target: HTMLElement | Window = parent ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    sync();

    return () => {
      target.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [ids]);

  function go(id: string) {
    const node = document.getElementById(id);
    if (!node) return;

    hold.current = true;
    setActiveId(id);
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    window.setTimeout(() => {
      hold.current = false;
    }, 640);
  }

  return (
    <nav aria-label="상품 상세 섹션" className="glia-pdp__nav">
      <ul className="glia-pdp__nav-list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={["glia-pdp__nav-link", activeId === item.id ? "is-active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-current={activeId === item.id ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                go(item.id);
              }}
            >
              {item.label}
              {item.count != null ? <span className="glia-pdp__nav-count">{item.count}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
