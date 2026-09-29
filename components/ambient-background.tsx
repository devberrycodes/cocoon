"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { visualAssets } from "@/lib/visual-assets";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribe(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function AmbientBackground() {
  const reducedMotion = useSyncExternalStore(subscribe, () => window.matchMedia(motionQuery).matches, () => true);
  const [paused, setPaused] = useState(false);
  const [slides, setSlides] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Load before displaying so a missing image never fades to an empty slide.
    const images = [...new Set(visualAssets.backgroundImages)].map(src => {
      const image = new Image();
      const loaded = new Promise<string | null>(resolve => {
        image.onload = () => resolve(src);
        image.onerror = () => resolve(null);
      });
      image.src = src;
      return { image, loaded };
    });
    void Promise.all(images.map(item => item.loaded)).then(results => {
      if (!cancelled) setSlides(results.filter((src): src is string => src !== null));
    });
    return () => {
      cancelled = true;
      images.forEach(({ image }) => { image.onload = null; image.onerror = null; });
    };
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % slides.length), 10_000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);

  return <>
    <div className="background-layer" aria-hidden="true">
      {slides.map((src, index) => <div key={src}
        className={`background-slide${index === active ? " is-active" : ""}`}
        style={{ backgroundImage: `url("${src}")` }} />)}
    </div>
    {slides.length > 1 && !reducedMotion && <button className="button ambient-control" type="button" aria-pressed={paused}
      onClick={() => setPaused(value => !value)}>{paused ? "Resume slideshow" : "Pause slideshow"}</button>}
  </>;
}
