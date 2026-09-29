"use client";

import { useEffect, useState, type CSSProperties } from "react";

export function CompletionConfetti() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return <div className="completion-confetti" aria-hidden="true">
    {Array.from({ length: 72 }, (_, index) => <i key={index} style={{
      "--x": `${(index * 37 % 100)}vw`, "--delay": `${index % 8 * 65}ms`,
      "--drift": `${(index % 7 - 3) * 22}px`,
      "--color": ["#76344c", "#efb9cf", "#c2d5b3", "#f4dc9b"][index % 4],
    } as CSSProperties} />)}
  </div>;
}
