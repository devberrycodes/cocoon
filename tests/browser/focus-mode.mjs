// Run against a production/dev server and a Chrome instance with remote debugging on port 9227.
// Task/note API responses are mocked; no database writes are made.
import assert from 'node:assert/strict';
(async()=>{
const tabs=await (await fetch('http://localhost:9227/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type === "page").webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if (m.error) p.reject(m.error); else p.resolve(m.result)}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
const run=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,userGesture:true,awaitPromise:true})).result.value;
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', {source: `
(()=>{ const task={id:'test-task',title:'Focus test task',description:'Keep it calm',priority:'high',completed:false,due_date:null,created_at:'2026-09-29',updated_at:'2026-09-29'};
const originalFetch=window.fetch;
window.fetch=async (url, options={})=>{
 if(String(url).startsWith('/api/tasks')) {
  if(options.method==='PATCH') { window.lastUpdate=JSON.parse(options.body); Object.assign(task,window.lastUpdate); return Response.json(task); }
  return Response.json([task]);
 }
 if(String(url).startsWith('/api/notes')) return Response.json([{id:'note',task_id:task.id,content:'Only this note',color:'cream'}]);
 return originalFetch(url,options);
}; })();`});
await send('Page.navigate',{url:process.env.COCOON_URL || 'http://localhost:3015'});
await new Promise(r=>setTimeout(r,1500));
const click=async text=>{ await run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`); await new Promise(r=>setTimeout(r,100)); };
await click('Focus');
assert.equal(await run('document.querySelector("#focus-heading").textContent'),'Focus test task');
assert.equal(await run('document.activeElement.id'),'focus-heading');
assert.equal(await run('getComputedStyle(document.querySelector(".tasks-rail")).display'),'none');
assert.equal(await run('getComputedStyle(document.querySelector(".notes-rail")).display'),'none');
assert.equal(await run('document.querySelector(".focus-card .task-note-bullets").textContent'),'Only this note');
assert.equal(await run('document.querySelector(".focus-clock").textContent'),'25:00');
await click('Start'); await new Promise(r=>setTimeout(r,1200)); await click('Pause');
const paused=await run('document.querySelector(".focus-clock").textContent');assert.notEqual(paused,'25:00');
await new Promise(r=>setTimeout(r,1100));assert.equal(await run('document.querySelector(".focus-clock").textContent'),paused);
await click('Reset');assert.equal(await run('document.querySelector(".focus-clock").textContent'),'25:00');
await run(`const select=document.querySelector('#focus-duration'); select.value='15'; select.dispatchEvent(new Event('change',{bubbles:true}));`);
assert.equal(await run('document.querySelector(".focus-clock").textContent'),'15:00');
await click('Mark task complete');await new Promise(r=>setTimeout(r,100));
assert.equal(await run('window.lastUpdate.completed'),true);
assert.equal(await run('document.querySelector(".focus-completed").textContent'),'✓ Task completed');
assert.equal(await run('document.querySelector(".focus-clock").textContent'),'15:00');
assert.equal(await run('document.querySelectorAll("audio").length'),1);
await click('Exit Focus Mode');assert.equal(await run('document.querySelector(".focus-card")'),null);
await new Promise(r=>setTimeout(r,100));assert.equal(await run('document.activeElement.textContent'),'Focus');
assert.equal(await run('document.querySelector(".task-heading input").checked'),true);
console.log('PASS: enter, selected notes, start/pause/reset/duration, complete via API, exit and restored focus');ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
