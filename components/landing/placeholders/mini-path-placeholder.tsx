import { Check, KeyRound, Lock } from "lucide-react";

const nodes = [
  { level: 1, state: "done" },
  { level: 2, state: "done" },
  { level: 3, state: "current" },
  { level: 4, state: "locked" },
] as const;

export function MiniPathPlaceholder() {
  return (
    <div className="mini-quest-path">
      {nodes.map((node, index) => (
        <div key={node.level} className="mini-quest-path__stop">
          <div className={`mini-quest-path__node mini-quest-path__node--${node.state}`}>
            {node.state === "done" && <Check className="h-3.5 w-3.5" />}
            {node.state === "current" && <KeyRound className="h-3.5 w-3.5" />}
            {node.state === "locked" && <Lock className="h-3.5 w-3.5" />}
          </div>
          <span>{node.state === "current" ? "Cel" : node.level}</span>
          {index < nodes.length - 1 && <i aria-hidden />}
        </div>
      ))}
    </div>
  );
}
