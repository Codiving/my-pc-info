import { useState } from "react";
import { Cpu, Monitor, Database, RefreshCw, Copy, Check, Laptop } from "lucide-react";
import { HardwareCard } from "./components/HardwareCard";
import { StorageCard } from "./components/StorageCard";
import { AlertsSection } from "./components/AlertsSection";
import { DetailPanel } from "./components/DetailPanel";
import { useHardwareInfo } from "./hooks/useHardwareInfo";
import type { HardwareInfo } from "./types/hardware";
const logoImg = "/logo.png";

function formatAllSpecs(data: HardwareInfo): string {
  const lines: string[] = [`=== 내 PC 사양 (${data.computer_name}) ===\n`];
  if (data.os) lines.push(`[OS] ${data.os.name} ${data.os.architecture} (빌드 ${data.os.build})\n`);
  if (data.cpu) lines.push(`[CPU] ${data.cpu.name}\n  ${data.cpu.cores}코어 ${data.cpu.threads}스레드 / 최대 ${(data.cpu.max_clock_mhz / 1000).toFixed(1)}GHz\n`);
  if (data.gpus.length > 0) lines.push(`[GPU] ${data.gpus.map(g => `${g.name}${g.vram_gb != null ? ` (${g.vram_gb.toFixed(0)}GB)`  : ""}`).join(", ")}\n`);
  if (data.ram) lines.push(`[RAM] ${data.ram.total_gb.toFixed(0)}GB ${data.ram.memory_type} ${data.ram.speed_mhz}MHz\n`);
  data.drives.forEach(d => lines.push(`[${d.letter}] ${d.label || "로컬 디스크"} ${d.drive_type} — ${d.free_gb.toFixed(0)}GB 여유 / ${d.total_gb.toFixed(0)}GB\n`));
  if (data.motherboard) lines.push(`[메인보드] ${data.motherboard.manufacturer} ${data.motherboard.model}\n`);
  return lines.join("\n");
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>PC 사양을 불러오는 중...</p>
    </div>
  );
}

function WindowsOnlyScreen() {
  return (
    <div className="windows-only-screen">
      <Monitor size={60} strokeWidth={1.2} className="windows-only-icon" />
      <p className="windows-only-title">Windows 전용 앱</p>
      <p className="windows-only-desc">이 앱은 Windows 10/11에서만 동작합니다.</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-screen">
      <div className="error-icon">⚠</div>
      <p className="error-title">정보를 가져오지 못했습니다</p>
      <p className="error-message">{message}</p>
      <button className="retry-btn" onClick={onRetry}>다시 시도</button>
    </div>
  );
}

function OsBar({ data }: { data: HardwareInfo }) {
  const { os, computer_name, is_laptop } = data;
  if (!os) return null;
  const uptime = os.uptime_hours >= 24
    ? `${Math.floor(os.uptime_hours / 24)}일 ${os.uptime_hours % 24}시간`
    : `${os.uptime_hours}시간`;
  return (
    <div className="os-bar">
      {is_laptop ? <Laptop size={13} /> : <Monitor size={13} />}
      <span className="os-bar-name">{os.name}</span>
      <span className="os-bar-sep">·</span>
      <span>{os.architecture}</span>
      <span className="os-bar-sep">·</span>
      <span>{computer_name}</span>
      <span className="os-bar-sep">·</span>
      <span>가동 {uptime}</span>
    </div>
  );
}

export default function App() {
  const { data, loading, error, refresh, copyToClipboard, copied } = useHardwareInfo();
  const [refreshing, setRefreshing] = useState(false);

  const isWindowsOnly = error === "WINDOWS_ONLY";

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCopyAll = () => {
    if (data) copyToClipboard(formatAllSpecs(data));
  };

  const cpu = data?.cpu;
  const gpu = data?.gpus[0];
  const ram = data?.ram;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <img src={logoImg} alt="logo" />
          </div>
          <h1 className="app-title">내 PC 한눈에</h1>
        </div>
        {!isWindowsOnly && (
          <div className="header-actions">
            <button
              className="action-btn refresh-btn"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              title="새로고침"
            >
              <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
              새로고침
            </button>
            <button
              className={`action-btn copy-all-btn ${copied ? "copied" : ""}`}
              onClick={handleCopyAll}
              disabled={!data}
              title="전체 사양 복사"
            >
              {copied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 전체 복사</>}
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {loading && <LoadingScreen />}
        {isWindowsOnly && <WindowsOnlyScreen />}
        {error && !isWindowsOnly && !loading && <ErrorScreen message={error} onRetry={handleRefresh} />}

        {data && !loading && (
          <>
            <OsBar data={data} />

            <div className="cards-grid">
              <HardwareCard
                Icon={Cpu}
                title="CPU"
                color="#3b82f6"
                mainValue={cpu?.name ?? null}
                usagePercent={cpu?.usage_percent}
                specs={cpu ? [
                  { label: "코어 / 스레드", value: `${cpu.cores}C / ${cpu.threads}T` },
                  { label: "최대 클럭", value: `${(cpu.max_clock_mhz / 1000).toFixed(1)} GHz` },
                ] : []}
                copyText={cpu ? `[CPU] ${cpu.name} (${cpu.cores}코어/${cpu.threads}스레드 ${(cpu.max_clock_mhz / 1000).toFixed(1)}GHz)` : ""}
              />

              <HardwareCard
                Icon={Monitor}
                title="GPU"
                color="#a855f7"
                mainValue={gpu?.name ?? null}
                specs={gpu ? [
                  { label: "VRAM", value: gpu.vram_gb != null ? `${gpu.vram_gb.toFixed(0)} GB` : "감지 불가" },
                  { label: "드라이버", value: gpu.driver_version || "N/A" },
                ] : []}
                copyText={gpu ? `[GPU] ${gpu.name}${gpu.vram_gb != null ? ` (VRAM ${gpu.vram_gb.toFixed(0)}GB)` : ""}` : ""}
              />

              <HardwareCard
                Icon={Database}
                title="RAM"
                color="#22c55e"
                mainValue={ram ? `${ram.used_gb.toFixed(1)} / ${ram.total_gb.toFixed(0)} GB` : null}
                usagePercent={ram?.usage_percent}
                specs={ram ? [
                  { label: "규격", value: `${ram.memory_type} ${ram.speed_mhz} MHz` },
                  { label: "슬롯", value: `${ram.slots_used}개 사용` },
                ] : []}
                copyText={ram ? `[RAM] ${ram.total_gb.toFixed(0)}GB ${ram.memory_type} ${ram.speed_mhz}MHz` : ""}
              />
            </div>

            <StorageCard drives={data.drives} />

            <AlertsSection data={data} />

            <DetailPanel data={data} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>오프라인 동작 · 개인정보 수집 없음</span>
      </footer>
    </div>
  );
}
