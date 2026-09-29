import assert from "node:assert/strict";
import { test } from "node:test";
import { createTimer, focusTimer } from "../lib/focus-timer.ts";

test("focus starts at 25 minutes and counts elapsed seconds", () => {
  const initial = createTimer();
  assert.equal(initial.remaining, 1500);
  const running = focusTimer(initial, { type: "start", now: 1000 });
  assert.equal(focusTimer(running, { type: "tick", now: 6000 }).remaining, 1495);
  assert.equal(focusTimer(running, { type: "start", now: 6000 }), running);
});
test("pause preserves time and resume starts from the remainder", () => {
  const running = focusTimer(createTimer(), { type: "start", now: 0 });
  const paused = focusTimer(running, { type: "pause", now: 10000 });
  assert.equal(paused.remaining, 1490);
  assert.equal(paused.deadline, null);
  assert.equal(focusTimer(paused, { type: "tick", now: 90000 }), paused);
  const resumed = focusTimer(paused, { type: "start", now: 90000 });
  assert.equal(focusTimer(resumed, { type: "tick", now: 95000 }).remaining, 1485);
});
test("reset stops playback and returns to the selected duration", () => {
  const running = focusTimer(createTimer(45), { type: "start", now: 0 });
  assert.deepEqual(focusTimer(running, { type: "reset" }), createTimer(45));
});
test("changing duration resets and stops the timer", () => {
  const running = focusTimer(createTimer(), { type: "start", now: 0 });
  for (const minutes of [15, 25, 45, 60]) {
    assert.deepEqual(focusTimer(running, { type: "duration", minutes }), createTimer(minutes));
  }
  assert.equal(focusTimer(running, { type: "duration", minutes: -1 }), running);
});
test("delayed ticks finish at zero without restarting", () => {
  const running = focusTimer(createTimer(), { type: "start", now: 0 });
  const finished = focusTimer(running, { type: "tick", now: 2000000 });
  assert.equal(finished.remaining, 0);
  assert.equal(finished.deadline, null);
  assert.equal(focusTimer(finished, { type: "start", now: 3000000 }), finished);
});
