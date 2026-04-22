"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

interface HlsPlayerProps {
  sessionId: string;
  videoKey: string | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  seekRef?: React.MutableRefObject<((time: number) => void) | null>;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5];

export default function HlsPlayer({ sessionId, videoKey, onTimeUpdate, seekRef }: HlsPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [speed, setSpeed] = useState(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLocalDev, setIsLocalDev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoKey) return;
    const key = videoKey;
    let cancelled = false;

    async function fetchSignedUrl() {
      try {
        const res = await fetch(
          `/api/media/signed-url?key=${encodeURIComponent(key)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.url) {
          setSignedUrl(data.url);
          setIsLocalDev(!!data.local);
        } else {
          setError(data.error || "Video unavailable");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch signed URL", err);
        setError("Failed to load video — media service unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSignedUrl();

    // Refresh signed URL every 50 minutes (before 60 min expiry)
    const interval = setInterval(fetchSignedUrl, 50 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [videoKey]);

  useEffect(() => {
    if (!signedUrl || !videoRef.current) {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      return;
    }

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-fluid");
    videoRef.current.appendChild(videoElement);

    // Detect source type: MP4 for local dev, HLS for S3
    const sourceType = isLocalDev || signedUrl.endsWith(".mp4")
      ? "video/mp4"
      : "application/x-mpegURL";

    const player = videojs(videoElement, {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{ src: signedUrl, type: sourceType }],
      ...(sourceType === "application/x-mpegURL"
        ? {
            html5: {
              vhs: {
                overrideNative: true,
                enableLowInitialPlaylist: true,
              },
            },
          }
        : {}),
    });

    playerRef.current = player;

    // Expose time updates for timestamp comments
    if (onTimeUpdate) {
      player.on("timeupdate", () => {
        const ct = player.currentTime() || 0;
        const dur = player.duration() || 0;
        onTimeUpdate(ct, dur);
      });
    }

    // Expose seek function
    if (seekRef) {
      seekRef.current = (time: number) => {
        if (player && !player.isDisposed()) {
          player.currentTime(time);
        }
      };
    }

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [signedUrl, isLocalDev, onTimeUpdate, seekRef]);

  useEffect(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.playbackRate(speed);
    }
  }, [speed]);

  if (!videoKey) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
        No lesson video available for this session
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl bg-zinc-900 text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        <p className="text-sm">{error}</p>
        <p className="text-xs text-zinc-600">Configure real AWS S3 credentials to enable video playback</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div ref={videoRef} data-session-id={sessionId} />
      {/* Speed Control */}
      <div className="flex items-center gap-2 border-t border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-400">Practice Speed:</span>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              speed === s
                ? "bg-gold text-black"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
