import { useState } from "react";
import { Copy, Check, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";

interface HardwareCardProps {
  Icon: LucideIcon;
  title: string;
  color: string;
  mainValue: string | null;
  specs: Array<{ label: string; value: string }>;
  copyText: string;
  usagePercent?: number;
}

export function HardwareCard({ Icon, title, color, mainValue, specs, copyText, usagePercent }: HardwareCardProps) {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const barColor = usagePercent != null && usagePercent >= 85 ? "var(--color-red)" : color;

  return (
    <div className="bg-card border border-edge rounded-[14px] p-4 flex flex-col gap-2.5 transition-all duration-150 hover:border-slate-500 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0"
            style={{ color, backgroundColor: color + "20" }}
          >
            <Icon size={22} />
          </div>
          <div className="text-[16px] font-bold text-fg tracking-tight">{title}</div>
        </div>
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-[8px] border transition-all duration-150 shrink-0 cursor-pointer",
            justCopied
              ? "border-green text-green bg-green/[8%]"
              : "border-edge text-muted hover:border-blue hover:text-blue hover:bg-blue/[8%] disabled:opacity-30 disabled:cursor-not-allowed"
          )}
          onClick={handleCopy}
          disabled={!mainValue}
          title={`${title} 정보 복사`}
        >
          {justCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="text-[17px] font-semibold text-fg leading-snug flex items-center break-keep">
        {mainValue ?? <span className="text-muted text-[13px] font-normal italic">감지 불가</span>}
      </div>

      {usagePercent != null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[5px] bg-white/[8%] rounded-full overflow-hidden">
            <div
              className="h-full rounded-sm transition-[width] duration-[400ms]"
              style={{ width: `${usagePercent}%`, background: barColor }}
            />
          </div>
          <span className="text-[12px] font-bold min-w-[32px] text-right" style={{ color: barColor }}>
            {usagePercent}%
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 flex-1">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-center justify-between">
            <span className="text-[13px] text-muted">{spec.label}</span>
            <span className="text-[14px] font-semibold text-sub">{spec.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
