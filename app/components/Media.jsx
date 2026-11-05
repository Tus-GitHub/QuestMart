"use client";
import Image from "next/image";
import { useState } from "react";

export default function Media({
  src,
  alt,
  priority = false,
  className = "",
  sizes = "(max-width: 640px) 100vw, 33vw",
  ...props
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={failed ? "/games/placeholder.svg" : src || "/games/placeholder.svg"}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={Boolean(src?.startsWith("https:"))}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
      {...props}
    />
  );
}
