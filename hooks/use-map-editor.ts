"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  cloneMapConfig,
  exportMapConfigTs,
  parseSelectionKey,
  selectionKey,
  syncMapLayoutFrom,
  type MapEditorSelection,
} from "@/lib/game/mapScene-export";
import type { MapElementCatalogItem } from "@/lib/game/mapAssets";
import {
  MAP_SOURCE,
  desktopMap,
  mobileMap,
  type LevelState,
  type MapConfig,
} from "@/lib/game/mapScene";

export function useMapEditorMode() {
  const searchParams = useSearchParams();
  const isDev = process.env.NODE_ENV === "development";
  return isDev && searchParams.get("edit") === "1";
}

export function useMapEditor() {
  const editMode = useMapEditorMode();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"mobile" | "desktop">("desktop");
  const [mobileDraft, setMobileDraft] = useState(() => cloneMapConfig(mobileMap));
  const [desktopDraft, setDesktopDraft] = useState(() => cloneMapConfig(desktopMap));
  const [selection, setSelection] = useState<MapEditorSelection>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeMap = variant === "mobile" ? mobileDraft : desktopDraft;
  const setActiveMap = variant === "mobile" ? setMobileDraft : setDesktopDraft;

  const clientToMap = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * MAP_SOURCE.width),
      y: Math.round(((clientY - rect.top) / rect.height) * MAP_SOURCE.height),
    };
  }, []);

  const updateItemPosition = useCallback(
    (key: string, x: number, y: number) => {
      const parsed = parseSelectionKey(key);
      if (!parsed) return;

      setActiveMap((prev) => {
        if (parsed.kind === "level") {
          return {
            ...prev,
            levels: prev.levels.map((l) =>
              l.id === parsed.id ? { ...l, x, y } : l,
            ),
          };
        }
        return {
          ...prev,
          decorations: prev.decorations.map((d) =>
            d.id === parsed.id ? { ...d, x, y } : d,
          ),
        };
      });
    },
    [setActiveMap],
  );

  const handleItemPointerDown = useCallback(
    (event: React.PointerEvent, key: string) => {
      if (!editMode) return;
      event.preventDefault();
      event.stopPropagation();
      setSelection(parseSelectionKey(key));
      setDraggingKey(key);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [editMode],
  );

  useEffect(() => {
    if (!draggingKey) return;

    function onMove(e: PointerEvent) {
      const coords = clientToMap(e.clientX, e.clientY);
      if (!coords || !draggingKey) return;
      updateItemPosition(draggingKey, coords.x, coords.y);
    }

    function onUp() {
      setDraggingKey(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingKey, clientToMap, updateItemPosition]);

  const updateSelectionField = useCallback(
    (field: "x" | "y" | "width" | "scale", value: number) => {
      if (!selection) return;

      setActiveMap((prev) => {
        if (selection.kind === "level") {
          return {
            ...prev,
            levels: prev.levels.map((l) => {
              if (l.id !== selection.id) return l;
              if (field === "width") {
                if (Number.isNaN(value)) {
                  const next = { ...l };
                  delete next.width;
                  return next;
                }
                return { ...l, width: value };
              }
              if (field === "scale") return { ...l, scale: value };
              return { ...l, [field]: value };
            }),
          };
        }
        return {
          ...prev,
          decorations: prev.decorations.map((d) => {
            if (d.id !== selection.id) return d;
            if (field === "width") return { ...d, width: value };
            if (field === "scale") return { ...d, scale: value };
            return { ...d, [field]: value };
          }),
        };
      });
    },
    [selection, setActiveMap],
  );

  const updatePlatformWidth = useCallback(
    (value: number) => {
      setActiveMap((prev) => ({ ...prev, platformWidth: value }));
    },
    [setActiveMap],
  );

  const updateDepthField = useCallback(
    (field: keyof MapConfig["depth"], value: number) => {
      setActiveMap((prev) => ({
        ...prev,
        depth: { ...prev.depth, [field]: value },
      }));
    },
    [setActiveMap],
  );

  const updateLevelState = useCallback(
    (id: number, state: LevelState) => {
      setActiveMap((prev) => ({
        ...prev,
        levels: prev.levels.map((level) => (level.id === id ? { ...level, state } : level)),
      }));
    },
    [setActiveMap],
  );

  const addDecoration = useCallback(
    (item: MapElementCatalogItem) => {
      const suffix = `${variant}-${Date.now().toString(36)}`;
      const decoration = {
        id: `${item.id}-${suffix}`,
        src: item.src,
        x: Math.round(MAP_SOURCE.width / 2),
        y: Math.round(MAP_SOURCE.height / 2),
        width: item.defaultWidth,
        anchor: item.anchor ?? ("bottom-center" as const),
      };

      setActiveMap((prev) => ({
        ...prev,
        decorations: [...prev.decorations, decoration],
      }));
      setSelection({ kind: "decor", id: decoration.id });
    },
    [setActiveMap, variant],
  );

  const removeSelectedDecoration = useCallback(() => {
    if (selection?.kind !== "decor") return;
    const decorId = selection.id;

    setActiveMap((prev) => ({
      ...prev,
      decorations: prev.decorations.filter((d) => d.id !== decorId),
    }));
    setSelection(null);
  }, [selection, setActiveMap]);

  const copyExport = useCallback(async () => {
    const text = exportMapConfigTs(activeMap, variant);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeMap, variant]);

  const resetDraft = useCallback(() => {
    const source = variant === "mobile" ? mobileMap : desktopMap;
    setActiveMap(cloneMapConfig(source));
    setSelection(null);
  }, [variant, setActiveMap]);

  const syncFromOtherVariant = useCallback(() => {
    const source = variant === "mobile" ? desktopDraft : mobileDraft;
    const layout = syncMapLayoutFrom(source, variant);
    setActiveMap((prev) => ({
      ...prev,
      levels: layout.levels,
      decorations: layout.decorations,
    }));
    setSelection(null);
  }, [variant, mobileDraft, desktopDraft, setActiveMap]);

  const isSelected = useCallback(
    (key: string) => selectionKey(selection) === key,
    [selection],
  );

  return {
    editMode,
    canvasRef,
    variant,
    setVariant,
    activeMap,
    selection,
    setSelection,
    handleItemPointerDown,
    isSelected,
    updateSelectionField,
    updatePlatformWidth,
    updateDepthField,
    updateLevelState,
    addDecoration,
    removeSelectedDecoration,
    copyExport,
    copied,
    resetDraft,
    syncFromOtherVariant,
    draggingKey,
  };
}

export type MapEditorApi = ReturnType<typeof useMapEditor>;
