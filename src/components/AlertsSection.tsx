import { AlertTriangle, Info } from "lucide-react";
import type { HardwareInfo } from "../types/hardware";
import { cn } from "../utils/cn";

interface Alert {
  level: "warn" | "info";
  message: string;
}

function buildAlerts(data: HardwareInfo): Alert[] {
  const alerts: Alert[] = [];

  if (data.ram) {
    const { usage_percent, used_gb, total_gb } = data.ram;
    if (usage_percent >= 85) {
      alerts.push({ level: "warn", message: `RAM ${total_gb.toFixed(0)}GB 중 ${used_gb.toFixed(1)}GB 사용 중 — 메모리 사용량이 높습니다.` });
    }
  }

  for (const drive of data.drives) {
    const freeRatio = drive.total_gb > 0 ? drive.free_gb / drive.total_gb : 1;
    if (freeRatio < 0.05) {
      alerts.push({ level: "warn", message: `[${drive.letter}] 저장 공간이 ${(freeRatio * 100).toFixed(0)}% 남았습니다 — 파일 정리를 권장합니다.` });
    } else if (freeRatio < 0.1) {
      alerts.push({ level: "warn", message: `[${drive.letter}] 저장 공간이 ${drive.free_gb.toFixed(0)}GB 남았습니다.` });
    }
  }

  if (data.battery) {
    const { health_percent } = data.battery;
    if (health_percent != null && health_percent < 80) {
      alerts.push({ level: "warn", message: `배터리 성능이 설계 용량의 ${health_percent}%입니다 — 교체를 고려해 보세요.` });
    }
  }

  return alerts;
}

export function AlertsSection({ data }: { data: HardwareInfo }) {
  const alerts = buildAlerts(data);
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-2 px-3.5 py-2.5 rounded-[8px] text-[13px] leading-relaxed border",
            a.level === "warn"
              ? "bg-amber/[8%] border-amber/25 text-amber"
              : "bg-blue/[7%] border-blue/20 text-sub"
          )}
        >
          {a.level === "warn"
            ? <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber" />
            : <Info size={14} className="shrink-0 mt-0.5 text-blue" />
          }
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}
