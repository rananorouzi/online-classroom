"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformPlayerProps {
  /** S3 key for the audio file */
  audioKey?: string | null;
  /** Pre-computed waveform peaks (JSON) to avoid re-decoding */
  peaks?: number[] | null;
  /** Height in px */
  height?: number;
}

export default function WaveformPlayer({
  audioKey,
  peaks,
  height = 64,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState("0:00");
  const [currentTime, setCurrentTime] = useState("0:00");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioKey) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/media/signed-url?key=${encodeURIComponent(audioKey)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.url) {
          setSignedUrl(data.url);
        } else {
          setError(data.error || "Audio unavailable");
        }
      } catch {
        if (!cancelled) setError("Failed to load audio");
      }
    })();

    return () => { cancelled = true; };
  }, [audioKey]);

  useEffect(() => {
    if (!containerRef.current || !signedUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#555",
      progressColor: "#D4AF37",
      cursorColor: "#D4AF37",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height,
      normalize: true,
      ...(peaks ? { peaks: [peaks] } : {}),
    });

    ws.load(signedUrl);

    ws.on("ready", () => {
      setDuration(formatTime(ws.getDuration()));
    });

    ws.on("audioprocess", () => {
      setCurrentTime(formatTime(ws.getCurrentTime()));
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [signedUrl, peaks, height]);

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  if (!audioKey) return null;

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-xs font-medium text-red-300">Unable to load audio</p>
          <p className="mt-0.5 text-[11px] text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3">
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-black transition hover:scale-105"
      >
        {isPlaying ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>
      <div ref={containerRef} className="flex-1" />
      <span className="shrink-0 text-xs text-zinc-400">
        {currentTime} / {duration}
      </span>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
