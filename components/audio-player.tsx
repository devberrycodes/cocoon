"use client";

import { useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { audioConfig } from "@/lib/audio";

function timestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  function fail() {
    setPlaying(false);
    setLoading(false);
    setError(true);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError(false);
    setLoading(true);
    audio.volume = volume;
    if (!audio.getAttribute("src")) audio.src = audioConfig.src;
    else if (audio.error) audio.load();
    try {
      await audio.play();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      fail();
    }
  }

  return (
    <section className="panel audio-player" aria-labelledby="music-heading">
      <div className={`music-disc${playing ? " is-playing" : ""}`} aria-hidden="true">
        <span className="music-disc-label">cocoon</span>
      </div>
      <div className="audio-player-controls">
        <h2 id="music-heading">{audioConfig.title}</h2>
        <p className="muted" role="status">
          {error ? "Music couldn’t load. Try again." : loading ? "Loading music…" : playing ? "Take your time ♡" : "Your cozy soundtrack"}
        </p>
        <button className="button music-play" type="button" onClick={togglePlayback} aria-label={playing || loading ? "Pause music" : error ? "Retry music" : "Play music"}>
          {playing || loading ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          
        </button>
        <label className="music-seek">
          <span className="sr-only">Seek music</span>
          <input type="range" min="0" max={duration || 1} step="1"
            disabled={!duration || error} value={Math.min(position, duration)}
            aria-valuetext={`${timestamp(position)} of ${timestamp(duration)}`}
            onChange={(event) => {
              const audio = audioRef.current;
              if (!audio || !duration) return;
              const next = Math.min(duration, Math.max(0, Number(event.target.value)));
              audio.currentTime = next;
              setPosition(next);
            }} />
        </label>
        <div className="music-time"><span>{timestamp(position)}</span><span>{duration ? timestamp(duration) : "—:—"}</span></div>
        <label className="music-volume">
          <Volume2 size={14} aria-hidden="true" /><span className="sr-only">Volume</span>
          <input type="range" min="0" max="1" step="0.01" value={volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              setVolume(value);
              if (audioRef.current) audioRef.current.volume = value;
            }} />
        </label>
      </div>
      <audio ref={audioRef} preload="none" loop
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) && value > 0 ? value : 0);
        }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onPlaying={() => { setPlaying(true); setLoading(false); setError(false); }}
        onWaiting={() => { setPlaying(false); setLoading(true); }}
        onPause={() => { setPlaying(false); setLoading(false); }}
        onEnded={() => { setPlaying(false); setLoading(false); }}
        onError={fail}
      />
    </section>
  );
}
