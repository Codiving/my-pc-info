import { HardDrive, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { DriveInfo } from "../types/hardware";

interface StorageCardProps {
  drives: DriveInfo[];
}

function UsageBar({ percent, warn }: { percent: number; warn: boolean }) {
  const color = percent >= 90 ? "var(--accent-red)" : warn ? "#f59e0b" : "var(--accent-green)";
  return (
    <div className="usage-bar-track">
      <div className="usage-bar-fill" style={{ width: `${percent}%`, background: color }} />
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
    <div className="card storage-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-icon" style={{ color: "#f59e0b", backgroundColor: "#f59e0b20" }}>
            <HardDrive size={22} />
          </div>
          <div className="card-title">저장장치</div>
        </div>
        <button
          className={`copy-btn-icon ${justCopied ? "copied" : ""}`}
          onClick={handleCopy}
          title="저장장치 정보 복사"
        >
          {justCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="drive-list">
        {drives.map((drive) => {
          const warn = drive.free_gb / drive.total_gb < 0.1;
          const critical = drive.free_gb / drive.total_gb < 0.05;
          return (
            <div key={drive.letter} className="drive-row">
              <div className="drive-header-row">
                <div className="drive-label-group">
                  <span className="drive-letter">{drive.letter}</span>
                  {drive.is_boot && <span className="drive-boot-badge">부팅</span>}
                  <span className="drive-type-badge">{drive.drive_type}</span>
                  {drive.label && <span className="drive-name">{drive.label}</span>}
                </div>
                <div className="drive-space-info">
                  <span className={critical ? "drive-free critical" : warn ? "drive-free warn" : "drive-free"}>
                    {drive.free_gb.toFixed(0)}GB 여유
                  </span>
                  <span className="drive-total"> / {drive.total_gb.toFixed(0)}GB</span>
                </div>
              </div>
              <UsageBar percent={drive.used_percent} warn={warn} />
              <div className="drive-meta-row">
                <span className="drive-model">{drive.model || drive.file_system}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
