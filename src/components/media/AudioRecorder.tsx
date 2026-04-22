"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

type RecorderState = "idle" | "recording" | "preview";

export default function AudioRecorder({
  onRecordingComplete,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [bars, setBars] = useState<number[]>(new Array(40).fill(4));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playTime, setPlayTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const barsRef = useRef(bars);

  // Keep barsRef in sync
  useEffect(() => { barsRef.current = bars; }, [bars]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [previewUrl]);

  const startWaveformLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      analyser.getByteFrequencyData(dataArray);

      const barCount = 40;
      const step = Math.max(1, Math.floor(bufferLength / barCount));
      const newBars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] / 255;
        newBars.push(Math.max(3, val * 48));
      }
      setBars(newBars);
    };
    loop();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Clean up previous preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewBlob(null);
      }
      setPlayProgress(0);
      setPlayTime(0);
      setIsPlaying(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      // Set up analyser for live waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioCtxRef.current = audioCtx;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewBlob(blob);
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setBars(new Array(40).fill(4));
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start waveform visualization after analyser is set
      startWaveformLoop();
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  }, [startWaveformLoop, previewUrl]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioElRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying]);

  const confirmRecording = useCallback(() => {
    if (previewBlob) {
      onRecordingComplete(previewBlob);
      if (audioElRef.current) audioElRef.current.pause();
      setState("idle");
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPlayProgress(0);
      setPlayTime(0);
    }
  }, [previewBlob, onRecordingComplete]);

  const discardRecording = useCallback(() => {
    if (audioElRef.current) audioElRef.current.pause();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setDuration(0);
    setPlayProgress(0);
    setPlayTime(0);
    setState("idle");
  }, [previewUrl]);

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "--:--";
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // Idle state
  if (state === "idle") {
    return (
      <button
        onClick={startRecording}
        className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-sm font-medium text-zinc-200 transition-all hover:border-gold/40 hover:bg-zinc-900"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold transition group-hover:bg-gold/20">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
          </svg>
        </span>
        <span>Tap to Record</span>
      </button>
    );
  }

  // Recording state with live waveform
  if (state === "recording") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-zinc-950 p-4 space-y-3">
        {/* Timer + pulse */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-mono font-medium text-red-400">
              {fmt(duration)}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Recording
          </span>
        </div>

        {/* Live waveform bars */}
        <div className="flex items-end justify-center gap-[3px] h-12">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[4px] rounded-full bg-gradient-to-t from-red-500/60 to-gold/80"
              style={{ height: `${h}px`, transition: "height 80ms ease-out" }}
            />
          ))}
        </div>

        {/* Stop button */}
        <div className="flex justify-center">
          <button
            onClick={stopRecording}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 hover:scale-105 active:scale-95"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Preview state with custom player
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          Preview · {fmt(duration)}
        </span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          Ready to send
        </span>
      </div>

      {/* Custom audio player */}
      {previewUrl && (
        <>
          <audio
            ref={audioElRef}
            src={previewUrl}
            onTimeUpdate={() => {
              const a = audioElRef.current;
              if (!a) return;
              if (isFinite(a.duration) && a.duration > 0) {
                setPlayProgress((a.currentTime / a.duration) * 100);
              }
              setPlayTime(Math.floor(a.currentTime));
            }}
            onDurationChange={() => {
              const a = audioElRef.current;
              if (a && isFinite(a.duration)) setDuration(Math.floor(a.duration));
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setPlayProgress(0);
              setPlayTime(0);
            }}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <button
              onClick={togglePlay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold transition hover:bg-gold/25"
            >
              {isPlaying ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Progress bar + time */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-8 text-right">{fmt(playTime)}</span>
                <div
                  className="relative h-2 flex-1 cursor-pointer rounded-full bg-zinc-800 overflow-hidden"
                  onClick={(e) => {
                    const a = audioElRef.current;
                    if (!a || !isFinite(a.duration)) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    a.currentTime = pct * a.duration;
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold/70 to-gold"
                    style={{ width: `${playProgress}%`, transition: "width 150ms linear" }}
                  />
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-8">{fmt(duration)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={confirmRecording}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-gold/90 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Use Recording
        </button>
        <button
          onClick={discardRecording}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Discard
        </button>
        <button
          onClick={startRecording}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-record
        </button>
      </div>
    </div>
  );
}
