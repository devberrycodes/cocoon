import { visualAssets } from "@/lib/visual-assets";

/** Decorative slots never take layout space or intercept task/note controls. */
export function WorkspaceDecorations() {
  return <div className="workspace-decorations" aria-hidden="true">
    {visualAssets.decorations.filter(item => item.slot !== "plant").map(({ slot, src }) => <span key={slot}
      className={`decoration decoration-${slot}`}
      style={src ? { backgroundImage: `url("${src}")` } : undefined} />)}
  </div>;
}

/** The pot rests on the Add Task card's top edge, never over its inputs. */
export function TaskCardPlant() {
  const plant = visualAssets.decorations.find(item => item.slot === "plant");
  if (!plant?.src) return null;
  return <span className="decoration task-card-plant" aria-hidden="true"
    style={{ backgroundImage: `url("${plant.src}")` }} />;
}
