import { useState } from "react";
import { Wrench, ChevronDown, MemoryStick, HardDrive, Monitor, CheckCircle2 } from "lucide-react";
import type { HardwareInfo } from "../types/hardware";
import { cn } from "../utils/cn";

interface Suggestion {
  icon: typeof MemoryStick;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

function buildSuggestions(data: HardwareInfo): Suggestion[] {
  const out: Suggestion[] = [];
  const { ram, drives, gpus } = data;

  // ── RAM ───────────────────────────────────────────────────────────────────
  if (ram) {
    const freeSlots = Math.max(0, ram.total_slots - ram.slots_used);
    const canGrow = ram.max_capacity_gb != null && ram.total_gb < ram.max_capacity_gb;

    if (ram.total_gb < 16) {
      out.push({
        icon: MemoryStick,
        priority: "high",
        title: `RAM 증설 권장 (현재 ${ram.total_gb.toFixed(0)}GB)`,
        detail: freeSlots > 0
          ? `빈 슬롯이 ${freeSlots}개 있어 ${ram.memory_type} ${ram.speed_mhz || ""}MHz 모듈을 추가로 꽂을 수 있습니다.`
          : `모든 슬롯이 찼습니다. 더 큰 용량의 ${ram.memory_type} 모듈로 교체가 필요합니다.`,
      });
    } else if (freeSlots > 0 && canGrow) {
      out.push({
        icon: MemoryStick,
        priority: "low",
        title: `RAM 증설 여유 있음 (빈 슬롯 ${freeSlots}개)`,
        detail: `현재 ${ram.total_gb.toFixed(0)}GB. 같은 규격(${ram.memory_type} ${ram.speed_mhz || ""}MHz) 모듈을 추가하면 최대 ${ram.max_capacity_gb?.toFixed(0)}GB까지 확장할 수 있습니다.`,
      });
    }
  }

  // ── 저장장치 ────────────────────────────────────────────────────────────────
  const hasHdd = drives.some((d) => d.drive_type === "HDD");
  if (hasHdd) {
    out.push({
      icon: HardDrive,
      priority: "high",
      title: "HDD → SSD 교체 권장",
      detail: "HDD가 감지됐습니다. SSD(가급적 NVMe)로 바꾸면 부팅·로딩 체감 속도가 가장 크게 좋아집니다.",
    });
  }
  const bootDrive = drives.find((d) => d.is_boot) ?? drives[0];
  if (bootDrive) {
    const freeRatio = bootDrive.total_gb > 0 ? bootDrive.free_gb / bootDrive.total_gb : 1;
    if (freeRatio < 0.15) {
      out.push({
        icon: HardDrive,
        priority: freeRatio < 0.08 ? "high" : "medium",
        title: `${bootDrive.letter} 저장 공간 부족`,
        detail: `여유 공간이 ${bootDrive.free_gb.toFixed(0)}GB(${(freeRatio * 100).toFixed(0)}%)뿐입니다. 파일 정리 또는 SSD 증설을 고려하세요.`,
      });
    }
  }

  // ── GPU ─────────────────────────────────────────────────────────────────────
  const hasDedicated = gpus.some((g) => !g.is_integrated);
  if (!hasDedicated && gpus.length > 0 && !data.is_laptop) {
    out.push({
      icon: Monitor,
      priority: "medium",
      title: "내장 그래픽만 사용 중",
      detail: "게임·영상 편집·3D 작업이 잦다면 외장 그래픽카드 장착으로 성능을 크게 끌어올릴 수 있습니다.",
    });
  }

  return out;
}

const priorityStyle: Record<Suggestion["priority"], { label: string; cls: string }> = {
  high: { label: "권장", cls: "text-amber bg-warn/10 border-warn/25" },
  medium: { label: "고려", cls: "text-blue bg-blue/10 border-blue/25" },
  low: { label: "여유", cls: "text-muted bg-fill-3 border-edge/60" },
};

export function UpgradeGuide({ data }: { data: HardwareInfo }) {
  const [open, setOpen] = useState(false);
  const suggestions = buildSuggestions(data);
  const priorityRank = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  return (
    <div className="bg-card border border-edge rounded-[14px] shadow-[var(--shadow-card)] flex flex-col">
      <button
        className="w-full px-5 py-4 bg-transparent text-fg text-[15px] font-bold cursor-pointer flex items-center gap-2 font-[inherit]"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={16} className={cn("transition-transform duration-200 text-muted", open && "rotate-180")} />
        <Wrench size={15} className="text-muted" />
        <span>업그레이드 가이드</span>
        {suggestions.length > 0 && (
          <span className="ml-1 text-[12px] font-semibold text-amber bg-warn/10 border border-warn/25 rounded-full px-2 py-0.5">
            {suggestions.length}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-edge animate-slide-down">
          {suggestions.length === 0 ? (
            <div className="flex items-center gap-2.5 px-3.5 py-4 text-[13px] text-sub">
              <CheckCircle2 size={16} className="text-green shrink-0" />
              현재 구성에서 특별히 권장할 업그레이드가 없습니다. 균형 잡힌 사양입니다.
            </div>
          ) : (
            suggestions.map((s, i) => {
              const badge = priorityStyle[s.priority];
              return (
                <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-[10px] bg-fill-1 border border-edge/60">
                  <s.icon size={18} className="text-muted shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-fg break-keep">{s.title}</span>
                      <span className={cn("text-[11px] font-semibold rounded-full px-1.5 py-0.5 border", badge.cls)}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted leading-relaxed break-keep">{s.detail}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
