"use client";

import { useEffect, useRef } from "react";

type PostViewRecorderProps = {
  slug: string;
};

export function PostViewRecorder({ slug }: PostViewRecorderProps) {
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) {
      return;
    }

    recorded.current = true;
    void fetch(`/api/posts/${slug}/view`, { method: "POST" });
  }, [slug]);

  return null;
}
