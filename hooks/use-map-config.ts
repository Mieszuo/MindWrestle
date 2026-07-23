"use client";

import { useEffect, useState } from "react";

import { desktopMap, mobileMap, type MapConfig } from "@/lib/game/mapScene";

const DESKTOP_QUERY = "(min-width: 900px) and (orientation: landscape)";

function pickMapConfig(): MapConfig {
  if (typeof window === "undefined") return mobileMap;
  return window.matchMedia(DESKTOP_QUERY).matches ? desktopMap : mobileMap;
}

export function useMapConfig() {
  const [map, setMap] = useState<MapConfig>(mobileMap);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setMap(pickMapConfig());
    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return map;
}
