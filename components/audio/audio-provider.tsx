"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MUSIC_ASSETS, MUSIC_VOLUME_MULTIPLIER, SFX_ASSETS, SFX_VOLUME_MULTIPLIER } from "@/lib/audio/audio-assets";
import type { CharacterReaction, EmotionDelta, EmotionState, MusicTrack, SfxKey } from "@/lib/audio/audio-types";

const DEFAULT_VOLUME = 0.35;
const DEFAULT_VOICE_VOLUME = 0.85;
/** Matches the old separate music slider (0.7) baked into one master control. */
const INTERNAL_MUSIC_GAIN = 0.7;
/** Slightly softer SFX than raw asset levels. */
const INTERNAL_SFX_GAIN = 0.72;
const DEFAULT_CROSSFADE_MS = 2400;
const SPEECH_DUCK_MULTIPLIER = 0.34;
const SPEECH_DUCK_ATTACK_MS = 220;
const SPEECH_DUCK_RELEASE_MS = 620;
const SPEECH_DUCK_RELEASE_DELAY_MS = 180;

const STORAGE_KEYS = {
  musicEnabled: "mindwrestle.audio.musicEnabled",
  sfxEnabled: "mindwrestle.audio.sfxEnabled",
  volume: "mindwrestle.audio.volume",
  voiceEnabled: "mindwrestle.audio.voiceEnabled",
  sttEnabled: "mindwrestle.audio.sttEnabled",
  sttAutoSend: "mindwrestle.audio.sttAutoSend",
  voiceVolume: "mindwrestle.audio.voiceVolume",
};

const LEGACY_STORAGE_KEYS = ["convinceme.audio.musicVolume", "convinceme.audio.sfxVolume"] as const;

type AudioContextValue = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  sttEnabled: boolean;
  sttAutoSend: boolean;
  volume: number;
  voiceVolume: number;
  hasUnlockedAudio: boolean;
  isSpeaking: boolean;
  currentMusicTrack: MusicTrack | null;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setSttEnabled: (enabled: boolean) => void;
  setSttAutoSend: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setVoiceVolume: (volume: number) => void;
  resetAudioSettings: () => void;
  unlockAudio: () => void;
  playSfx: (key: SfxKey) => void;
  playSpeech: (
    src: string,
    options?: {
      onStarted?: () => void;
      onTimeUpdate?: (currentTimeMs: number) => void;
    },
  ) => Promise<void>;
  stopSpeech: () => void;
  crossfadeTo: (track: MusicTrack, durationMs?: number) => void;
  stopMusic: (durationMs?: number) => void;
  setAudioSuspended: (suspended: boolean) => void;
  setCinematicAutoplay: (enabled: boolean) => void;
  playEmotionCue: (delta: EmotionDelta, nextState: EmotionState) => void;
  playCharacterReaction: (characterSlug: string, reaction: CharacterReaction) => void;
};

const AudioContext = createContext<AudioContextValue | null>(null);

function readBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function readNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable in private contexts.
  }
}

function clearLegacyVolumeKeys() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage may be unavailable in private contexts.
  }
}

