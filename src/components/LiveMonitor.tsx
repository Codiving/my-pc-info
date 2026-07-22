import { Activity, Cpu, Database, Thermometer, Timer } from "lucide-react";
import { useLiveMetrics } from "../hooks/useLiveMetrics";
import { cn } from "../utils/cn";

// ── 스파크라인 ────────────────────────────────────────────────────────────────
function Sparkline({ data, color, max = 100 }: { data: number[]; color: string; max?: number }) {
  const W = 100;
  const H = 28;
  const valid = data.filter((v) => !Number.isNaN(v));
  if (valid.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none" />;
  }
  const n = data.length;
  const points = data.map((v, i) => {
    const x = (i / (n - 1)) * W;
    const clamped = Number.isNaN(v) ? 0 : Math.max(0, Math.min(max, v));
    const y = H - (clamped / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPath = `M0,${H} L${points.join(" L")} L${W},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.12} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Gauge({
  icon: Icon, label, value, unit, series, color, max = 100,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  unit: string;
  series: number[];
  color: string;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-fill-1 border border-edge/60 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
        <Icon size={13} style={{ color }} />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-bold text-fg tabular-nums leading-none">{value}</span>
        <span className="text-[12px] text-muted">{unit}</span>
      </div>
      <Sparkline data={series} color={color} max={max} />
    </div>
  );
}

// ── 실시간 모니터 카드 ────────────────────────────────────────────────────────
export function LiveMonitor({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  const { metrics, history } = useLiveMetrics(enabled, 2000);

  const tempValue = metrics?.cpu_temp_c;
  const tempColor = tempValue == null ? "var(--color-muted)"
    : tempValue >= 85 ? "var(--color-bad)"
    : tempValue >= 70 ? "var(--color-warn)"
    : "var(--color-ok)";

  return (
    <div className="bg-card border border-edge rounded-[14px] shadow-[var(--shadow-card)] px-5 py-3 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={15} className={cn(enabled ? "text-green" : "text-muted")} />
          <span className="text-[15px] font-bold text-fg">실시간 모니터링</span>
          {enabled && (
            <span className="flex items-center gap-1 text-[11px] text-green font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              2초마다 갱신
            </span>
          )}
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={cn(
            "relative w-[42px] h-[24px] rounded-full transition-colors duration-150 cursor-pointer shrink-0",
            enabled ? "bg-green/80" : "bg-fill-5"
          )}
          title={enabled ? "모니터링 끄기" : "모니터링 켜기"}
        >
          <span
            className={cn(
              "absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform duration-150",
              enabled && "translate-x-[18px]"
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
          <Gauge
            icon={Cpu}
            label="CPU 사용률"
            value={metrics ? `${metrics.cpu_usage_percent}` : "—"}
            unit="%"
            series={history.cpu}
            color="var(--color-blue)"
          />
          <Gauge
            icon={Timer}
            label="CPU 클럭"
            value={metrics ? `${metrics.cpu_clock_mhz}` : "—"}
            unit="MHz"
            series={history.clock}
            color="var(--color-muted)"
            max={6000}
          />
          <Gauge
            icon={Database}
            label="RAM 사용률"
            value={metrics ? `${metrics.ram_usage_percent}` : "—"}
            unit="%"
            series={history.ram}
            color="var(--color-green)"
          />
          <Gauge
            icon={Thermometer}
            label="CPU 온도"
            value={tempValue != null ? `${tempValue.toFixed(0)}` : "N/A"}
            unit={tempValue != null ? "°C" : ""}
            series={history.temp}
            color={tempColor}
            max={100}
          />
        </div>
      )}
    </div>
  );
}
