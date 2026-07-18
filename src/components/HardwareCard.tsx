import { useState } from "react";
import { Copy, Check, type LucideIcon } from "lucide-react";

interface HardwareCardProps {
  Icon: LucideIcon;
  title: string;
  color: string;
  mainValue: string | null;
  specs: Array<{ label: string; value: string }>;
  copyText: string;
  usagePercent?: number;
}

export function HardwareCard({ Icon, title, color, mainValue, specs, copyText, usagePercent }: HardwareCardProps) {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const barColor = usagePercent != null && usagePercent >= 85 ? "var(--accent-red)" : color;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-icon" style={{ color, backgroundColor: color + "20" }}>
            <Icon size={22} />
          </div>
          <div className="card-title">{title}</div>
        </div>
        <button
          className={`copy-btn-icon ${justCopied ? "copied" : ""}`}
          onClick={handleCopy}
          disabled={!mainValue}
          title={`${title} 정보 복사`}
        >
          {justCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="card-main-value">
        {mainValue ?? <span className="unavailable">감지 불가</span>}
      </div>

      {usagePercent != null && (
        <div className="usage-row">
          <div className="usage-bar-track">
            <div className="usage-bar-fill" style={{ width: `${usagePercent}%`, background: barColor }} />
          </div>
          <span className="usage-label" style={{ color: barColor }}>{usagePercent}%</span>
        </div>
      )}

      <div className="card-specs">
        {specs.map((spec) => (
          <div key={spec.label} className="spec-row">
            <span className="spec-label">{spec.label}</span>
            <span className="spec-value">{spec.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
