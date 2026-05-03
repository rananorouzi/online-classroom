"use client";

import { useState, useRef, useCallback } from "react";

interface StyledAudioPlayerProps {
  src: string;
  compact?: boolean;
}

export default function StyledAudioPlayer({ src, compact }: StyledAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
    } else {
      a.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * a.duration;
  }, []);

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "--:--";
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const btnSize = compact ? "h-8 w-8" : "h-10 w-10";
  const iconSize = compact ? "h-3 w-3" : "h-4 w-4";
  const barHeight = compact ? "h-1.5" : "h-2";

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-xs font-medium text-red-300">Unable to load audio</p>
          <p className="mt-0.5 text-[11px] text-red-400/80">The audio file could not be played. It may be unavailable or the storage service is not configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a && isFinite(a.duration)) setDuration(a.duration);
        }}
        onDurationChange={() => {
          const a = audioRef.current;
          if (a && isFinite(a.duration)) setDuration(a.duration);
        }}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (!a) return;
          if (isFinite(a.duration) && a.duration > 0) {
            setDuration(a.duration);
            setProgress((a.currentTime / a.duration) * 100);
          }
          setCurrentTime(a.currentTime);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onError={() => setLoadError(true)}
        className="hidden"
      />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={`flex ${btnSize} shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold transition hover:bg-gold/25`}
      >
        {isPlaying ? (
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className={`${iconSize} ml-0.5`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress + time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-8 text-right">{fmt(currentTime)}</span>
          <div
            className={`relative ${barHeight} flex-1 cursor-pointer rounded-full bg-zinc-800 overflow-hidden`}
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold/70 to-gold"
              style={{ width: `${progress}%`, transition: "width 150ms linear" }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-8">{duration && isFinite(duration) ? fmt(duration) : "--:--"}</span>
        </div>
      </div>
    </div>
  );
}
