import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Cpu, Monitor, Database, RefreshCw, Copy, Check, Laptop, Gamepad2, DownloadCloud, Loader2, Sun, Moon } from "lucide-react";
import { HardwareCard } from "./components/HardwareCard";
import { StorageCard } from "./components/StorageCard";
import { AlertsSection } from "./components/AlertsSection";
import { SpecChecker } from "./components/SpecChecker";
import { DetailPanel } from "./components/DetailPanel";
import { LiveMonitor } from "./components/LiveMonitor";
import { HealthReport } from "./components/HealthReport";
import { UpgradeGuide } from "./components/UpgradeGuide";
import { SpecImageExport } from "./components/SpecImageExport";
import { useHardwareInfo } from "./hooks/useHardwareInfo";
import { useUpdater } from "./hooks/useUpdater";
import { useTheme } from "./hooks/useTheme";
import { cn } from "./utils/cn";
import type { HardwareInfo } from "./types/hardware";

const logoImg = "/logo.png";

function formatUptime(hours: number): string {
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}일 ${hours % 24}시간`;
  }
  return `${hours}시간`;
}

function formatBatteryRuntime(minutes: number | null | undefined): string {
  if (minutes == null) return "감지 불가";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
}

function secureBootLabel(status: string): string {
  switch (status) {
    case "enabled":
      return "활성";
    case "disabled":
      return "비활성";
    case "unsupported":
      return "지원 안 됨";
    default:
      return "감지 불가";
  }
}

function smartHealthLabel(status: string): string {
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

function coolingLabel(status: string): string {
  switch (status) {
    case "supported":
      return "지원됨";
    case "unsupported":
      return "지원 안 됨";
    default:
      return "감지 불가";
  }
}

function formatAllSpecs(data: HardwareInfo): string {
  const lines: string[] = [`=== 내 PC 사양 (${data.computer_name}) ===\n`];
  if (data.os) {
    lines.push(`[OS] ${data.os.name} ${data.os.version} (빌드 ${data.os.build}) / ${data.os.architecture}\n`);
    lines.push(`  설치일 ${data.os.install_date || "감지 불가"} · 마지막 부팅 ${data.os.last_boot || "감지 불가"} · 가동 ${formatUptime(data.os.uptime_hours)}\n`);
  }
  if (data.motherboard) {
    lines.push(`[메인보드] ${data.motherboard.manufacturer} ${data.motherboard.model}\n  BIOS ${data.motherboard.bios_version || "감지 불가"}${data.motherboard.bios_date ? ` / ${data.motherboard.bios_date}` : ""}\n`);
  }
  if (data.cpu) lines.push(`[CPU] ${data.cpu.name}\n  ${data.cpu.cores}코어 ${data.cpu.threads}스레드 / 기본 ${(data.cpu.base_clock_mhz / 1000).toFixed(1)}GHz · 최대 ${(data.cpu.max_clock_mhz / 1000).toFixed(1)}GHz\n`);
  if (data.gpus.length > 0) lines.push(`[GPU] ${data.gpus.map(g => `${g.name}${g.vram_gb != null ? ` (${g.vram_gb.toFixed(0)}GB)` : ""}`).join(", ")}\n`);
  if (data.ram) lines.push(`[RAM] ${data.ram.total_gb.toFixed(0)}GB ${data.ram.memory_type} ${data.ram.speed_mhz}MHz\n`);
  data.drives.forEach(d => lines.push(`[${d.letter}] ${d.label || "로컬 디스크"} ${d.drive_type} — ${d.free_gb.toFixed(0)}GB 여유 / ${d.total_gb.toFixed(0)}GB\n`));
  if (data.network.length > 0) {
    data.network.forEach((n) => {
      const base = `[네트워크] ${n.connection_name || n.name} — ${n.is_connected ? "연결됨" : "연결 안 됨"} / ${n.ip_address || "IP 감지 불가"}${n.speed_mbps != null ? ` / ${n.speed_mbps} Mbps` : ""}`;
      const wifi = n.adapter_type === "Wi-Fi"
        ? `${n.ssid ? ` / SSID ${n.ssid}` : ""}${n.signal_percent != null ? ` / 신호 ${n.signal_percent}%` : ""}${n.radio_type ? ` / ${n.radio_type}` : ""}${n.channel != null ? ` / 채널 ${n.channel}` : ""}`
        : "";
      lines.push(`${base}${wifi}\n`);
    });
  }
  if (data.battery) {
    lines.push(`[배터리] ${data.battery.charge_percent}%${data.battery.is_charging ? " · 충전 중" : ""}${data.battery.health_percent != null ? ` · 건강도 ${data.battery.health_percent}%` : ""}${data.battery.estimated_minutes != null ? ` · 예상 ${formatBatteryRuntime(data.battery.estimated_minutes)}` : ""}\n`);
  }
  if (data.firmware) {
    lines.push(`[보안] Secure Boot ${secureBootLabel(data.firmware.secure_boot)}\n`);
    if (data.firmware.tpm) {
      lines.push(`[TPM] ${data.firmware.tpm.spec_version || "감지 불가"} / ${data.firmware.tpm.manufacturer_version || "감지 불가"}${data.firmware.tpm.manufacturer_id ? ` / ${data.firmware.tpm.manufacturer_id}` : ""}\n`);
    } else {
      lines.push(`[TPM] 지원 안 됨\n`);
    }
  }
  if (data.storage_health) {
    lines.push(`[SMART] 전체 상태 ${smartHealthLabel(data.storage_health.overall)}\n`);
    data.storage_health.disks.forEach((disk) => {
      lines.push(`  - ${disk.name}: ${smartHealthLabel(disk.health_status)}${disk.temperature_c != null ? ` / ${disk.temperature_c.toFixed(0)}°C` : ""}${disk.wear != null ? ` / Wear ${disk.wear}` : ""}\n`);
    });
  }
  if (data.cooling) {
    const fanCount = data.cooling.fans.length;
    lines.push(`[냉각] ${coolingLabel(data.cooling.overall)}${fanCount > 0 ? ` · 팬 ${fanCount}개` : ""}\n`);
    data.cooling.fans.forEach((fan) => {
      lines.push(`  - ${fan.name}${fan.rpm != null ? ` / ${fan.rpm} RPM` : ""}${fan.variable_speed != null ? ` / 가변 속도 ${fan.variable_speed ? "지원" : "미지원"}` : ""}${fan.active_cooling != null ? ` / 능동 냉각 ${fan.active_cooling ? "지원" : "미지원"}` : ""}\n`);
    });
  }
  return lines.join("\n");
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted">
      <div className="w-8 h-8 rounded-full border-2 border-edge border-t-muted animate-spin-fast" />
      <p>PC 사양을 불러오는 중...</p>
    </div>
  );
}

function WindowsOnlyScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3.5 text-center px-10">
      <Monitor size={60} strokeWidth={1.2} className="text-muted opacity-50" />
      <p className="text-[18px] font-bold text-fg">Windows 전용 앱</p>
      <p className="text-sm text-muted">이 앱은 Windows 10/11에서만 동작합니다.</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <div className="text-[40px] text-red">⚠</div>
      <p className="text-[16px] font-semibold text-fg">정보를 가져오지 못했습니다</p>
      <p className="text-[13px] text-muted max-w-[400px] break-keep">{message}</p>
      <button
        className="mt-2 px-6 py-2.5 rounded-[8px] border border-edge bg-fill-2 text-sub text-sm font-semibold hover:bg-fill-4 hover:text-fg transition-colors cursor-pointer font-[inherit]"
        onClick={onRetry}
      >
        다시 시도
      </button>
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
    <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-edge rounded-[8px] text-[12px] text-muted">
      {is_laptop ? <Laptop size={13} /> : <Monitor size={13} />}
      <span className="text-sub font-semibold">{os.name}</span>
      <span className="text-edge">·</span>
      <span>{os.architecture}</span>
      <span className="text-edge">·</span>
      <span>{computer_name}</span>
      <span className="text-edge">·</span>
      <span>가동 {uptime}</span>
    </div>
  );
}

export default function App() {
  const { data, loading, error, refresh, copyToClipboard, copied } = useHardwareInfo();
  const { update, showModal, installing, dismiss, openModal, install } = useUpdater();
  const { theme, toggle: toggleTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"specs" | "checker">("specs");
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [version, setVersion] = useState("");

  useEffect(() => { getVersion().then(setVersion).catch(() => {}); }, []);

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
    <div className="flex flex-col h-screen min-w-0 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-7 py-[18px] bg-base border-b border-edge gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] shrink-0 flex items-center justify-center">
            <img src={logoImg} alt="logo" className="brand-logo w-full h-full object-contain opacity-85" />
          </div>
          <h1 className="text-[17px] font-bold text-fg tracking-tight">내 PC 한눈에</h1>
        </div>

        <div className="flex items-center gap-2.5">
          {!isWindowsOnly && (
            <>
            {update && (
              <button
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-edge bg-base text-blue text-[13px] font-medium cursor-pointer transition-all duration-150 hover:bg-fill-3 font-[inherit]"
                onClick={openModal}
                title={`버전 ${update.version}으로 업데이트`}
              >
                <DownloadCloud size={14} />
                {`v${update.version} 업데이트`}
              </button>
            )}
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-edge bg-base text-sub text-[13px] font-medium cursor-pointer transition-all duration-150 hover:bg-fill-3 hover:text-fg hover:border-edge/80 disabled:opacity-40 disabled:cursor-not-allowed font-[inherit]"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              title="새로고침"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin-fast" : ""} />
              새로고침
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border text-[13px] font-medium cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-[inherit]",
                copied
                  ? "bg-fill-3 border-edge text-green"
                  : "bg-base border-edge text-sub hover:bg-fill-3 hover:text-fg hover:border-edge/80"
              )}
              onClick={handleCopyAll}
              disabled={!data}
              title="전체 사양 복사"
            >
                {copied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 전체 복사</>}
              </button>
            {data && <SpecImageExport data={data} theme={theme} />}
            </>
          )}
          <button
            className="flex items-center justify-center w-[38px] h-[38px] rounded-[8px] border border-edge bg-base text-sub cursor-pointer transition-all duration-150 hover:bg-fill-3 hover:text-fg hover:border-edge/80 font-[inherit]"
            onClick={toggleTheme}
            title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            aria-label="테마 전환"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      {data && !loading && (
        <nav className="flex px-6 bg-base border-b border-edge shrink-0">
          <button
            className={cn(
              "flex items-center gap-[7px] px-[18px] py-[11px] bg-transparent border-b-2 text-[13px] font-semibold font-[inherit] cursor-pointer transition-all duration-150 -mb-px",
              activeTab === "specs" ? "text-sub border-b-sub" : "text-muted border-b-transparent hover:text-sub"
            )}
            onClick={() => setActiveTab("specs")}
          >
            <Monitor size={14} />
            내 PC 사양
          </button>
          <button
            className={cn(
              "flex items-center gap-[7px] px-[18px] py-[11px] bg-transparent border-b-2 text-[13px] font-semibold font-[inherit] cursor-pointer transition-all duration-150 -mb-px",
              activeTab === "checker" ? "text-sub border-b-sub" : "text-muted border-b-transparent hover:text-sub"
            )}
            onClick={() => setActiveTab("checker")}
          >
            <Gamepad2 size={14} />
            게임 / 프로그램 사양 검사
          </button>
        </nav>
      )}

      {/* Main */}
      <main
        className={cn(
          "flex-1 px-7 pt-8 pb-7 flex flex-col gap-5 min-h-0",
          activeTab === "checker" && data && !loading ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        {loading && <LoadingScreen />}
        {isWindowsOnly && <WindowsOnlyScreen />}
        {error && !isWindowsOnly && !loading && <ErrorScreen message={error} onRetry={handleRefresh} />}

        {data && !loading && (
          <>
            <OsBar data={data} />

            {activeTab === "specs" && (
              <>
                <LiveMonitor enabled={liveEnabled} onToggle={setLiveEnabled} />
                <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-4">
                  <HardwareCard
                    Icon={Cpu}
                    title="CPU"
                    color="#3b82f6"
                    mainValue={cpu?.name ?? null}
                    usagePercent={cpu?.usage_percent}
                    specs={cpu ? [
                      { label: "코어 / 스레드", value: `${cpu.cores}C / ${cpu.threads}T` },
                      { label: "최대 클럭", value: `${(cpu.max_clock_mhz / 1000).toFixed(1)} GHz` },
                      { label: "가상화", value: cpu.virtualization ? "지원" : "미지원" },
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
                  <StorageCard drives={data.drives} storageHealth={data.storage_health} />
                </div>
                <AlertsSection data={data} />
                <DetailPanel data={data} />
                <HealthReport data={data} />
                <UpgradeGuide data={data} />
              </>
            )}

            {activeTab === "checker" && <SpecChecker data={data} />}
          </>
        )}
      </main>

      {/* Update modal */}
      {update && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-edge rounded-[12px] px-7 py-6 w-[340px] flex flex-col gap-5 shadow-2xl animate-slide-down">
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] font-bold text-fg">새 버전이 있습니다</p>
              <p className="text-[13px] text-muted leading-relaxed">
                v{update.version} 업데이트가 출시됐습니다.<br />
                지금 업데이트하시겠습니까?
              </p>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                className="px-4 py-2 rounded-[8px] border border-edge bg-transparent text-muted text-[13px] font-medium cursor-pointer hover:text-fg hover:bg-fill-2 transition-colors font-[inherit] disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={dismiss}
                disabled={installing}
              >
                나중에
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-blue/20 border border-blue/30 text-blue text-[13px] font-semibold cursor-pointer hover:bg-blue/30 transition-colors font-[inherit] disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={install}
                disabled={installing}
              >
                {installing ? <Loader2 size={14} className="animate-spin-fast" /> : <DownloadCloud size={14} />}
                {installing ? "설치 중..." : "지금 업데이트"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="shrink-0 border-t border-edge px-5 py-1.5 flex items-center">
        {version && (
          <span className="text-[11px] text-muted/50 select-none">v{version}</span>
        )}
      </footer>
    </div>
  );
}
