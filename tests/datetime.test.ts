import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateTaskFields } from '../lib/task-validation.ts';
import { localDateTime, validDue } from '../lib/dates.ts';

test('date/time accepts future timezone-aware values and can be cleared', () => {
  for (const due_date of ['2099-09-30T18:00:00+01:00', '2099-09-30T17:00:00.000Z', null]) {
    assert.equal(validateTaskFields({ due_date }, 'update').error, undefined);
  }
});
test('date/time rejects past times, invalid dates and ambiguous local timestamps', () => {
  for (const due_date of [new Date(Date.now() - 3600000).toISOString(), '2099-02-30T10:00:00Z', '2099-09-30T18:00', '2099-09-30T25:00:00Z']) {
    assert.ok(validateTaskFields({ due_date }, 'update').error);
  }
});
test('current minute is valid at the input precision', () => {
  assert.equal(validateTaskFields({ due_date: new Date().toISOString() }, 'update').error, undefined);
});
test('local datetime input round-trips the selected minute without timezone shift', () => {
  const local = '2099-09-30T18:30';
  assert.equal(localDateTime(new Date(local).toISOString()), local);
  assert.equal(validDue('2099-02-29T18:30:00Z'), false);
});
