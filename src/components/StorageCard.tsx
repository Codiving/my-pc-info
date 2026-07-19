import { HardDrive, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { DriveInfo } from "../types/hardware";
import { cn } from "../utils/cn";

interface StorageCardProps {
  drives: DriveInfo[];
}

function UsageBar({ percent, warn }: { percent: number; warn: boolean }) {
  const color = percent >= 90 ? "var(--color-red)" : warn ? "#f59e0b" : "var(--color-green)";
  return (
    <div className="flex-1 h-[5px] bg-white/[8%] rounded-full overflow-hidden">
      <div
        className="h-full rounded-sm transition-[width] duration-[400ms]"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

export function StorageCard({ drives }: StorageCardProps) {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    const text = drives.map(d =>
      `[${d.letter}] ${d.label || "로컬 디스크"} — ${d.free_gb.toFixed(0)}GB 여유 / ${d.total_gb.toFixed(0)}GB (${d.drive_type})`
    ).join("\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  if (drives.length === 0) return null;

  return (
    <div className="bg-card border border-edge rounded-[14px] p-4 flex flex-col gap-2.5 transition-all duration-150 hover:border-edge/80 shadow-[0_2px_12px_rgba(0,0,0,0.22)] hover:shadow-[0_3px_14px_rgba(0,0,0,0.26)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 text-muted bg-white/[4%] border border-edge/60">
            <HardDrive size={22} />
          </div>
          <div className="text-[16px] font-bold text-fg">저장장치</div>
        </div>
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-[8px] border transition-all duration-150 shrink-0 cursor-pointer",
            justCopied
              ? "border-edge text-green bg-white/[4%]"
              : "border-edge text-muted hover:border-edge hover:text-fg hover:bg-white/[4%]"
          )}
          onClick={handleCopy}
          title="저장장치 정보 복사"
        >
          {justCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="flex flex-col gap-3.5">
        {drives.map((drive) => {
          const warn = drive.free_gb / drive.total_gb < 0.1;
          const critical = drive.free_gb / drive.total_gb < 0.05;
          return (
            <div key={drive.letter} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[15px] font-bold text-fg">{drive.letter}</span>
                  {drive.is_boot && (
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded-[5px] bg-white/[4%] text-sub border border-edge/60">
                      부팅
                    </span>
                  )}
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-[5px] bg-white/[4%] text-muted border border-edge/60">
                    {drive.drive_type}
                  </span>
                  {drive.label && <span className="text-[13px] text-muted">{drive.label}</span>}
                </div>
                <div className="text-[13px] whitespace-nowrap">
                  <span className={cn("font-semibold", critical ? "text-red" : warn ? "text-amber" : "text-sub")}>
                    {drive.free_gb.toFixed(0)}GB 여유
                  </span>
                  <span className="text-muted"> / {drive.total_gb.toFixed(0)}GB</span>
                </div>
              </div>
              <UsageBar percent={drive.used_percent} warn={warn} />
              <div className="text-[12px] text-muted overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">
                {drive.model || drive.file_system}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
