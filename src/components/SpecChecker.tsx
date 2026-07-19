import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Gamepad2, Monitor, ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  useFloating,
  useListNavigation,
  useInteractions,
  useDismiss,
  offset,
  flip,
  size,
  autoUpdate,
  FloatingPortal,
} from "@floating-ui/react";
import { REQUIREMENTS } from "../data/requirements";
import { checkSpec } from "../utils/specChecker";
import type { HardwareInfo, SpecCheckResult, JudgmentLevel, ConfidenceLevel } from "../types/hardware";
import { cn } from "../utils/cn";

// ─── Label helpers ────────────────────────────────────────────────────────────

function levelLabel(level: JudgmentLevel): string {
  switch (level) {
    case "met":        return "충족";
    case "borderline": return "경계";
    case "unmet":      return "미달";
    case "unknown":    return "판정 불가";
  }
}

function levelClass(level: JudgmentLevel): string {
  switch (level) {
    case "met":        return "bg-green/15 text-[#4ade80] border border-green/25";
    case "borderline": return "bg-amber/15 text-[#fbbf24] border border-amber/25";
    case "unmet":      return "bg-red/15 text-[#f87171] border border-red/25";
    case "unknown":    return "bg-white/[5%] text-muted border border-edge";
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

function confidenceClass(c: ConfidenceLevel): string {
  switch (c) {
    case "high":   return "bg-green/10 text-[#4ade80] border border-green/20";
    case "medium": return "bg-amber/10 text-[#fbbf24] border border-amber/20";
    case "low":    return "bg-white/[5%] text-muted border border-edge";
  }
}

function resultCardClass(overall: JudgmentLevel): string {
  switch (overall) {
    case "met":        return "border-green/30 bg-green/[4%]";
    case "borderline": return "border-amber/30 bg-amber/[4%]";
    case "unmet":      return "border-red/30 bg-red/[4%]";
    case "unknown":    return "border-edge bg-white/[2%]";
  }
}

// ─── Component icons ──────────────────────────────────────────────────────────

function LevelIcon({ level }: { level: JudgmentLevel }) {
  const base = "text-[12px] font-bold w-4 text-center shrink-0";
  if (level === "met")        return <span className={cn(base, "text-[#4ade80]")}>✓</span>;
  if (level === "borderline") return <span className={cn(base, "text-[#fbbf24]")}>△</span>;
  if (level === "unmet")      return <span className={cn(base, "text-[#f87171]")}>✗</span>;
  return <span className={cn(base, "text-muted")}>?</span>;
}

// ─── Result display ───────────────────────────────────────────────────────────

function SpecBreakdown({ result }: { result: SpecCheckResult }) {
  const [showReqs, setShowReqs] = useState(false);
  const req = result.tier === "recommended" && result.app.recommended
    ? result.app.recommended
    : result.app.minimum;

  const rows = [
    { label: "GPU",     judgment: result.components.gpu },
    { label: "CPU",     judgment: result.components.cpu },
    { label: "RAM",     judgment: result.components.ram },
    { label: "저장 공간", judgment: result.components.storage },
  ];

  return (
    <div className="flex flex-col gap-px px-3.5 pb-3">
      {rows.map(({ label, judgment }) => (
        <div key={label} className="flex flex-col gap-0.5 py-[7px] border-t border-edge/40">
          <div className="flex items-center gap-[7px]">
            <LevelIcon level={judgment.level} />
            <span className="text-[13px] font-semibold text-sub min-w-[52px]">{label}</span>
            <span className={cn("text-[11px] font-semibold px-[7px] py-px rounded-[4px]", levelClass(judgment.level))}>
              {levelLabel(judgment.level)}
            </span>
          </div>
          <span className="text-[12px] text-muted pl-[23px] leading-snug break-keep">
            {judgment.reason}
          </span>
        </div>
      ))}

      <button
        className="flex items-center gap-[5px] mt-1.5 py-[5px] text-muted text-[12px] font-[inherit] cursor-pointer transition-colors hover:text-blue bg-transparent"
        onClick={() => setShowReqs(v => !v)}
      >
        <Info size={12} />
        기준 사양 보기
        {showReqs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showReqs && (
        <div className="mt-1.5 p-2.5 bg-white/[3%] rounded-[8px] border border-edge/50 flex flex-col gap-[5px] animate-slide-down">
          {req.cpu        && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">CPU</span><span className="text-sub text-right break-keep">{req.cpu}</span></div>}
          {req.cpu_cores  && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">CPU 코어</span><span className="text-sub text-right">{req.cpu_cores}코어 이상</span></div>}
          {req.cpu_clock_ghz && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">CPU 클럭</span><span className="text-sub text-right">{req.cpu_clock_ghz}GHz 이상</span></div>}
          {req.gpu        && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">GPU</span><span className="text-sub text-right break-keep">{req.gpu}</span></div>}
          {req.allow_integrated_gpu && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">GPU 조건</span><span className="text-sub text-right">내장 그래픽 허용</span></div>}
          {req.vram_gb    && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">VRAM</span><span className="text-sub text-right">{req.vram_gb}GB 이상</span></div>}
          {req.ram_gb     && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">RAM</span><span className="text-sub text-right">{req.ram_gb}GB 이상</span></div>}
          {req.storage_gb && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">저장 공간</span><span className="text-sub text-right">{req.storage_gb}GB 이상</span></div>}
          {req.notes      && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">비고</span><span className="text-amber text-right break-keep">{req.notes}</span></div>}
          {result.app.source && (
            <div className="text-[11px] text-muted mt-1 pt-1.5 border-t border-edge/40 break-all">
              출처: {result.app.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SpecCheckResult }) {
  return (
    <div className={cn("rounded-[8px] border overflow-hidden animate-slide-down", resultCardClass(result.overall))}>
      <div className="flex items-start justify-between gap-3 px-3.5 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-fg">{result.app.name}</span>
          <span className="text-[11px] text-muted bg-white/[5%] border border-edge rounded-[4px] px-[7px] py-px">
            {result.app.kind === "game" ? "게임" : "프로그램"}
          </span>
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className={cn("text-[12px] font-bold px-2.5 py-[3px] rounded-[5px]", levelClass(result.overall))}>
            {overallLabel(result.overall, result.tier)}
          </span>
          <span className={cn("text-[11px] px-2 py-[2px] rounded-[4px] font-medium", confidenceClass(result.confidence))}>
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<Array<HTMLButtonElement | null>>([]);

  const filtered = REQUIREMENTS.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const selectedApp = REQUIREMENTS.find(r => r.id === selectedId) ?? null;
  const result = selectedApp ? checkSpec(data, selectedApp, tier) : null;
  const hasRecommended = selectedApp?.recommended != null;

  // ─── Floating UI ────────────────────────────────────────────────────────────

  const { refs, floatingStyles, context } = useFloating<HTMLDivElement>({
    open,
    onOpenChange: (next) => {
      setOpen(next);
      if (!next) setActiveIndex(null);
    },
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: "260px",
            overflowY: "auto",
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true,
  });

  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([listNav, dismiss]);

  // Scroll active item into view when navigating with arrow keys
  useEffect(() => {
    if (activeIndex !== null) {
      listRef.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Merge floating reference with our wrapper div
  const setWrapperRef = useCallback(
    (el: HTMLDivElement | null) => refs.setReference(el),
    [refs]
  );

  function selectApp(id: string, name: string) {
    setSelectedId(id);
    setQuery(name);
    setOpen(false);
    setActiveIndex(null);
    setTier("recommended");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setSelectedId(null);
    setActiveIndex(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && activeIndex !== null && filtered[activeIndex]) {
      e.preventDefault();
      selectApp(filtered[activeIndex].id, filtered[activeIndex].name);
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(null);
    }
  }

  return (
    <div className="bg-card border border-edge rounded-[14px] shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top: header + search */}
      <div className="px-4 py-3.5 flex flex-col gap-2.5 shrink-0 border-b border-edge">
        <div className="flex items-center gap-2 text-[14px] font-bold text-fg">
          <Gamepad2 size={15} />
          <span>게임 / 프로그램 사양 검사</span>
          <span className="ml-auto text-[11px] font-medium text-muted bg-white/[5%] border border-edge rounded-[4px] px-2 py-px">
            추정 판정
          </span>
        </div>

        <div className="flex gap-2.5 items-center">
          {/* Search input — floating reference */}
          <div ref={setWrapperRef} className="flex-1 relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-muted pointer-events-none" />
            <input
              ref={inputRef}
              className="w-full py-2 pl-8 pr-8 bg-base border border-edge rounded-[8px] text-fg text-[13px] font-[inherit] outline-none transition-colors focus:border-blue placeholder:text-muted"
              placeholder="게임 또는 프로그램 이름 검색..."
              value={query}
              {...getReferenceProps({
                onFocus: () => setOpen(true),
                onChange: handleInputChange as React.ChangeEventHandler,
                onKeyDown: handleKeyDown as React.KeyboardEventHandler,
              })}
            />
            {query && (
              <button
                className="absolute right-2 text-muted hover:text-fg text-base leading-none px-1 py-0.5 bg-transparent cursor-pointer"
                onClick={() => {
                  setQuery("");
                  setSelectedId(null);
                  setOpen(false);
                  setActiveIndex(null);
                  inputRef.current?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Tier toggle */}
          {selectedApp && (
            <div className="flex border border-edge rounded-[8px] overflow-hidden shrink-0">
              <button
                className={cn(
                  "px-3.5 py-[7px] text-[12px] font-semibold font-[inherit] border-none cursor-pointer transition-all duration-150",
                  tier === "minimum"
                    ? "bg-blue text-white"
                    : "bg-transparent text-muted hover:bg-card-hover hover:text-sub"
                )}
                onClick={() => setTier("minimum")}
              >
                최소
              </button>
              <button
                className={cn(
                  "px-3.5 py-[7px] text-[12px] font-semibold font-[inherit] border-none transition-all duration-150",
                  tier === "recommended"
                    ? "bg-blue text-white"
                    : "bg-transparent text-muted",
                  !hasRecommended
                    ? "opacity-35 cursor-not-allowed"
                    : "cursor-pointer hover:bg-card-hover hover:text-sub"
                )}
                onClick={() => hasRecommended && setTier("recommended")}
                disabled={!hasRecommended}
                title={!hasRecommended ? "권장 사양 데이터 없음" : undefined}
              >
                권장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body: result or empty hint */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {result && (
          <div className="p-3.5">
            <ResultCard result={result} />
          </div>
        )}
        {!result && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[13px] text-muted px-4 py-2 text-center">
              게임이나 프로그램을 검색해 내 PC와 사양을 비교하세요
            </span>
          </div>
        )}
      </div>

      {/* Floating dropdown */}
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-card border border-edge rounded-[8px] shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-[100] overflow-y-auto"
            {...getFloatingProps()}
          >
            {filtered.length > 0 ? (
              filtered.map((r, i) => (
                <button
                  key={r.id}
                  ref={(el) => { listRef.current[i] = el; }}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-[11px] bg-transparent text-[13px] font-[inherit] cursor-pointer text-left transition-colors border-b border-edge/40 last:border-b-0",
                    i === activeIndex || r.id === selectedId
                      ? "bg-card-hover text-fg"
                      : "text-sub hover:bg-card-hover hover:text-fg"
                  )}
                  {...getItemProps({ onClick: () => selectApp(r.id, r.name) })}
                >
                  {r.kind === "game"
                    ? <Gamepad2 size={13} className="text-muted shrink-0" />
                    : <Monitor size={13} className="text-muted shrink-0" />
                  }
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-[11px] text-muted">{r.tags.join(", ")}</span>
                </button>
              ))
            ) : (
              <div className="py-5 px-4 text-[13px] text-muted text-center">
                검색 결과 없음
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
