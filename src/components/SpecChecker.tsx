import { useState, useRef, useEffect } from "react";
import { Search, Gamepad2, Monitor, ChevronDown, ChevronUp, Info } from "lucide-react";
import { REQUIREMENTS } from "../data/requirements";
import { checkSpec } from "../utils/specChecker";
import type { HardwareInfo, SpecCheckResult, JudgmentLevel, ConfidenceLevel } from "../types/hardware";

// ─── Label helpers ────────────────────────────────────────────────────────────

function levelLabel(level: JudgmentLevel): string {
  switch (level) {
    case "met":       return "충족";
    case "borderline": return "경계";
    case "unmet":     return "미달";
    case "unknown":   return "판정 불가";
  }
}

function levelColor(level: JudgmentLevel): string {
  switch (level) {
    case "met":       return "spec-level-met";
    case "borderline": return "spec-level-borderline";
    case "unmet":     return "spec-level-unmet";
    case "unknown":   return "spec-level-unknown";
  }
}

function overallLabel(level: JudgmentLevel, tier: "minimum" | "recommended"): string {
  const tierLabel = tier === "recommended" ? "권장" : "최소";
  switch (level) {
    case "met":        return `${tierLabel} 사양 충족`;
    case "borderline": return `${tierLabel} 사양 경계`;
    case "unmet":      return `${tierLabel} 사양 미달`;
    case "unknown":    return "판정 불가";
  }
}

function confidenceLabel(c: ConfidenceLevel): string {
  switch (c) {
    case "high":   return "신뢰도 높음";
    case "medium": return "신뢰도 보통";
    case "low":    return "신뢰도 낮음";
  }
}

// ─── Component icons ──────────────────────────────────────────────────────────

function LevelIcon({ level }: { level: JudgmentLevel }) {
  if (level === "met")        return <span className="spec-icon spec-icon-met">✓</span>;
  if (level === "borderline") return <span className="spec-icon spec-icon-borderline">△</span>;
  if (level === "unmet")      return <span className="spec-icon spec-icon-unmet">✗</span>;
  return <span className="spec-icon spec-icon-unknown">?</span>;
}

// ─── Result display ───────────────────────────────────────────────────────────

