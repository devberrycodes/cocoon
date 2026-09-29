"use client";

import { useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/client/supabase';
import { ensureSession } from '@/lib/client/api';
import { TaskWorkspace } from './task-workspace';

export function AuthWorkspace() {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user.id ?? null);
    });
    ensureSession().then(session => { if (active) { setUserId(session.user.id); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [attempt]);
  if (userId) return <TaskWorkspace key={userId} />;
  return <main id="main" className="page-width main-content"><section className="panel" role="status">
    {error ? <>Could not open your private workspace. <button className="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Retry</button></> : 'Opening your private workspace…'}
  </section></main>;
}
