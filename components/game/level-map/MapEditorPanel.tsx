"use client";

import { AudioDebugPanel } from "@/components/audio/audio-debug-panel";
import { useT } from "@/components/i18n/locale-provider";
import { findDecor, findLevel, selectionKey } from "@/lib/game/mapScene-export";
import {
  getPlatformWidth,
  getSpriteWidth,
  type LevelState,
} from "@/lib/game/mapScene";
import { MAP_EDITOR_CATALOG } from "@/lib/game/mapAssets";
import type { MapEditorApi } from "@/hooks/use-map-editor";
import styles from "@/components/game/level-map/LevelMap.module.css";

interface MapEditorPanelProps {
  editor: MapEditorApi;
}

const levelStates: LevelState[] = ["current", "done", "blocked"];

export function MapEditorPanel({ editor }: MapEditorPanelProps) {
  const t = useT();
  const levelStateLabels: Record<LevelState, string> = t.level.mapEditor.stateOptions;
  const {
    variant,
    setVariant,
    activeMap,
    selection,
    setSelection,
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
  } = editor;

  const selectedLevel =
    selection?.kind === "level" ? findLevel(activeMap, selection.id) : undefined;
  const selectedDecor =
    selection?.kind === "decor" ? findDecor(activeMap, selection.id) : undefined;

  const widthValue =
    selectedLevel != null
      ? selectedLevel.width ?? ""
      : selectedDecor?.width ?? "";

  const computedWidth =
    selectedLevel != null
      ? Math.round(getPlatformWidth(activeMap, selectedLevel.y) * (selectedLevel.scale ?? 1))
      : selectedDecor != null
        ? Math.round(getSpriteWidth(activeMap, selectedDecor.width, selectedDecor.y) * (selectedDecor.scale ?? 1))
        : null;

  const scaleValue = selectedLevel?.scale ?? selectedDecor?.scale ?? 1;

  return (
    <aside className={styles.editorPanel}>
      <p className={styles.editorTitle}>{t.level.mapEditor.title}</p>

      <div className={styles.editorRow}>
        <button
          type="button"
          className={`${styles.editorTab} ${variant === "mobile" ? styles.editorTabActive : ""}`}
          onClick={() => {
            setVariant("mobile");
            setSelection(null);
          }}
        >
          Mobile
        </button>
        <button
          type="button"
          className={`${styles.editorTab} ${variant === "desktop" ? styles.editorTabActive : ""}`}
          onClick={() => {
            setVariant("desktop");
            setSelection(null);
          }}
        >
          Desktop
        </button>
      </div>

      {variant === "mobile" && (
        <p className={styles.editorHint}>
          {t.level.mapEditor.mobileHint}
        </p>
      )}

      <button type="button" className={styles.editorButtonSecondary} onClick={syncFromOtherVariant}>
        {t.level.mapEditor.copyLayoutFrom(variant === "mobile" ? "Desktop" : "Mobile")}
      </button>

      <label className={styles.editorField}>
        <span>{t.level.mapEditor.pedestalWidthLabel}</span>
        <input
          type="number"
          value={activeMap.platformWidth}
          onChange={(e) => updatePlatformWidth(Number(e.target.value))}
        />
      </label>

      <div className={styles.editorDepth}>
        <p className={styles.editorListTitle}>{t.level.mapEditor.depthTitle}</p>
        <label className={styles.editorField}>
          <span>{t.level.mapEditor.farYLabel}</span>
          <input
            type="number"
            value={activeMap.depth.farY}
            onChange={(e) => updateDepthField("farY", Number(e.target.value))}
          />
        </label>
        <label className={styles.editorField}>
          <span>{t.level.mapEditor.nearYLabel}</span>
          <input
            type="number"
            value={activeMap.depth.nearY}
            onChange={(e) => updateDepthField("nearY", Number(e.target.value))}
          />
        </label>
        <label className={styles.editorField}>
          <span>farScale</span>
          <input
            type="number"
            step="0.01"
            min="0.1"
            max="1"
            value={activeMap.depth.farScale ?? 0.62}
            onChange={(e) => updateDepthField("farScale", Number(e.target.value))}
          />
        </label>
        <label className={styles.editorField}>
          <span>nearScale</span>
          <input
            type="number"
            step="0.01"
            min="0.1"
            max="1.5"
            value={activeMap.depth.nearScale ?? 1}
            onChange={(e) => updateDepthField("nearScale", Number(e.target.value))}
          />
        </label>
      </div>

      <div className={styles.editorCatalog}>
        <p className={styles.editorListTitle}>{t.level.mapEditor.addObjectTitle}</p>
        <div className={styles.editorCatalogGrid}>
          {MAP_EDITOR_CATALOG.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.editorCatalogButton}
              onClick={() => addDecoration(item)}
            >
              + {item.label}
            </button>
          ))}
        </div>
      </div>

      {selection ? (
        <div className={styles.editorSelection}>
          <p className={styles.editorSelectionTitle}>
            {selection.kind === "level" ? t.level.map.levelLabel(selection.id) : selection.id}
          </p>

          {selectedLevel && (
            <label className={styles.editorField}>
              <span>{t.level.mapEditor.stateLabel}</span>
              <select
                value={selectedLevel.state}
                onChange={(e) => updateLevelState(selectedLevel.id, e.target.value as LevelState)}
              >
                {levelStates.map((state) => (
                  <option key={state} value={state}>
                    {levelStateLabels[state]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className={styles.editorField}>
            <span>x</span>
            <input
              type="number"
              value={selectedLevel?.x ?? selectedDecor?.x ?? 0}
              onChange={(e) => updateSelectionField("x", Number(e.target.value))}
            />
          </label>

          <label className={styles.editorField}>
            <span>y</span>
            <input
              type="number"
              value={selectedLevel?.y ?? selectedDecor?.y ?? 0}
              onChange={(e) => updateSelectionField("y", Number(e.target.value))}
            />
          </label>

          <label className={styles.editorField}>
            <span>{selectedLevel ? "width override" : "base width"}</span>
            <input
              type="number"
              placeholder={selectedLevel ? t.level.mapEditor.widthAutoPlaceholder : ""}
              value={widthValue}
              onChange={(e) =>
                updateSelectionField(
                  "width",
                  e.target.value === "" ? NaN : Number(e.target.value),
                )
              }
            />
          </label>

          {computedWidth != null && (
            <p className={styles.editorComputed}>
              {t.level.mapEditor.computedLabel(computedWidth)}
            </p>
          )}

          <label className={styles.editorField}>
            <span>scale</span>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="3"
              value={scaleValue}
              onChange={(e) => updateSelectionField("scale", Number(e.target.value))}
            />
          </label>

          {selectedDecor && (
            <button
              type="button"
              className={styles.editorDangerButton}
              onClick={removeSelectedDecoration}
            >
              {t.level.mapEditor.removeDecoration}
            </button>
          )}
        </div>
      ) : (
        <p className={styles.editorHint}>{t.level.mapEditor.clickHint}</p>
      )}

      <div className={styles.editorList}>
        <p className={styles.editorListTitle}>{t.level.mapEditor.levelsTitle}</p>
        {activeMap.levels.map((level) => {
          const key = selectionKey({ kind: "level", id: level.id })!;
          return (
            <button
              key={key}
              type="button"
              className={`${styles.editorListItem} ${selectionKey(selection) === key ? styles.editorListItemActive : ""}`}
              onClick={() => setSelection({ kind: "level", id: level.id })}
            >
              #{level.id} — {level.state} — {level.x}, {level.y}
            </button>
          );
        })}

        {activeMap.decorations.length > 0 && (
          <>
            <p className={styles.editorListTitle}>{t.level.mapEditor.decorationsTitle}</p>
            {activeMap.decorations.map((d) => {
              const key = selectionKey({ kind: "decor", id: d.id })!;
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.editorListItem} ${selectionKey(selection) === key ? styles.editorListItemActive : ""}`}
                  onClick={() => setSelection({ kind: "decor", id: d.id })}
                >
                  {d.id}
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className={styles.editorActions}>
        <button type="button" className={styles.editorButton} onClick={() => void copyExport()}>
          {copied ? t.level.mapEditor.copied : t.level.mapEditor.copyCode}
        </button>
        <button type="button" className={styles.editorButtonSecondary} onClick={resetDraft}>
          {t.level.mapEditor.reset}
        </button>
      </div>

      <AudioDebugPanel />
    </aside>
  );
}
