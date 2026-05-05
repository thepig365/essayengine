"use client";

import { useEffect, useRef, useState } from "react";
import { downloadMergedTts, downloadTtsParts, MAX_TOTAL_TTS_CHARS, splitTextForTts } from "@/lib/playTts";

export type AudioPlayerState = "idle" | "loading" | "playing" | "paused" | "finished" | "error";

export type AudioPlayerModel = {
  state: AudioPlayerState;
  label: string;
  partIndex: number;
  partTotal: number;
  currentTime: number;
  duration: number;
  message: string;
};

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function useAudioWorkspace() {
  const [ttsVoice, setTtsVoice] = useState("echo");
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsStyle, setTtsStyle] = useState("Default");
  const [ttsStatus, setTtsStatus] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayerModel>({
    state: "idle",
    label: "Audio player",
    partIndex: 0,
    partTotal: 0,
    currentTime: 0,
    duration: 0,
    message: "Choose source, result, or final audio to start listening.",
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioChunksRef = useRef<string[]>([]);
  const audioLabelRef = useRef("Audio player");
  const audioRequestIdRef = useRef(0);

  const audioProgressPercent = audioPlayer.duration > 0
    ? Math.min(100, Math.max(0, (audioPlayer.currentTime / audioPlayer.duration) * 100))
    : 0;
  const audioCanMovePrev = audioPlayer.partIndex > 0 && audioPlayer.state !== "loading";
  const audioCanMoveNext = audioPlayer.partIndex + 1 < audioPlayer.partTotal && audioPlayer.state !== "loading";
  const audioCanToggle = audioPlayer.state === "playing" || audioPlayer.state === "paused";

  function ttsOptions() {
    return {
      voice: ttsVoice,
      speed: ttsSpeed,
      style: ttsStyle === "Default" ? undefined : ttsStyle.toLowerCase(),
    };
  }

  function releaseAudioUrl() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function stopCurrentAudio(resetPlayer = true) {
    audioRequestIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    releaseAudioUrl();
    setTtsLoading(false);
    if (resetPlayer) {
      setAudioPlayer((current) => ({
        ...current,
        state: "idle",
        currentTime: 0,
        duration: 0,
        message: "Choose source, result, or final audio to start listening.",
      }));
    }
  }

  async function fetchTtsPart(text: string): Promise<Blob> {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, ...ttsOptions() }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Audio generation failed.");
    }
    return response.blob();
  }

  async function playAudioPart(index: number) {
    const chunks = audioChunksRef.current;
    if (index < 0 || index >= chunks.length) return;

    stopCurrentAudio(false);
    const requestId = audioRequestIdRef.current;
    setTtsLoading(true);
    setTtsStatus("Generating audio...");
    setAudioPlayer((current) => ({
      ...current,
      state: "loading",
      label: audioLabelRef.current,
      partIndex: index,
      partTotal: chunks.length,
      currentTime: 0,
      duration: 0,
      message: "Generating audio...",
    }));

    try {
      const blob = await fetchTtsPart(chunks[index]);
      if (audioRequestIdRef.current !== requestId) return;
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audioRequestIdRef.current !== requestId) return;
        setAudioPlayer((current) => ({
          ...current,
          duration: Number.isFinite(audio.duration) ? audio.duration : 0,
        }));
      };
      audio.ontimeupdate = () => {
        if (audioRequestIdRef.current !== requestId) return;
        setAudioPlayer((current) => ({
          ...current,
          currentTime: audio.currentTime,
          duration: Number.isFinite(audio.duration) ? audio.duration : current.duration,
        }));
      };
      audio.onplay = () => {
        if (audioRequestIdRef.current !== requestId) return;
        setTtsLoading(false);
        setTtsStatus(null);
        setAudioPlayer((current) => ({
          ...current,
          state: "playing",
          message: "Playing",
        }));
      };
      audio.onpause = () => {
        if (audioRequestIdRef.current !== requestId) return;
        if (audio.ended) return;
        setAudioPlayer((current) => ({
          ...current,
          state: "paused",
          message: "Paused",
        }));
      };
      audio.onended = () => {
        if (audioRequestIdRef.current !== requestId) return;
        releaseAudioUrl();
        if (index + 1 < chunks.length) {
          void playAudioPart(index + 1);
          return;
        }
        audioRef.current = null;
        setAudioPlayer((current) => ({
          ...current,
          state: "finished",
          currentTime: current.duration,
          message: "Finished",
        }));
      };
      audio.onerror = () => {
        if (audioRequestIdRef.current !== requestId) return;
        releaseAudioUrl();
        audioRef.current = null;
        setTtsLoading(false);
        setTtsStatus("Audio generation failed.");
        setAudioPlayer((current) => ({
          ...current,
          state: "error",
          message: "Audio generation failed.",
        }));
      };
      await audio.play();
    } catch {
      stopCurrentAudio();
      setTtsLoading(false);
      setTtsStatus("Audio generation failed.");
      setAudioPlayer((current) => ({
        ...current,
        state: "error",
        message: "Audio generation failed.",
      }));
    }
  }

  function startAudioPlayer(text: string, label: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setTtsStatus("No text to read.");
      setAudioPlayer((current) => ({ ...current, state: "error", message: "No text to read." }));
      return;
    }
    if (trimmed.length > MAX_TOTAL_TTS_CHARS) {
      const message = "Text is too long for one audio export. Please select a shorter section.";
      setTtsStatus(message);
      setAudioPlayer((current) => ({ ...current, state: "error", message }));
      return;
    }

    audioChunksRef.current = splitTextForTts(trimmed);
    audioLabelRef.current = label;
    void playAudioPart(0);
  }

  function toggleAudioPlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function seekAudio(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setAudioPlayer((current) => ({ ...current, currentTime: value }));
  }

  function playPreviousAudioPart() {
    void playAudioPart(Math.max(0, audioPlayer.partIndex - 1));
  }

  function playNextAudioPart() {
    void playAudioPart(Math.min(audioPlayer.partTotal - 1, audioPlayer.partIndex + 1));
  }

  async function runTtsAction(
    action: "play" | "parts" | "merged",
    text: string,
    baseFilename: string,
    mergedFilename: string,
  ) {
    const trimmed = text.trim();
    if (!trimmed) {
      setTtsStatus("No text to read.");
      return;
    }
    if (trimmed.length > MAX_TOTAL_TTS_CHARS) {
      setTtsStatus("Text is too long for one audio export. Please select a shorter section.");
      return;
    }

    setTtsLoading(true);
    try {
      if (action === "play") {
        startAudioPlayer(trimmed, baseFilename.includes("source") ? "Source audio" : baseFilename.includes("final") ? "Final audio" : "Result audio");
        return;
      } else if (action === "parts") {
        setTtsStatus("Preparing audio...");
        await downloadTtsParts(trimmed, ttsOptions(), baseFilename, setTtsStatus);
        setTtsStatus("Download ready.");
      } else {
        setTtsStatus("Preparing audio...");
        await downloadMergedTts(trimmed, ttsOptions(), mergedFilename, setTtsStatus);
        setTtsStatus("Download ready.");
      }
    } catch (err) {
      setTtsStatus(err instanceof Error ? err.message : "Audio generation failed.");
      setAudioPlayer((current) => ({ ...current, state: "error", message: "Audio generation failed." }));
    } finally {
      if (action !== "play") setTtsLoading(false);
    }
  }

  useEffect(() => {
    return () => stopCurrentAudio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ttsVoice,
    setTtsVoice,
    ttsSpeed,
    setTtsSpeed,
    ttsStyle,
    setTtsStyle,
    ttsStatus,
    setTtsStatus,
    ttsLoading,
    audioPlayer,
    audioProgressPercent,
    audioCanMovePrev,
    audioCanMoveNext,
    audioCanToggle,
    runTtsAction,
    stopCurrentAudio,
    toggleAudioPlayback,
    seekAudio,
    playPreviousAudioPart,
    playNextAudioPart,
  };
}
