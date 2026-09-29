import { Music2, Play, SkipBack, SkipForward } from "lucide-react";

/** Presentation only. Replace this component when Spotify is implemented. */
export function SpotifyPlaceholder() {
  return <aside className="panel spotify-placeholder" aria-labelledby="spotify-heading">
    <div className="music-art-placeholder" aria-hidden="true"><Music2 size={22} /></div>
    <div className="music-details">
      <h2 id="spotify-heading">Your cozy soundtrack</h2>
      <p className="muted" id="spotify-demo">Spotify placeholder · playback coming later</p>
      <div className="music-controls" role="group" aria-label="Demo player controls" aria-describedby="spotify-demo">
        <button type="button" disabled aria-label="Previous track (unavailable)"><SkipBack size={16} /></button>
        <button type="button" disabled aria-label="Play (unavailable)"><Play size={18} /></button>
        <button type="button" disabled aria-label="Next track (unavailable)"><SkipForward size={16} /></button>
        <span className="music-progress" aria-hidden="true" />
      </div>
    </div>
  </aside>;
}
