"use client";

import type { ImgHTMLAttributes } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CharacterImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  mini?: boolean;
};

export function CharacterImage({
  mini = false,
  src,
  alt,
  ...props
}: CharacterImageProps) {
  const fallback = mini
    ? `${BASE}/characters-mini/unknown_mini.png`
    : `${BASE}/characters/unknown.png`;
  return (
    <img
      {...props}
      src={src || fallback}
      alt={alt}
      onError={(event) => {
        const image = event.currentTarget;
        // Do not retry if even the fallback asset cannot be loaded.
        if (image.getAttribute("src") !== fallback) {
          image.removeAttribute("srcset");
          image.src = fallback;
        }
      }}
    />
  );
}
