"use client";

import { useEffect, useState } from "react";

function loadImage(url: string) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const image = new window.Image();
    image.decoding = "async";
    const finish = () => resolve();
    image.onload = finish;
    image.onerror = finish;
    image.src = url;
  });
}

/** Preloads intro slides: first image immediately, then the rest in order. */
export function useIntroImagePreload(urls: readonly string[]) {
  const [readyUrls, setReadyUrls] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;

    const markReady = (url: string) => {
      if (cancelled) return;
      setReadyUrls((current) => {
        if (current.has(url)) return current;
        return new Set(current).add(url);
      });
    };

    const links: HTMLLinkElement[] = [];

    urls.forEach((url, index) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      if (index > 0) link.setAttribute("fetchpriority", index === 1 ? "high" : "low");
      document.head.appendChild(link);
      links.push(link);
    });

    void (async () => {
      const [first, ...rest] = urls;
      if (first) {
        await loadImage(first);
        markReady(first);
      }

      for (const url of rest) {
        if (cancelled) return;
        await loadImage(url);
        markReady(url);
      }
    })();

    return () => {
      cancelled = true;
      links.forEach((link) => link.remove());
    };
  }, [urls]);

  return readyUrls;
}
