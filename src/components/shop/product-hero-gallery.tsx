"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { ProductHeroImage } from "@/lib/shop-product-hero";

type ProductHeroGalleryProps = {
  images: ProductHeroImage[];
};

export function ProductHeroGallery({ images }: ProductHeroGalleryProps) {
  const [index, setIndex] = useState(0);
  const pauseRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = (next: number) => {
    const last = images.length - 1;
    if (next < 0) {
      setIndex(last);
      return;
    }
    if (next > last) {
      setIndex(0);
      return;
    }
    setIndex(next);
  };

  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      if (pauseRef.current) return;
      setIndex((current) => (current + 1) % images.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className="glia-pdp__gallery"
      style={{ "--glia-pdp-slide-i": String(index) } as CSSProperties}
      onMouseEnter={() => {
        pauseRef.current = true;
      }}
      onMouseLeave={() => {
        pauseRef.current = false;
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        pauseRef.current = true;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        pauseRef.current = false;
        if (start == null || end == null || images.length < 2) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        goTo(delta < 0 ? index + 1 : index - 1);
      }}
    >
      <div className="glia-pdp__track" aria-roledescription="carousel" aria-label="프로그램 이미지">
        {images.map((image, imageIndex) => (
          <figure
            key={image.src}
            className={`glia-pdp__slide${imageIndex === index ? " is-active" : ""}`}
            aria-hidden={imageIndex !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={imageIndex === index ? image.alt : ""} />
          </figure>
        ))}
      </div>

      {images.length > 1 ? (
        <>
          <p className="glia-pdp__count" aria-live="polite">
            {index + 1} / {images.length}
          </p>
          <button
            type="button"
            className="glia-pdp__arrow glia-pdp__arrow--prev"
            aria-label="이전 이미지"
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="glia-pdp__arrow glia-pdp__arrow--next"
            aria-label="다음 이미지"
            onClick={() => goTo(index + 1)}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </>
      ) : null}
    </div>
  );
}
