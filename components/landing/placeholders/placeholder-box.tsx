import { cn } from "@/lib/utils";

interface PlaceholderBoxProps {
  label: string;
  className?: string;
  aspectRatio?: string;
}

export function PlaceholderBox({ label, className, aspectRatio = "1/1" }: PlaceholderBoxProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border-2 border-dashed border-[#c9a87a] bg-gradient-to-br from-[#f5e8d4] via-[#efe0c8] to-[#e0c9a8]",
        className
      )}
      style={{ aspectRatio }}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-[#a88860]">{label}</span>
    </div>
  );
}