function SpecBreakdown({ result }: { result: SpecCheckResult }) {
  const [showReqs, setShowReqs] = useState(false);
  const req = result.tier === "recommended" && result.app.recommended
    ? result.app.recommended
    : result.app.minimum;

  const rows = [
    { label: "GPU",    judgment: result.components.gpu },
    { label: "CPU",    judgment: result.components.cpu },
    { label: "RAM",    judgment: result.components.ram },
    { label: "저장 공간", judgment: result.components.storage },
  ];

  return (
    <div className="spec-breakdown">
      {rows.map(({ label, judgment }) => (
        <div key={label} className="spec-row-item">
          <div className="spec-row-left">
            <LevelIcon level={judgment.level} />
            <span className="spec-row-label">{label}</span>
            <span className={`spec-level-badge ${levelColor(judgment.level)}`}>
              {levelLabel(judgment.level)}
            </span>
          </div>
          <span className="spec-row-reason">{judgment.reason}</span>
        </div>
      ))}

      <button
        className="spec-toggle-reqs"
        onClick={() => setShowReqs(v => !v)}
      >
        <Info size={12} />
        기준 사양 보기
        {showReqs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showReqs && (
        <div className="spec-req-detail">
          {req.cpu     && <div className="spec-req-row"><span>CPU</span><span>{req.cpu}</span></div>}
          {req.cpu_cores && <div className="spec-req-row"><span>CPU 코어</span><span>{req.cpu_cores}코어 이상</span></div>}
          {req.cpu_clock_ghz && <div className="spec-req-row"><span>CPU 클럭</span><span>{req.cpu_clock_ghz}GHz 이상</span></div>}
          {req.gpu     && <div className="spec-req-row"><span>GPU</span><span>{req.gpu}</span></div>}
          {req.allow_integrated_gpu && <div className="spec-req-row"><span>GPU 조건</span><span>내장 그래픽 허용</span></div>}
          {req.vram_gb && <div className="spec-req-row"><span>VRAM</span><span>{req.vram_gb}GB 이상</span></div>}
          {req.ram_gb  && <div className="spec-req-row"><span>RAM</span><span>{req.ram_gb}GB 이상</span></div>}
          {req.storage_gb && <div className="spec-req-row"><span>저장 공간</span><span>{req.storage_gb}GB 이상</span></div>}
          {req.notes   && <div className="spec-req-row spec-req-note"><span>비고</span><span>{req.notes}</span></div>}
          {result.app.source && (
            <div className="spec-req-source">출처: {result.app.source}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SpecCheckResult }) {
  return (
    <div className={`spec-result-card spec-result-${result.overall}`}>
      <div className="spec-result-header">
        <div className="spec-result-title-group">
          <span className="spec-result-name">{result.app.name}</span>
          <span className="spec-result-kind">
            {result.app.kind === "game" ? "게임" : "프로그램"}
          </span>
        </div>
        <div className="spec-result-badges">
          <span className={`spec-overall-badge ${levelColor(result.overall)}`}>
            {overallLabel(result.overall, result.tier)}
          </span>
          <span className={`spec-confidence-badge spec-conf-${result.confidence}`}>
            {confidenceLabel(result.confidence)}
          </span>
        </div>
      </div>
      <SpecBreakdown result={result} />
    </div>
  );
}

// ─── Main SpecChecker ─────────────────────────────────────────────────────────

export function SpecChecker({ data }: { data: HardwareInfo }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tier, setTier] = useState<"minimum" | "recommended">("recommended");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = REQUIREMENTS.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const selectedApp = REQUIREMENTS.find(r => r.id === selectedId) ?? null;
  const result = selectedApp ? checkSpec(data, selectedApp, tier) : null;

  const hasRecommended = selectedApp?.recommended != null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectApp(id: string, name: string) {
    setSelectedId(id);
    setQuery(name);
    setOpen(false);
    setTier("recommended");
  }

  return (
    <div className="spec-checker">
      <div className="spec-checker-top">
        <div className="spec-checker-header">
          <Gamepad2 size={15} />
          <span>게임 / 프로그램 사양 검사</span>
          <span className="spec-checker-hint">추정 판정</span>
        </div>

        <div className="spec-search-row">
          <div className="spec-search-wrap">
            <Search size={14} className="spec-search-icon" />
            <input
              ref={inputRef}
              className="spec-search-input"
              placeholder="게임 또는 프로그램 이름 검색..."
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedId(null); }}
              onFocus={() => setOpen(true)}
            />
            {query && (
              <button
                className="spec-search-clear"
                onClick={() => { setQuery(""); setSelectedId(null); setOpen(false); inputRef.current?.focus(); }}
              >×</button>
            )}
          </div>

          {selectedApp && (
            <div className="spec-tier-toggle">
              <button
                className={`spec-tier-btn ${tier === "minimum" ? "active" : ""}`}
                onClick={() => setTier("minimum")}
              >최소</button>
              <button
                className={`spec-tier-btn ${tier === "recommended" ? "active" : ""} ${!hasRecommended ? "disabled" : ""}`}
                onClick={() => hasRecommended && setTier("recommended")}
                disabled={!hasRecommended}
                title={!hasRecommended ? "권장 사양 데이터 없음" : undefined}
              >권장</button>
            </div>
          )}
        </div>
      </div>

      <div className="spec-checker-body">
        {open && filtered.length > 0 && (
          <div ref={dropdownRef} className="spec-game-list">
            {filtered.map(r => (
              <button
                key={r.id}
                className={`spec-game-item ${r.id === selectedId ? "selected" : ""}`}
                onClick={() => selectApp(r.id, r.name)}
              >
                {r.kind === "game"
                  ? <Gamepad2 size={13} className="spec-dropdown-icon" />
                  : <Monitor size={13} className="spec-dropdown-icon" />
                }
                <span className="spec-dropdown-name">{r.name}</span>
                <span className="spec-dropdown-tags">{r.tags.join(", ")}</span>
              </button>
            ))}
          </div>
        )}

        {open && query && filtered.length === 0 && (
          <div ref={dropdownRef} className="spec-game-list-empty">검색 결과 없음</div>
        )}

        {result && (
          <div className="spec-result-wrap">
            <ResultCard result={result} />
          </div>
        )}

        {!result && !open && (
          <div className="spec-empty-hint">
            <span>게임이나 프로그램을 검색해 내 PC와 사양을 비교하세요</span>
          </div>
        )}
      </div>
    </div>
  );
}
