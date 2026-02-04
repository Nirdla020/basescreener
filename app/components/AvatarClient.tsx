"use client";

import { useEffect, useState } from "react";

export default function AvatarClient({
  icon,
  fallback,
  alt = "",
}: {
  icon: string;
  fallback: string;
  alt?: string;
}) {
  const [src, setSrc] = useState(icon || fallback);

  useEffect(() => {
    setSrc(icon || fallback);
  }, [icon, fallback]);

  return (
    <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white/10 border border-white/10 shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            if (fallback && src !== fallback) setSrc(fallback);
          }}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center font-extrabold">?</div>
      )}
    </div>
  );
}
