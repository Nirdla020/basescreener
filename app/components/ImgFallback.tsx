"use client";

import { useEffect, useState } from "react";

export default function ImgFallback({
  src,
  fallback = "/token-placeholder.png",
  alt = "",
  className = "",
}: {
  src?: string;
  fallback?: string;
  alt?: string;
  className?: string;
}) {
  const [cur, setCur] = useState(src || fallback);

  useEffect(() => {
    setCur(src || fallback);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cur}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (fallback && cur !== fallback) setCur(fallback);
      }}
    />
  );
}
