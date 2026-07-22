import { useRef, useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import type { HardwareInfo } from "../types/hardware";
import type { Theme } from "../hooks/useTheme";
import { downloadSpecImage } from "../utils/exportImage";
import { cn } from "../utils/cn";

// ── 내보낼 카드(오프스크린 렌더) ────────────────────────────────────────────────
// 캡처 결과가 화면 테마와 일치하도록 라이트/다크 팔레트를 분리해 인라인 스타일로 적용.
interface Palette {
  bg: string; card: string; rowBorder: string; border: string;
  title: string; label: string; value: string; sub: string; accent: string;
}

const PALETTES: Record<Theme, Palette> = {
  dark: {
    bg: "linear-gradient(155deg, #1b2740 0%, #0b1220 100%)",
    card: "#0f1729", rowBorder: "#222e44", border: "transparent",
    title: "#e7edf5", label: "#7aa2e8", value: "#d7e0ec", sub: "#8494a8", accent: "#5d8fe0",
  },
  light: {
    bg: "linear-gradient(155deg, #ffffff 0%, #eef2f8 100%)",
    card: "#ffffff", rowBorder: "#e9edf4", border: "#dbe1ec",
    title: "#1a2436", label: "#3f74c9", value: "#2a3648", sub: "#6b7789", accent: "#3f74c9",
  },
};

function specRows(data: HardwareInfo): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (data.os) rows.push(["OS", `${data.os.name} ${data.os.version} (빌드 ${data.os.build}, ${data.os.architecture})`]);
  if (data.motherboard) rows.push(["메인보드", `${data.motherboard.manufacturer} ${data.motherboard.model}`]);
  if (data.cpu) rows.push(["CPU", `${data.cpu.name}  ·  ${data.cpu.cores}코어 ${data.cpu.threads}스레드 · 최대 ${(data.cpu.max_clock_mhz / 1000).toFixed(1)}GHz`]);
  if (data.gpus.length > 0) {
    rows.push(["GPU", data.gpus.map((g) => `${g.name}${g.vram_gb != null ? ` (${g.vram_gb.toFixed(0)}GB)` : ""}`).join(" / ")]);
  }
  if (data.ram) rows.push(["RAM", `${data.ram.total_gb.toFixed(0)}GB ${data.ram.memory_type} ${data.ram.speed_mhz}MHz`]);
  data.drives.forEach((d) => {
    rows.push([`디스크 ${d.letter}`, `${d.drive_type} ${d.total_gb.toFixed(0)}GB (여유 ${d.free_gb.toFixed(0)}GB)`]);
  });
  if (data.network.length > 0) {
    const active = data.network.find((n) => n.is_connected) ?? data.network[0];
    if (active) {
      rows.push(["네트워크", `${active.connection_name || active.name}${active.is_connected ? " · 연결됨" : ""}${active.ip_address ? ` · ${active.ip_address}` : ""}${active.speed_mbps != null ? ` · ${active.speed_mbps} Mbps` : ""}`]);
    }
  }
  if (data.battery) {
    rows.push(["배터리", `${data.battery.charge_percent}%${data.battery.health_percent != null ? ` · 건강도 ${data.battery.health_percent}%` : ""}${data.battery.is_charging ? " · 충전 중" : ""}`]);
  }
  if (data.firmware) {
    const secureBootLabel = data.firmware.secure_boot === "enabled"
      ? "활성"
      : data.firmware.secure_boot === "disabled"
        ? "비활성"
        : data.firmware.secure_boot === "unsupported"
          ? "지원 안 됨"
          : "감지 불가";
    rows.push(["Secure Boot", secureBootLabel]);
    rows.push(["TPM", data.firmware.tpm ? (data.firmware.tpm.spec_version || "감지 불가") : "지원 안 됨"]);
  }
  if (data.storage_health) {
    const smartLabel = data.storage_health.overall === "healthy"
      ? "정상"
      : data.storage_health.overall === "warning"
        ? "주의"
        : data.storage_health.overall === "unhealthy"
          ? "불량"
          : data.storage_health.overall === "unsupported"
            ? "지원 안 됨"
            : "감지 불가";
    rows.push(["SMART", smartLabel]);
    if (data.storage_health.disks.length > 0) {
      rows.push(["SMART 디스크", data.storage_health.disks.map((d) => `${d.name}:${d.health_status}`).join(" / ")]);
    }
  }
  if (data.cooling) {
    rows.push(["냉각", `${data.cooling.overall}${data.cooling.fans.length > 0 ? ` · 팬 ${data.cooling.fans.length}개` : ""}`]);
  }
  return rows;
}

function ShareCard({ data, theme, cardRef }: {
  data: HardwareInfo;
  theme: Theme;
  cardRef: React.RefObject<HTMLDivElement>;
}) {
  const rows = specRows(data);
  const today = new Date().toISOString().slice(0, 10);
  const p = PALETTES[theme];

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed", left: "-99999px", top: 0,
        width: 660, padding: 34, boxSizing: "border-box",
        background: p.bg, borderRadius: 20, border: `1px solid ${p.border}`,
        fontFamily: '-apple-system, "Malgun Gothic", "Segoe UI", sans-serif',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 6, height: 22, borderRadius: 3, background: p.accent }} />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: p.title }}>내 PC 사양</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: p.sub }}>{data.computer_name}</div>
      </div>

      {/* 사양 표 */}
      <div style={{
        marginTop: 22, background: p.card, borderRadius: 14,
        border: `1px solid ${p.rowBorder}`, padding: "4px 20px",
      }}>
        {rows.map(([label, value], i) => (
          <div
            key={label + value}
            style={{
              display: "flex", alignItems: "baseline", gap: 18, padding: "13px 0",
              borderBottom: i === rows.length - 1 ? "none" : `1px solid ${p.rowBorder}`,
            }}
          >
            <div style={{ width: 84, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: p.label }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: p.value, lineHeight: 1.5, wordBreak: "keep-all" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 푸터 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, fontSize: 12, color: p.sub }}>
        <span style={{ fontWeight: 700, color: p.accent }}>내 PC 한눈에</span>
        <span>{today}</span>
      </div>
    </div>
  );
}

// ── 버튼 + 오프스크린 카드 ────────────────────────────────────────────────────
export function SpecImageExport({ data, theme }: { data: HardwareInfo; theme: Theme }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current) return;
    setBusy(true); setError(false);
    try {
      await downloadSpecImage(cardRef.current, `내PC사양_${data.computer_name || "spec"}.png`);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(true); setTimeout(() => setError(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const btn = "flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-edge bg-base text-sub text-[13px] font-medium cursor-pointer transition-all duration-150 hover:bg-fill-3 hover:text-fg hover:border-edge/80 disabled:opacity-40 disabled:cursor-not-allowed font-[inherit]";

  return (
    <>
      <div className="flex items-center gap-2">
        <button className={cn(btn, saved && "text-green")} onClick={handleSave} disabled={busy} title="사양 이미지를 PNG로 저장">
          {busy ? <Loader2 size={14} className="animate-spin-fast" />
            : saved ? <Check size={14} /> : <Download size={14} />}
          {saved ? "저장됨" : "이미지 저장"}
        </button>
        {error && <span className="text-[12px] text-red">이미지 생성에 실패했습니다</span>}
      </div>

      <ShareCard data={data} theme={theme} cardRef={cardRef} />
    </>
  );
}
