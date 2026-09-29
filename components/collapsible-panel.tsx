"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";

const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 800px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia("(max-width: 800px)").matches;
const serverSnapshot = () => false;

type PanelKind = "tasks" | "notes" | "music";

function PixelIcon({ kind }: { kind: PanelKind }) {
  const paths = {
    tasks: "M2 3h3v3H2zM7 3h7v2H7zM2 8h3v3H2zM7 8h7v2H7zM2 13h3v2H2zM7 13h7v2H7z",
    notes: "M2 1h12v10h-3v3H2V1zm2 2v9h5V9h3V3H4zm1 2h6v1H5zm0 3h4v1H5z",
    music: "M6 2h8v9h-2V5H8v8H6v2H2v-4h4V2zm4 7h4v4h-4z",
  };
  return <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

/** Keep children mounted so drafts, edits and music survive minimization. */
export function CollapsiblePanel({ kind, label, children }: {
  kind: PanelKind; label: string; children: ReactNode;
}) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverSnapshot);
  const floating = mobile && kind !== "tasks";
  const collapsed = floating ? mobileCollapsed : desktopCollapsed;
  const id = useId();
  return <div className={`collapsible-panel ${kind}-rail${collapsed ? " is-collapsed" : ""}`}>
    <button type="button" className="panel-toggle" aria-expanded={!collapsed} aria-controls={id}
      aria-label={`${collapsed ? "Expand" : "Minimize"} ${label}`}
      onClick={() => floating ? setMobileCollapsed(value => !value) : setDesktopCollapsed(value => !value)}>
      <PixelIcon kind={kind} />
      {collapsed ? <span className="rail-label">{label}</span> : <span aria-hidden="true">−</span>}
    </button>
    <div id={id} className="panel-content" hidden={collapsed}>{children}</div>
  </div>;
}
