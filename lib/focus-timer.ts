export const FOCUS_DURATIONS = [15, 25, 45, 60] as const;
export const DEFAULT_FOCUS_MINUTES = 25;
export type TimerState = { minutes: number; remaining: number; deadline: number | null };
export type TimerAction =
  | { type: "start" | "pause" | "tick"; now: number }
  | { type: "reset" }
  | { type: "duration"; minutes: number };

export function createTimer(minutes = DEFAULT_FOCUS_MINUTES): TimerState {
  return { minutes, remaining: minutes * 60, deadline: null };
}

export function focusTimer(state: TimerState, action: TimerAction): TimerState {
  if (action.type === "reset") return createTimer(state.minutes);
  if (action.type === "duration") {
    return FOCUS_DURATIONS.some(value => value === action.minutes) ? createTimer(action.minutes) : state;
  }
  if (action.type === "start") {
    if (state.deadline !== null || state.remaining === 0) return state;
    return { ...state, deadline: action.now + state.remaining * 1000 };
  }
  if (state.deadline === null) return state;
  const remaining = Math.max(0, Math.ceil((state.deadline - action.now) / 1000));
  return { ...state, remaining, deadline: action.type === "pause" || remaining === 0 ? null : state.deadline };
}
