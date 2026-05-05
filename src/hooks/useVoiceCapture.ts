"use client";

import { useEffect, useRef, useState } from "react";

type MicrophonePermission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

type VoiceCaptureSnapshot = {
  audioUrl: string;
  audioBlob: Blob;
  mimeType: string;
  durationSeconds: number;
  createdAt: string;
  transcriptionText?: string;
  transcribed: boolean;
};

type TranscribeResponse = {
  text?: string;
  durationSeconds?: number;
  provider?: string;
  error?: string;
};

function bestMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  return options.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useVoiceCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("Ready to record a voice note.");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<MicrophonePermission>("unknown");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState("Transcription has not started.");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const objectUrlRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const discardOnStopRef = useRef(false);

  function revokeRecordedUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setRecordedAudioUrl(null);
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  async function startVoiceRecording() {
    setRecordingError(null);
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission("unsupported");
      setRecordingError("Voice recording is not supported in this browser.");
      setRecordingStatus("Voice recording is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setMicrophonePermission("unsupported");
      setRecordingError("MediaRecorder is not supported in this browser.");
      setRecordingStatus("MediaRecorder is not supported in this browser.");
      return;
    }

    try {
      revokeRecordedUrl();
      setRecordedAudioBlob(null);
      setRecordedMimeType(null);
      setTranscriptionText("");
      setTranscriptionError(null);
      setTranscriptionStatus("Transcription has not started.");
      setRecordingDurationSeconds(0);
      setRecordingStatus("Requesting microphone permission...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission("granted");
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      discardOnStopRef.current = false;

      const mimeType = bestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordingError("Voice recording failed.");
        setRecordingStatus("Voice recording failed.");
        setIsRecording(false);
        stopTimer();
        stopStream();
      };
      recorder.onstop = () => {
        stopTimer();
        stopStream();
        if (discardOnStopRef.current) {
          chunksRef.current = [];
          discardOnStopRef.current = false;
          setIsRecording(false);
          mediaRecorderRef.current = null;
          return;
        }
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size === 0) {
          setRecordingError("No audio was recorded.");
          setRecordingStatus("No audio was recorded.");
          setIsRecording(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setRecordedAudioUrl(url);
        setRecordedAudioBlob(blob);
        setRecordedMimeType(type);
        setRecordingDurationSeconds((current) => {
          if (current > 0) return current;
          return startedAtMsRef.current ? Math.max(1, Math.round((Date.now() - startedAtMsRef.current) / 1000)) : 0;
        });
        setRecordingStatus("Voice note recorded. Preview, save, or discard it.");
        setIsRecording(false);
        mediaRecorderRef.current = null;
      };

      const startedAt = Date.now();
      startedAtMsRef.current = startedAt;
      setRecordingStartedAt(new Date(startedAt).toISOString());
      setIsRecording(true);
      setRecordingStatus("Recording...");
      timerRef.current = window.setInterval(() => {
        setRecordingDurationSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      }, 250);
      recorder.start();
    } catch (err) {
      const message = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Microphone permission denied."
        : err instanceof Error
          ? err.message
          : "Could not start voice recording.";
      setMicrophonePermission(message.includes("denied") ? "denied" : "prompt");
      setRecordingError(message);
      setRecordingStatus(message);
      setIsRecording(false);
      stopTimer();
      stopStream();
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecordingStatus("Stopping recording...");
    recorder.stop();
  }

  function discardVoiceRecording() {
    if (isRecording) {
      discardOnStopRef.current = true;
      stopVoiceRecording();
    }
    revokeRecordedUrl();
    setRecordedAudioBlob(null);
    setRecordedMimeType(null);
    setIsTranscribing(false);
    setTranscriptionText("");
    setTranscriptionError(null);
    setTranscriptionStatus("Transcription has not started.");
    setRecordingDurationSeconds(0);
    setRecordingStartedAt(null);
    setRecordingError(null);
    setRecordingStatus("Voice note discarded.");
  }

  function voiceCaptureSnapshot(): VoiceCaptureSnapshot | null {
    if (!recordedAudioUrl || !recordedAudioBlob) return null;
    return {
      audioUrl: recordedAudioUrl,
      audioBlob: recordedAudioBlob,
      mimeType: recordedMimeType || recordedAudioBlob.type || "audio/webm",
      durationSeconds: recordingDurationSeconds,
      createdAt: recordingStartedAt ?? new Date().toISOString(),
      transcriptionText: transcriptionText.trim() || undefined,
      transcribed: Boolean(transcriptionText.trim()),
    };
  }

  async function transcribeRecording() {
    if (!recordedAudioBlob) {
      setTranscriptionError("Record a voice note before transcribing.");
      setTranscriptionStatus("Record a voice note before transcribing.");
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);
    setTranscriptionStatus("Transcribing...");
    try {
      const mimeType = recordedMimeType || recordedAudioBlob.type || "audio/webm";
      const formData = new FormData();
      formData.set("audio", recordedAudioBlob, mimeType.includes("mp4") ? "voice-capture.m4a" : "voice-capture.webm");
      formData.set("mimeType", mimeType);
      formData.set("filename", mimeType.includes("mp4") ? "voice-capture.m4a" : "voice-capture.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as TranscribeResponse | null;
      if (!response.ok) {
        throw new Error(data?.error ?? `Transcription failed (${response.status}).`);
      }
      const text = data?.text?.trim();
      if (!text) throw new Error("Transcription returned no text.");
      setTranscriptionText(text);
      setTranscriptionStatus(`Transcription complete${data?.provider ? ` via ${data.provider}` : ""}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transcription failed.";
      setTranscriptionError(message);
      setTranscriptionStatus(message);
    } finally {
      setIsTranscribing(false);
    }
  }

  useEffect(() => {
    return () => {
      discardOnStopRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        recorder.stop();
      }
      stopTimer();
      stopStream();
      revokeRecordedUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording,
    recordingStatus,
    recordingError,
    recordingDurationSeconds,
    recordedAudioUrl,
    recordedAudioBlob,
    recordedMimeType,
    recordingStartedAt,
    microphonePermission,
    isTranscribing,
    transcriptionText,
    setTranscriptionText,
    transcriptionError,
    transcriptionStatus,
    startVoiceRecording,
    stopVoiceRecording,
    discardVoiceRecording,
    transcribeRecording,
    voiceCaptureSnapshot,
  };
}
