"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export default function VideoRecorder({
  onRecordingComplete,
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setError(null);
    } catch {
      setError("Camera/microphone access denied");
    }
  }, []);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasPermission(false);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      onRecordingComplete(blob);
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="relative overflow-hidden rounded-lg bg-zinc-900 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        {!hasPermission && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startPreview}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-gold/90"
            >
              Enable Camera
            </button>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs text-white">{fmt(duration)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      {hasPermission && (
        <div className="flex items-center gap-3">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop Recording
            </button>
          ) : (
            <>
              <button
                onClick={startRecording}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                <span className="h-3 w-3 rounded-full bg-white" />
                Start Recording
              </button>
              <button
                onClick={stopPreview}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Close Camera
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
