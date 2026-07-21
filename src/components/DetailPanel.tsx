import { useState } from "react";
import { Cpu, Monitor, Database, HardDrive, CircuitBoard, Globe, Wifi, Battery, ChevronDown } from "lucide-react";
import type { HardwareInfo } from "../types/hardware";
import { cn } from "../utils/cn";

function Row({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value == null || value === "" || value === 0) return null;
  const display = typeof value === "boolean" ? (value ? "지원" : "미지원") : String(value);
  return (
    <div className="flex justify-between items-center py-[7px] border-b border-edge/50 last:border-b-0">
      <span className="text-muted text-[13px]">{label}</span>
      <span className="text-fg text-[13px] font-medium text-right max-w-[60%] break-keep">{display}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold text-muted uppercase tracking-[0.8px] mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function AccordionItem({ icon: Icon, label, children, open, onToggle }: {
  icon: typeof Cpu;
  label: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-[8px]">
      <button
        className="w-full px-3.5 py-3 bg-fill-1 text-sub text-[13px] font-semibold cursor-pointer flex items-center justify-between font-[inherit] rounded-[8px] transition-all duration-150 hover:bg-fill-3 hover:text-fg"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2">
          <Icon size={15} />
          {label}
        </span>
        <ChevronDown
          size={15}
          className={cn("transition-transform duration-200 text-muted", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-3.5 pt-1 pb-3 flex flex-col gap-4 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}

export function DetailPanel({ data }: { data: HardwareInfo }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { cpu, gpus, ram, drives, motherboard, os, network, battery } = data;

  const availableKeys = [
    cpu ? "cpu" : null,
    gpus.length > 0 ? "gpu" : null,
    ram ? "ram" : null,
    drives.length > 0 ? "storage" : null,
    motherboard ? "motherboard" : null,
    os ? "os" : null,
    network.length > 0 ? "network" : null,
    battery ? "battery" : null,
  ].filter(Boolean) as string[];

  const allOpen = availableKeys.length > 0 && availableKeys.every((k) => openItems.has(k));

  const toggleAll = () => setOpenItems(allOpen ? new Set() : new Set(availableKeys));
  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-card border border-edge rounded-[14px] shadow-[var(--shadow-card)] flex flex-col">
      <div className="flex items-center justify-between px-5">
        <button
          className="flex-1 py-3 bg-transparent text-fg text-[15px] font-bold cursor-pointer flex items-center gap-2 font-[inherit] transition-colors"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-200 text-muted", panelOpen && "rotate-180")}
          />
          <span>상세 정보</span>
        </button>
        {panelOpen && (
          <button
            className="px-3 py-[5px] rounded-[8px] border border-edge bg-transparent text-muted text-[12px] font-medium cursor-pointer transition-all duration-150 whitespace-nowrap hover:border-edge/80 hover:text-fg hover:bg-fill-3 font-[inherit]"
            onClick={toggleAll}
          >
            {allOpen ? "전체 접기" : "전체 열기"}
          </button>
        )}
      </div>

      {panelOpen && (
        <div className="px-4 pb-4 pt-3 grid grid-cols-1 min-[520px]:grid-cols-2 gap-2 border-t border-edge animate-slide-down">
          {cpu && (
            <AccordionItem icon={Cpu} label="CPU" open={openItems.has("cpu")} onToggle={() => toggleItem("cpu")}>
              <Section title="프로세서">
                <Row label="모델명" value={cpu.name} />
                <Row label="제조사" value={cpu.manufacturer} />
                <Row label="코어 수" value={`${cpu.cores}개`} />
                <Row label="스레드 수" value={`${cpu.threads}개`} />
                <Row label="기본 클럭" value={`${(cpu.base_clock_mhz / 1000).toFixed(2)} GHz`} />
                <Row label="최대 클럭" value={`${(cpu.max_clock_mhz / 1000).toFixed(2)} GHz`} />
                <Row label="아키텍처" value={cpu.architecture} />
                <Row label="가상화" value={cpu.virtualization} />
                <Row label="현재 사용률" value={`${cpu.usage_percent}%`} />
              </Section>
            </AccordionItem>
          )}

          {gpus.length > 0 && (
            <AccordionItem icon={Monitor} label="GPU" open={openItems.has("gpu")} onToggle={() => toggleItem("gpu")}>
              {gpus.map((gpu, i) => (
                <Section key={i} title={gpus.length > 1 ? `그래픽카드 ${i + 1}` : "그래픽카드"}>
                  <Row label="모델명" value={gpu.name} />
                  <Row label="제조사" value={gpu.manufacturer} />
                  <Row label="종류" value={gpu.is_integrated ? "내장 그래픽" : "전용 그래픽"} />
                  <Row label="VRAM" value={gpu.vram_gb != null ? `${gpu.vram_gb.toFixed(0)} GB` : null} />
                  <Row label="드라이버" value={gpu.driver_version} />
                  <Row label="해상도" value={gpu.resolution} />
                  <Row label="주사율" value={gpu.refresh_rate ? `${gpu.refresh_rate} Hz` : null} />
                </Section>
              ))}
            </AccordionItem>
          )}

          {ram && (
            <AccordionItem icon={Database} label="메모리" open={openItems.has("ram")} onToggle={() => toggleItem("ram")}>
              <Section title="전체 메모리">
                <Row label="총 용량" value={`${ram.total_gb.toFixed(0)} GB`} />
                <Row label="사용 중" value={`${ram.used_gb.toFixed(1)} GB (${ram.usage_percent}%)`} />
                <Row label="사용 가능" value={`${ram.available_gb.toFixed(1)} GB`} />
                <Row label="규격" value={ram.memory_type} />
                <Row label="속도" value={`${ram.speed_mhz} MHz`} />
                <Row label="사용 슬롯" value={`${ram.slots_used}개`} />
              </Section>
              {ram.slots.length > 0 && (
                <Section title="슬롯별 정보">
                  {ram.slots.map((slot, i) => (
                    <div key={i} className="bg-fill-1 rounded-[8px] px-3 py-2.5 border border-edge/60 mt-2 first:mt-0">
                      <div className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px] mb-2">{slot.slot}</div>
                      <Row label="용량" value={`${slot.capacity_gb.toFixed(0)} GB`} />
                      <Row label="규격" value={slot.memory_type} />
                      <Row label="속도" value={`${slot.speed_mhz} MHz`} />
                      <Row label="제조사" value={slot.manufacturer} />
                    </div>
                  ))}
                </Section>
              )}
            </AccordionItem>
          )}

          {drives.length > 0 && (
            <AccordionItem icon={HardDrive} label="저장장치" open={openItems.has("storage")} onToggle={() => toggleItem("storage")}>
              {drives.map((drive, i) => (
                <Section key={i} title={`${drive.letter} 드라이브`}>
                  <Row label="레이블" value={drive.label || "없음"} />
                  <Row label="종류" value={drive.drive_type} />
                  <Row label="모델" value={drive.model} />
                  <Row label="인터페이스" value={drive.interface_type} />
                  <Row label="파일 시스템" value={drive.file_system} />
                  <Row label="전체 용량" value={`${drive.total_gb.toFixed(0)} GB`} />
                  <Row label="사용 중" value={`${(drive.total_gb - drive.free_gb).toFixed(0)} GB (${drive.used_percent}%)`} />
                  <Row label="여유 공간" value={`${drive.free_gb.toFixed(0)} GB`} />
                  <Row label="부팅 드라이브" value={drive.is_boot} />
                </Section>
              ))}
            </AccordionItem>
          )}

          {motherboard && (
            <AccordionItem icon={CircuitBoard} label="메인보드 · BIOS" open={openItems.has("motherboard")} onToggle={() => toggleItem("motherboard")}>
              <Section title="메인보드">
                <Row label="제조사" value={motherboard.manufacturer} />
                <Row label="모델명" value={motherboard.model} />
              </Section>
              <Section title="BIOS">
                <Row label="버전" value={motherboard.bios_version} />
                <Row label="날짜" value={motherboard.bios_date} />
              </Section>
            </AccordionItem>
          )}

          {os && (
            <AccordionItem icon={Globe} label="운영체제" open={openItems.has("os")} onToggle={() => toggleItem("os")}>
              <Section title="시스템">
                <Row label="컴퓨터 이름" value={data.computer_name} />
                <Row label="OS" value={os.name} />
                <Row label="버전" value={os.version} />
                <Row label="빌드" value={os.build} />
                <Row label="아키텍처" value={os.architecture} />
                <Row label="설치일" value={os.install_date} />
                <Row label="마지막 부팅" value={os.last_boot} />
                <Row label="가동 시간" value={os.uptime_hours ? `${os.uptime_hours}시간` : null} />
              </Section>
            </AccordionItem>
          )}

          {network.length > 0 && (
            <AccordionItem icon={Wifi} label="네트워크" open={openItems.has("network")} onToggle={() => toggleItem("network")}>
              {network.map((n, i) => (
                <Section key={i} title={n.connection_name || n.name}>
                  <Row label="어댑터" value={n.name} />
                  <Row label="종류" value={n.adapter_type} />
                  <Row label="상태" value={n.is_connected ? "연결됨" : "연결 안 됨"} />
                  <Row label="IP 주소" value={n.ip_address} />
                  <Row label="MAC 주소" value={n.mac_address} />
                  <Row label="링크 속도" value={n.speed_mbps != null ? `${n.speed_mbps} Mbps` : null} />
                </Section>
              ))}
            </AccordionItem>
          )}

          {battery && (
            <AccordionItem icon={Battery} label="배터리" open={openItems.has("battery")} onToggle={() => toggleItem("battery")}>
              <Section title="배터리 상태">
                <Row label="충전량" value={`${battery.charge_percent}%`} />
                <Row label="충전 중" value={battery.is_charging} />
                <Row label="배터리 건강도" value={battery.health_percent != null ? `${battery.health_percent}%` : null} />
                <Row label="설계 용량" value={battery.design_capacity_mwh != null ? `${battery.design_capacity_mwh} mWh` : null} />
                <Row label="현재 최대 용량" value={battery.full_capacity_mwh != null ? `${battery.full_capacity_mwh} mWh` : null} />
                <Row label="예상 사용 시간" value={battery.estimated_minutes != null ? `${Math.floor(battery.estimated_minutes / 60)}시간 ${battery.estimated_minutes % 60}분` : null} />
              </Section>
            </AccordionItem>
          )}
        </div>
      )}
    </div>
  );
}
