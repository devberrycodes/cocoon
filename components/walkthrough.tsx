"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cocoon:walkthrough-seen:v1";
const steps = [
  { target: ".brand", icon: "✦", title: "Welcome to your cocoon", text: "A little space for tasks, ideas, and one thing at a time. Here’s a quick look around." },
  { target: "[data-tour=add-task]", icon: "✓", title: "Start with a task", text: "Click + Add task above your task list to open the form. Give it a title, then add a description, priority, or due date if you like. Saving closes the form and puts your new task at the top of the list." },
  { target: ".tasks-rail", icon: "☷", title: "Your tasks live here", text: "Edit a task’s description to keep its details together. Check off finished tasks to celebrate and move them to the bottom. Use Focus to spend time on just this task. The minimize control folds this panel away without losing anything." },
  { target: ".notes-rail", icon: "✎", title: "Keep your ideas close", text: "General Notes live independently on this clipboard. Add an idea, edit it with the pencil, change its color, or delete it." },
  { target: "[data-tour=focus]", icon: "◷", title: "Make room to focus", text: "Choose Focus on a task, or the Start Focus Mode circle in the center. Pick a duration, then start your timer. Finishing a session doesn’t complete the task—you decide when it’s done." },
  { target: ".music-rail", icon: "♫", title: "Settle into your space", text: "Press Play on Cocoon radio for music. Drag the timeline to skip ahead, adjust the volume, or minimize panels to enjoy the background. You can replay this guide with the question mark in the navbar." },
];

export function Walkthrough() {
  const dialog = useRef<HTMLDialogElement>(null);
  const replay = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const autoOpen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const spotlight = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const originScroll = useRef(0);

  function start() {
    originScroll.current = window.scrollY;
    setStep(0);
    setOpen(true);
    dialog.current?.showModal();
  }

  useEffect(() => {
    if (!open) return;
    const selected = Array.from(document.querySelectorAll<HTMLElement>(steps[step].target)).find(element => element.getClientRects().length > 0);
    const target = selected?.closest<HTMLElement>(".is-collapsed")?.querySelector<HTMLElement>(".panel-toggle") ?? selected;
    if (!target || !tooltip.current || !spotlight.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
    let frame = 0;
    const position = () => {
      const box = target.getBoundingClientRect();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const left = Math.max(8, box.left - 6);
      const top = Math.max(8, box.top - 6);
      const right = Math.min(width - 8, box.right + 6);
      const bottom = Math.min(height - 8, box.bottom + 6);
      const tip = tooltip.current;
      const light = spotlight.current;
      if (!tip || !light) return;
      Object.assign(light.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, right - left)}px`, height: `${Math.max(0, bottom - top)}px` });
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let x = right + 18;
      let y = top;
      let side = "left";
      if (x + tw > width - 12) {
        if (left - tw - 18 >= 12) { x = left - tw - 18; side = "right"; }
        else {
          x = Math.max(12, Math.min(width - tw - 12, left));
          if (bottom + th + 18 <= height - 12) { y = bottom + 18; side = "top"; }
          else if (top - th - 18 >= 12) { y = top - th - 18; side = "bottom"; }
          else { y = height - th - 12; side = "none"; }
        }
      }
      y = Math.max(12, Math.min(height - th - 12, y));
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      tip.dataset.side = side;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
    position();
    const observer = new ResizeObserver(schedule);
    observer.observe(target);
    observer.observe(tooltip.current);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    heading.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [open, step]);

  useEffect(() => {
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { /* Storage may be disabled. */ }
    autoOpen.current = setTimeout(() => {
      // Do not interrupt another modal the visitor has already opened.
      if (!document.querySelector("dialog[open]")) start();
    }, 1500);
    return () => { if (autoOpen.current) clearTimeout(autoOpen.current); };
  }, []);

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* The guide still works without storage. */ }
    setOpen(false);
    dialog.current?.close();
    window.scrollTo({ top: originScroll.current, behavior: "instant" });
    replay.current?.focus({ preventScroll: true });
  }

  function move(next: number) {
    setStep(next);

  }

  return <>
    <button ref={replay} className="button help-button" aria-label="How to use Cocoon" title="How to use Cocoon" onClick={() => {
      if (autoOpen.current) clearTimeout(autoOpen.current);
      start();
    }}><span aria-hidden="true">?</span></button>
    <dialog ref={dialog} className="walkthrough guided-tour" aria-labelledby="tour-heading" aria-describedby="tour-description"
      onCancel={event => { event.preventDefault(); finish(); }}>
      <div ref={spotlight} className="tour-spotlight" aria-hidden="true" />
      <div ref={tooltip} className="tour-tooltip">
      <div className="tour-top"><span className="muted">{step + 1} of {steps.length}</span><button className="button" onClick={finish}>Skip tour</button></div>
      <div className="tour-icon" aria-hidden="true">{steps[step].icon}</div>
      <h2 id="tour-heading" ref={heading} tabIndex={-1}>{steps[step].title}</h2>
      <p id="tour-description">{steps[step].text}</p>
      <div className="tour-actions">
        <button className="button" disabled={step === 0} onClick={() => move(step - 1)}>Back</button>
        {step === steps.length - 1 ? <button className="button primary" onClick={finish}>Let’s begin</button> :
          <button className="button primary" onClick={() => move(step + 1)}>Next</button>}
      </div>
      </div>
    </dialog>
  </>;
}
