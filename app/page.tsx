import { TaskWorkspace } from "@/components/task-workspace";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="page-width">
          <p className="brand">Cocoon</p>
          <p className="muted">Make room for what matters.</p>
        </div>
      </header>
      <main id="main" className="page-width main-content">
        <div className="page-intro"><h1>Your workspace</h1><p className="muted">Organise your tasks and keep your notes close.</p></div>
        <TaskWorkspace />
      </main>
    </>
  );
}
