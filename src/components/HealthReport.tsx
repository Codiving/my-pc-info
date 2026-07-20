import { HeartPulse } from "lucide-react";
import type { HardwareInfo } from "../types/hardware";
import { cn } from "../utils/cn";

type Status = "good" | "warn" | "bad";

interface Check {
  name: string;
  status: Status;
  message: string;
}

// 각 항목의 상태를 점수로 환산(good 100 / warn 60 / bad 25)해 평균을 종합 점수로 사용.
const STATUS_SCORE: Record<Status, number> = { good: 100, warn: 60, bad: 25 };

function buildChecks(data: HardwareInfo): Check[] {
  const checks: Check[] = [];
  const { ram, drives, battery, os } = data;

  // 저장 공간(가장 빠듯한 드라이브 기준)
  if (drives.length > 0) {
    const worst = drives.reduce((a, b) =>
      (a.free_gb / a.total_gb) < (b.free_gb / b.total_gb) ? a : b);
    const ratio = worst.total_gb > 0 ? worst.free_gb / worst.total_gb : 1;
    checks.push({
      name: "저장 공간",
      status: ratio < 0.08 ? "bad" : ratio < 0.15 ? "warn" : "good",
      message: `${worst.letter} 여유 ${worst.free_gb.toFixed(0)}GB (${(ratio * 100).toFixed(0)}%)`,
    });
  }

  // 저장장치 종류(HDD면 경고)
  if (drives.some((d) => d.drive_type === "HDD")) {
    checks.push({ name: "저장장치 속도", status: "warn", message: "HDD 사용 중 — SSD 권장" });
  } else if (drives.length > 0) {
    checks.push({ name: "저장장치 속도", status: "good", message: "SSD 사용 중" });
  }

  // 메모리 압박
  if (ram) {
    checks.push({
      name: "메모리 여유",
      status: ram.usage_percent >= 90 ? "bad" : ram.usage_percent >= 80 ? "warn" : "good",
      message: `사용률 ${ram.usage_percent}% (${ram.total_gb.toFixed(0)}GB 중)`,
    });
  }

  // 배터리 건강도(노트북)
  if (battery && battery.health_percent != null) {
    const h = battery.health_percent;
    checks.push({
      name: "배터리 건강도",
      status: h < 70 ? "bad" : h < 80 ? "warn" : "good",
      message: `설계 용량 대비 ${h}%`,
    });
  }

  // 가동 시간(오래 켜두면 재부팅 권장)
  if (os) {
    const days = os.uptime_hours / 24;
    checks.push({
      name: "가동 시간",
      status: days >= 7 ? "warn" : "good",
      message: days >= 1 ? `${Math.floor(days)}일 ${os.uptime_hours % 24}시간` : `${os.uptime_hours}시간`,
    });
  }

  return checks;
}

const dot: Record<Status, string> = {
  good: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
};

function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-ok)";
  if (score >= 55) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function HealthReport({ data }: { data: HardwareInfo }) {
  const checks = buildChecks(data);
  if (checks.length === 0) return null;

  const score = Math.round(
    checks.reduce((sum, c) => sum + STATUS_SCORE[c.status], 0) / checks.length
  );
  const color = scoreColor(score);
  const label = score >= 80 ? "양호" : score >= 55 ? "주의" : "점검 필요";

  // 원형 게이지
  const R = 40;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  return (
    <div className="bg-card border border-edge rounded-[14px] shadow-[var(--shadow-card)] px-5 py-4">
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse size={15} className="text-muted" />
        <span className="text-[15px] font-bold text-fg">건강 상태 진단</span>
      </div>

      <div className="flex items-center gap-5">
        {/* 점수 링 */}
        <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
          <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r={R} fill="none" stroke="var(--color-fill-5)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 leading-none">
            <span className="text-[26px] font-bold tabular-nums" style={{ color }}>{score}</span>
            <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
          </div>
        </div>

        {/* 항목 목록 */}
        <div className="flex-1 grid grid-cols-1 min-[520px]:grid-cols-2 gap-x-5 gap-y-2 min-w-0">
          {checks.map((c) => (
            <div key={c.name} className="flex items-center gap-2 min-w-0">
              <span className={cn("w-2 h-2 rounded-full shrink-0", dot[c.status])} />
              <span className="text-[13px] text-sub font-medium shrink-0">{c.name}</span>
              <span className="text-[12px] text-muted truncate ml-auto text-right">{c.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
