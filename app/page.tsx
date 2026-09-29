import { AmbientBackground } from "@/components/ambient-background";
import { TaskWorkspace } from "@/components/task-workspace";

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="startup-screen" aria-hidden="true">
        <span className="startup-word">{Array.from("cocoon").map((letter, index) => <span key={index} style={{ animationDelay: `${index * 110}ms` }}>{letter}</span>)}</span>
      </div>
      <TaskWorkspace />
    </>
  );
}