function safePlay(audio: HTMLAudioElement) {
  void audio.play().catch((error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audio] play() failed:", audio.src, error);
    }
    const retry = () => {
      audio.removeEventListener("canplaythrough", retry);
      void audio.play().catch(() => undefined);
    };
    audio.addEventListener("canplaythrough", retry, { once: true });
    audio.load();
  });
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [musicEnabledState, setMusicEnabledState] = useState(() => readBoolean(STORAGE_KEYS.musicEnabled, true));
  const [sfxEnabledState, setSfxEnabledState] = useState(() => readBoolean(STORAGE_KEYS.sfxEnabled, true));
  const [voiceEnabledState, setVoiceEnabledState] = useState(() => readBoolean(STORAGE_KEYS.voiceEnabled, true));
  const [sttEnabledState, setSttEnabledState] = useState(() => readBoolean(STORAGE_KEYS.sttEnabled, true));
  const [sttAutoSendState, setSttAutoSendState] = useState(() => readBoolean(STORAGE_KEYS.sttAutoSend, false));
  const [volumeState, setVolumeState] = useState(() => readNumber(STORAGE_KEYS.volume, DEFAULT_VOLUME));
  const [voiceVolumeState, setVoiceVolumeState] = useState(() =>
    readNumber(STORAGE_KEYS.voiceVolume, DEFAULT_VOICE_VOLUME),
  );
  const [hasUnlockedAudio, setHasUnlockedAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMusicTrack, setCurrentMusicTrack] = useState<MusicTrack | null>(null);
  const musicRefs = useRef<Partial<Record<MusicTrack, HTMLAudioElement>>>({});
  const fadeRef = useRef<number | null>(null);
  const sfxCooldowns = useRef<Record<string, number>>({});
  const emotionGlobalCooldown = useRef(0);
  const characterCooldowns = useRef<Record<string, number>>({});
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechResolveRef = useRef<(() => void) | null>(null);
  const speechDuckRef = useRef(1);
  const speechDuckFadeRef = useRef<number | null>(null);
  const speechDuckReleaseRef = useRef<number | null>(null);
  const currentTrackRef = useRef<MusicTrack | null>(null);
  const unlockedRef = useRef(false);
  const pendingUnlockRef = useRef(false);
  const musicEnabledRef = useRef(musicEnabledState);
  const sfxEnabledRef = useRef(sfxEnabledState);
  const voiceEnabledRef = useRef(voiceEnabledState);
  const voiceVolumeRef = useRef(voiceVolumeState);
  const volumeRef = useRef(volumeState);
  const suspendedRef = useRef(false);
  const cinematicAutoplayRef = useRef(false);

  useEffect(() => {
    clearLegacyVolumeKeys();
  }, []);

  function musicPlaybackAllowed() {
    return musicEnabledRef.current && (unlockedRef.current || cinematicAutoplayRef.current);
  }

  const effectiveMusicVolume = useCallback(() => {
    return volumeRef.current * INTERNAL_MUSIC_GAIN * MUSIC_VOLUME_MULTIPLIER * speechDuckRef.current;
  }, []);

  function effectiveSfxVolume(assetVolume: number) {
    return volumeRef.current * INTERNAL_SFX_GAIN * SFX_VOLUME_MULTIPLIER * assetVolume;
  }

  function effectiveVoiceVolume() {
    return voiceVolumeRef.current * volumeRef.current;
  }

  const applyMusicVolume = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    if (!activeTrack) return;
    const audio = musicRefs.current[activeTrack];
    if (audio && musicEnabledRef.current && !audio.paused) {
      audio.volume = effectiveMusicVolume();
    }
  }, [effectiveMusicVolume]);

  const animateSpeechDuck = useCallback((target: number, durationMs: number) => {
    if (speechDuckFadeRef.current !== null) {
      window.clearInterval(speechDuckFadeRef.current);
    }

    const start = speechDuckRef.current;
    const startedAt = performance.now();
    speechDuckFadeRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / Math.max(durationMs, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      speechDuckRef.current = start + (target - start) * eased;
      applyMusicVolume();

      if (progress >= 1 && speechDuckFadeRef.current !== null) {
        window.clearInterval(speechDuckFadeRef.current);
        speechDuckFadeRef.current = null;
      }
    }, 25);
  }, [applyMusicVolume]);

  const duckMusicForSpeech = useCallback(() => {
    if (speechDuckReleaseRef.current !== null) {
      window.clearTimeout(speechDuckReleaseRef.current);
      speechDuckReleaseRef.current = null;
    }
    animateSpeechDuck(SPEECH_DUCK_MULTIPLIER, SPEECH_DUCK_ATTACK_MS);
  }, [animateSpeechDuck]);

  const releaseSpeechDuck = useCallback((immediate = false) => {
    if (speechDuckReleaseRef.current !== null) {
      window.clearTimeout(speechDuckReleaseRef.current);
    }
    const release = () => {
      speechDuckReleaseRef.current = null;
      animateSpeechDuck(1, SPEECH_DUCK_RELEASE_MS);
    };
    if (immediate) release();
    else speechDuckReleaseRef.current = window.setTimeout(release, SPEECH_DUCK_RELEASE_DELAY_MS);
  }, [animateSpeechDuck]);

  const finishSpeechPlayback = useCallback(() => {
    speechAudioRef.current = null;
    speechResolveRef.current = null;
    setIsSpeaking(false);
    releaseSpeechDuck();
  }, [releaseSpeechDuck]);

  useEffect(() => {
    return () => {
      if (speechDuckFadeRef.current !== null) window.clearInterval(speechDuckFadeRef.current);
      if (speechDuckReleaseRef.current !== null) window.clearTimeout(speechDuckReleaseRef.current);
    };
  }, []);

  const stopSpeech = useCallback(() => {
    const audio = speechAudioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    if (speechResolveRef.current) {
      speechResolveRef.current();
    }
    finishSpeechPlayback();
    releaseSpeechDuck(true);
  }, [finishSpeechPlayback, releaseSpeechDuck]);

  const playSpeech = useCallback((
    src: string,
    options?: {
      onStarted?: () => void;
      onTimeUpdate?: (currentTimeMs: number) => void;
    },
  ) => {
    if (suspendedRef.current || !voiceEnabledRef.current || typeof Audio === "undefined") {
      return Promise.resolve();
    }

    if (speechAudioRef.current || speechResolveRef.current) {
      stopSpeech();
    }

    return new Promise<void>((resolve) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      speechAudioRef.current = audio;
      speechResolveRef.current = resolve;
      audio.volume = effectiveVoiceVolume();
      setIsSpeaking(true);
      duckMusicForSpeech();

      const done = () => {
        if (speechAudioRef.current !== audio) return;
        options?.onTimeUpdate?.(audio.duration * 1000);
        finishSpeechPlayback();
        resolve();
      };

      audio.addEventListener("playing", () => {
        options?.onStarted?.();
        options?.onTimeUpdate?.(audio.currentTime * 1000);
      }, { once: true });
      audio.addEventListener("timeupdate", () => {
        options?.onTimeUpdate?.(audio.currentTime * 1000);
      });
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      safePlay(audio);
    });
  }, [duckMusicForSpeech, finishSpeechPlayback, stopSpeech]);

  function getMusic(track: MusicTrack) {
    if (typeof Audio === "undefined") return null;
    if (!musicRefs.current[track]) {
      const audio = new Audio(MUSIC_ASSETS[track]);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      audio.addEventListener("error", () => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[audio] failed to load:", MUSIC_ASSETS[track]);
        }
      });
      musicRefs.current[track] = audio;
    }
    return musicRefs.current[track] ?? null;
  }

  function pauseAllExcept(track: MusicTrack) {
    Object.entries(musicRefs.current).forEach(([key, audio]) => {
      if (!audio || key === track) return;
      audio.pause();
      audio.volume = 0;
    });
  }

  function crossfadeToTrack(track: MusicTrack, durationMs = DEFAULT_CROSSFADE_MS) {
    if (suspendedRef.current) return;

    currentTrackRef.current = track;
    setCurrentMusicTrack(track);

    if (!musicPlaybackAllowed()) return;

    const next = getMusic(track);
    if (!next) return;

    if (fadeRef.current !== null) window.clearInterval(fadeRef.current);

    const entries = Object.entries(musicRefs.current).filter(([, audio]) => audio) as Array<[MusicTrack, HTMLAudioElement]>;
    const starts = new Map(entries.map(([key, audio]) => [key, audio.volume]));

    next.currentTime = next.paused ? 0 : next.currentTime;
    safePlay(next);

    const startedAt = performance.now();
    fadeRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
      entries.forEach(([key, audio]) => {
        if (key === track) {
          const targetVolume = effectiveMusicVolume();
          audio.volume = (starts.get(key) ?? 0) + (targetVolume - (starts.get(key) ?? 0)) * progress;
          return;
        }
        audio.volume = (starts.get(key) ?? 0) * (1 - progress) * speechDuckRef.current;
        if (progress >= 1) {
          audio.pause();
          audio.volume = 0;
        }
      });
      if (progress >= 1) {
        const target = musicRefs.current[track];
        if (target) {
          target.volume = effectiveMusicVolume();
          if (target.paused) safePlay(target);
        }
        pauseAllExcept(track);
        if (fadeRef.current !== null) {
          window.clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }
    }, 50);
  }

  function applyPendingUnlock() {
    if (!pendingUnlockRef.current) return;
    pendingUnlockRef.current = false;
    unlockedRef.current = true;
    setHasUnlockedAudio(true);
    const track = currentTrackRef.current;
    if (track && musicEnabledRef.current) {
      crossfadeToTrack(track, DEFAULT_CROSSFADE_MS);
    }
  }

  const unlockAudio = useCallback(() => {
    if (suspendedRef.current) {
      pendingUnlockRef.current = true;
      return;
    }
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    setHasUnlockedAudio(true);
    const track = currentTrackRef.current;
    if (track && musicEnabledRef.current) {
      crossfadeToTrack(track, DEFAULT_CROSSFADE_MS);
    }
    // crossfadeToTrack only reads refs and does not depend on render-time values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function unlockFromGesture() {
      if (suspendedRef.current) {
        pendingUnlockRef.current = true;
        return;
      }
      unlockAudio();
    }

    window.addEventListener("pointerdown", unlockFromGesture, { capture: true });
    window.addEventListener("keydown", unlockFromGesture, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", unlockFromGesture, { capture: true });
      window.removeEventListener("keydown", unlockFromGesture, { capture: true });
    };
  }, [unlockAudio]);

  const setMusicEnabled = useCallback((enabled: boolean) => {
    musicEnabledRef.current = enabled;
    setMusicEnabledState(enabled);
    persist(STORAGE_KEYS.musicEnabled, String(enabled));
    if (!enabled) {
      fadeOutAllMusic(1200);
      return;
    }
    const track = currentTrackRef.current;
    if (track) crossfadeToTrack(track, DEFAULT_CROSSFADE_MS);
    // crossfadeToTrack and fadeOutAllMusic only read refs and do not depend on render-time values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSfxEnabled = useCallback((enabled: boolean) => {
    sfxEnabledRef.current = enabled;
    setSfxEnabledState(enabled);
    persist(STORAGE_KEYS.sfxEnabled, String(enabled));
  }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    voiceEnabledRef.current = enabled;
    setVoiceEnabledState(enabled);
    persist(STORAGE_KEYS.voiceEnabled, String(enabled));
    if (!enabled) stopSpeech();
  }, [stopSpeech]);

  const setSttEnabled = useCallback((enabled: boolean) => {
    setSttEnabledState(enabled);
    persist(STORAGE_KEYS.sttEnabled, String(enabled));
  }, []);

  const setSttAutoSend = useCallback((enabled: boolean) => {
    setSttAutoSendState(enabled);
    persist(STORAGE_KEYS.sttAutoSend, String(enabled));
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = Math.min(1, Math.max(0, nextVolume));
    volumeRef.current = safeVolume;
    setVolumeState(safeVolume);
    persist(STORAGE_KEYS.volume, String(safeVolume));
    applyMusicVolume();
    const speech = speechAudioRef.current;
    if (speech) speech.volume = effectiveVoiceVolume();
  }, [applyMusicVolume]);

  const setVoiceVolume = useCallback((nextVolume: number) => {
    const safeVolume = Math.min(1, Math.max(0, nextVolume));
    voiceVolumeRef.current = safeVolume;
    setVoiceVolumeState(safeVolume);
    persist(STORAGE_KEYS.voiceVolume, String(safeVolume));
    const speech = speechAudioRef.current;
    if (speech) speech.volume = effectiveVoiceVolume();
  }, []);

  const resetAudioSettings = useCallback(() => {
    musicEnabledRef.current = true;
    sfxEnabledRef.current = true;
    voiceEnabledRef.current = true;
    volumeRef.current = DEFAULT_VOLUME;
    voiceVolumeRef.current = DEFAULT_VOICE_VOLUME;
    setMusicEnabledState(true);
    setSfxEnabledState(true);
    setVoiceEnabledState(true);
    setSttEnabledState(true);
    setSttAutoSendState(false);
    setVolumeState(DEFAULT_VOLUME);
    setVoiceVolumeState(DEFAULT_VOICE_VOLUME);
    persist(STORAGE_KEYS.musicEnabled, "true");
    persist(STORAGE_KEYS.sfxEnabled, "true");
    persist(STORAGE_KEYS.voiceEnabled, "true");
    persist(STORAGE_KEYS.sttEnabled, "true");
    persist(STORAGE_KEYS.sttAutoSend, "false");
    persist(STORAGE_KEYS.volume, String(DEFAULT_VOLUME));
    persist(STORAGE_KEYS.voiceVolume, String(DEFAULT_VOICE_VOLUME));
    clearLegacyVolumeKeys();
    stopSpeech();
    const activeTrack = currentTrackRef.current;
    if (activeTrack && musicEnabledRef.current) {
      const audio = musicRefs.current[activeTrack];
      if (audio) audio.volume = effectiveMusicVolume();
    }
  }, [effectiveMusicVolume, stopSpeech]);

  function fadeOutAllMusic(durationMs: number) {
    if (fadeRef.current !== null) window.clearInterval(fadeRef.current);
    const entries = Object.values(musicRefs.current).filter(Boolean) as HTMLAudioElement[];
    if (entries.length === 0) {
      fadeRef.current = null;
      return;
    }
    const starts = entries.map((audio) => audio.volume);
    const startedAt = performance.now();
    fadeRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / Math.max(durationMs, 1));
      entries.forEach((audio, index) => {
        audio.volume = starts[index] * (1 - progress);
        if (progress >= 1) audio.pause();
      });
      if (progress >= 1 && fadeRef.current !== null) {
        window.clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    }, 50);
  }

  const crossfadeTo = useCallback((track: MusicTrack, durationMs = DEFAULT_CROSSFADE_MS) => {
    crossfadeToTrack(track, durationMs);
    // crossfadeToTrack only reads refs and does not depend on render-time values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMusic = useCallback((durationMs = 1200) => {
    currentTrackRef.current = null;
    setCurrentMusicTrack(null);
    fadeOutAllMusic(durationMs);
  }, []);

  const setAudioSuspended = useCallback(
    (suspended: boolean) => {
      suspendedRef.current = suspended;
      if (suspended) {
        cinematicAutoplayRef.current = false;
        stopMusic(900);
        return;
      }
      applyPendingUnlock();
    },
    // applyPendingUnlock and crossfadeToTrack only read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopMusic],
  );

  const setCinematicAutoplay = useCallback((enabled: boolean) => {
    cinematicAutoplayRef.current = enabled;
    if (!enabled) return;

    if (!unlockedRef.current) {
      unlockedRef.current = true;
      setHasUnlockedAudio(true);
    }

    const track = currentTrackRef.current;
    if (track && musicEnabledRef.current) {
      crossfadeToTrack(track, DEFAULT_CROSSFADE_MS);
    }
    // crossfadeToTrack only reads refs and does not depend on render-time values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playSfx = useCallback((key: SfxKey) => {
    if (suspendedRef.current || !sfxEnabledRef.current || typeof Audio === "undefined") return;
    unlockAudio();
    const asset = SFX_ASSETS[key];
    const now = Date.now();
    const cooldown = asset.cooldownMs ?? 120;
    if ((sfxCooldowns.current[key] ?? 0) > now) return;
    sfxCooldowns.current[key] = now + cooldown;

    const audio = new Audio(asset.src);
    audio.preload = "auto";
    audio.volume = effectiveSfxVolume(asset.volume);
    safePlay(audio);
  }, [unlockAudio]);

  const playEmotionCue = useCallback((delta: EmotionDelta, nextState: EmotionState) => {
    const now = Date.now();
    if (emotionGlobalCooldown.current > now) return;
    let key: SfxKey | null = null;
    if ((delta.patience ?? 0) < -8 || (nextState.patience ?? 100) < 25) key = "emotionPatienceWarning";
    else if ((delta.suspicion ?? 0) > 5) key = "emotionSuspicionUpSoft";
    else if ((delta.trust ?? 0) > 5) key = "emotionTrustUpSoft";
    if (!key) return;

    emotionGlobalCooldown.current = now + 1500;
    playSfx(key);
  }, [playSfx]);

  const playCharacterReaction = useCallback(
    (_characterSlug: string, reaction: CharacterReaction) => {
      const now = Date.now();
      const key = `${_characterSlug}:${reaction}`;
      if ((characterCooldowns.current[key] ?? 0) > now) return;
      characterCooldowns.current[key] = now + 5000;

      const reactionToSfx: Record<CharacterReaction, SfxKey> = {
        unsure: "characterUnsure",
        annoyed: "characterAnnoyed",
        interested: "characterInterested",
        breakthrough: "characterBreakthrough",
      };

      playSfx(reactionToSfx[reaction]);
    },
    [playSfx],
  );

  const value = useMemo<AudioContextValue>(
    () => ({
      musicEnabled: musicEnabledState,
      sfxEnabled: sfxEnabledState,
      voiceEnabled: voiceEnabledState,
      sttEnabled: sttEnabledState,
      sttAutoSend: sttAutoSendState,
      volume: volumeState,
      voiceVolume: voiceVolumeState,
      hasUnlockedAudio,
      isSpeaking,
      currentMusicTrack,
      setMusicEnabled,
      setSfxEnabled,
      setVoiceEnabled,
      setSttEnabled,
      setSttAutoSend,
      setVolume,
      setVoiceVolume,
      resetAudioSettings,
      unlockAudio,
      playSfx,
      playSpeech,
      stopSpeech,
      crossfadeTo,
      stopMusic,
      setAudioSuspended,
      setCinematicAutoplay,
      playEmotionCue,
      playCharacterReaction,
    }),
    [
      musicEnabledState,
      sfxEnabledState,
      voiceEnabledState,
      sttEnabledState,
      sttAutoSendState,
      volumeState,
      voiceVolumeState,
      hasUnlockedAudio,
      isSpeaking,
      currentMusicTrack,
      setMusicEnabled,
      setSfxEnabled,
      setVoiceEnabled,
      setSttEnabled,
      setSttAutoSend,
      setVolume,
      setVoiceVolume,
      resetAudioSettings,
      unlockAudio,
      playSfx,
      playSpeech,
      stopSpeech,
      crossfadeTo,
      stopMusic,
      setAudioSuspended,
      setCinematicAutoplay,
      playEmotionCue,
      playCharacterReaction,
    ],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within AudioProvider");
  return context;
}
