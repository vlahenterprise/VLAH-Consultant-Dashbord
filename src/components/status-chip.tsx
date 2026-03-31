import { ChipTone } from "@/lib/types";

const toneClasses: Record<ChipTone, string> = {
  neutral:
    "border-white/10 bg-white/6 text-[rgba(228,238,240,0.82)]",
  info: "border-blue-400/20 bg-blue-500/12 text-blue-200",
  success: "border-emerald-400/20 bg-emerald-500/12 text-emerald-200",
  warning: "border-amber-400/20 bg-amber-500/14 text-amber-200",
  danger: "border-red-400/20 bg-red-500/14 text-red-200",
  accent:
    "border-[rgba(240,81,35,0.22)] bg-[rgba(240,81,35,0.14)] text-[#ffb49d]",
};

export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: ChipTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
