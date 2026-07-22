import { HardDrive, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { DriveInfo, StorageHealthInfo, StorageHealthLevel } from "../types/hardware";
import { cn } from "../utils/cn";

interface StorageCardProps {
  drives: DriveInfo[];
  storageHealth: StorageHealthInfo;
}

function healthLabel(status: StorageHealthLevel): string {
  switch (status) {
    case "healthy":
      return "정상";
    case "warning":
      return "주의";
    case "unhealthy":
      return "불량";
    case "unsupported":
      return "지원 안 됨";
    default:
      return "감지 불가";
  }
}

function healthColor(status: StorageHealthLevel): string {
  switch (status) {
    case "healthy":
      return "var(--color-ok)";
    case "warning":
      return "var(--color-warn)";
    case "unhealthy":
      return "var(--color-red)";
    default:
      return "var(--color-muted)";
  }
}

function UsageBar({ percent, critical }: { percent: number; critical: boolean }) {
  const color = critical ? "var(--color-red)" : "#f97316";
  return (
    <div className="flex-1 h-[5px] bg-fill-5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-sm transition-[width] duration-[400ms]"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

export function StorageCard({ drives, storageHealth }: StorageCardProps) {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    const text = drives.map(d =>
      `[${d.letter}] ${d.label || "로컬 디스크"} — ${d.free_gb.toFixed(0)}GB 여유 / ${d.total_gb.toFixed(0)}GB (${d.drive_type})`
    ).join("\n");
    await navigator.clipboard.writeText(text).catch(() => {});
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-edge rounded-[14px] p-4 flex flex-col gap-2.5 transition-all duration-150 hover:border-edge/80 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 bg-fill-3 border border-edge/60" style={{ color: "#f97316" }}>
            <HardDrive size={22} />
          </div>
          <div className="text-[16px] font-bold text-fg">저장장치</div>
        </div>
        <button
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-[8px] border transition-all duration-150 shrink-0 cursor-pointer",
            justCopied
              ? "border-edge text-green bg-fill-3"
              : "border-edge text-muted hover:border-edge hover:text-fg hover:bg-fill-3 disabled:opacity-30 disabled:cursor-not-allowed"
          )}
          onClick={handleCopy}
          disabled={drives.length === 0}
          title="저장장치 정보 복사"
        >
          {justCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {drives.length === 0 && (
        <span className="text-muted text-[13px] font-normal italic">감지 불가</span>
      )}

      <div className="flex flex-col gap-3.5">
        {drives.map((drive) => {
          const critical = drive.used_percent >= 85;
          return (
            <div key={drive.letter} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[15px] font-bold text-fg">{drive.letter}</span>
                  {drive.is_boot && (
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded-[5px] bg-fill-3 text-sub border border-edge/60">
                      부팅
                    </span>
                  )}
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-[5px] bg-fill-3 text-muted border border-edge/60">
                    {drive.drive_type}
                  </span>
                  {drive.label && <span className="text-[13px] text-muted">{drive.label}</span>}
                </div>
                <div className="text-[13px] whitespace-nowrap">
                  <span className={cn("font-semibold", critical ? "text-red" : "text-sub")}>
                    {drive.free_gb.toFixed(0)}GB 여유
                  </span>
                  <span className="text-muted"> / {drive.total_gb.toFixed(0)}GB</span>
                </div>
              </div>
              <UsageBar percent={drive.used_percent} critical={critical} />
              <div className="text-[12px] text-muted overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">
                {drive.model || drive.file_system}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 pt-3 border-t border-edge/60 flex items-center justify-between gap-2 text-[12px]">
        <span className="text-muted font-medium">SMART</span>
        <span className="font-semibold" style={{ color: healthColor(storageHealth.overall) }}>
          {healthLabel(storageHealth.overall)}
        </span>
      </div>
    </div>
  );
}
