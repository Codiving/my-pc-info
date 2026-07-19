import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Gamepad2, Monitor, ChevronDown, ChevronUp, Info, ExternalLink } from "lucide-react";
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
import { invoke } from "@tauri-apps/api/core";
import { REQUIREMENTS } from "../data/requirements";
import { checkSpec } from "../utils/specChecker";
import { appKindLabel } from "../utils/appKind";
import type { HardwareInfo, SpecCheckResult, JudgmentLevel, ConfidenceLevel } from "../types/hardware";
import { cn } from "../utils/cn";

const POPULAR_QUERIES = ["롤", "발로란트", "배그", "포토샵", "프리미어"];

// ─── Label helpers ────────────────────────────────────────────────────────────

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\p{P}\p{S}\s_]+/gu, "");
}

function scoreRequirementMatch(requirement: (typeof REQUIREMENTS)[number], query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const fields = [
    { value: requirement.name, score: 0 },
    ...(requirement.aliases ?? []).map((value) => ({ value, score: 1 })),
    ...requirement.tags.map((value) => ({ value, score: 2 })),
  ];

  let bestScore = Number.POSITIVE_INFINITY;
  for (const field of fields) {
    const normalizedField = normalizeSearchText(field.value);
    if (normalizedField.includes(normalizedQuery)) {
      bestScore = Math.min(bestScore, field.score);
    }
  }

  return bestScore;
}

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
    case "met":        return "bg-white/[4%] text-green border border-edge/70";
    case "borderline": return "bg-white/[4%] text-amber border border-edge/70";
    case "unmet":      return "bg-white/[4%] text-red border border-edge/70";
    case "unknown":    return "bg-white/[4%] text-muted border border-edge/70";
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

function resultCardClass(overall: JudgmentLevel): string {
  switch (overall) {
    case "met":        return "border-edge/80 bg-white/[2%]";
    case "borderline": return "border-edge/80 bg-white/[2%]";
    case "unmet":      return "border-edge/80 bg-white/[2%]";
    case "unknown":    return "border-edge/80 bg-white/[2%]";
  }
}

function sourceLabel(app: Pick<SpecCheckResult["app"], "source" | "sourceName">): string {
  if (!app.source) return "";
  if (app.sourceName) return app.sourceName;

  try {
    return new URL(app.source).hostname.replace(/^www\./, "");
  } catch {
    return app.source;
  }
}

function resultSummary(result: SpecCheckResult): { title: string; detail: string } {
  const tierLabel = result.tier === "recommended" ? "권장" : "최소";

  if (result.overall === "met") {
    return {
      title: `${tierLabel} 사양을 충족합니다.`,
      detail: "현재 설정 기준으로는 무난하게 사용할 가능성이 높습니다.",
    };
  }

  if (result.overall === "borderline") {
    return {
      title: `${tierLabel} 사양에 근접합니다.`,
      detail: "설정을 조금 낮추면 더 안정적으로 사용할 수 있습니다.",
    };
  }

  if (result.overall === "unmet") {
    return {
      title: `${tierLabel} 사양에 미달합니다.`,
      detail: "실행은 되더라도 끊김이나 옵션 제한이 있을 수 있습니다.",
    };
  }

  return {
    title: "정확한 판정이 어렵습니다.",
    detail: "일부 하드웨어를 인식하지 못해 결과가 보수적으로 계산됐습니다.",
  };
}

async function openExternalUrl(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!("__TAURI_INTERNALS__" in window)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    await invoke("open_external_url", { url });
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
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
        className="flex items-center gap-[5px] mt-1.5 py-[5px] text-muted text-[12px] font-[inherit] cursor-pointer transition-colors hover:text-fg bg-transparent"
        onClick={() => setShowReqs(v => !v)}
      >
        <Info size={12} />
        기준 사양 보기
        {showReqs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showReqs && (
        <div className="mt-1.5 p-2.5 bg-white/[2%] rounded-[8px] border border-edge/60 flex flex-col gap-[5px] animate-slide-down">
          {req.cpu        && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">CPU</span><span className="text-sub text-right break-keep">{req.cpu}</span></div>}
          {req.cpu_cores  && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">CPU 코어</span><span className="text-sub text-right">{req.cpu_cores}코어 이상</span></div>}
          {req.cpu_clock_ghz && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">CPU 클럭</span><span className="text-sub text-right">{req.cpu_clock_ghz}GHz 이상</span></div>}
          {req.gpu        && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">GPU</span><span className="text-sub text-right break-keep">{req.gpu}</span></div>}
          {req.allow_integrated_gpu && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">GPU 조건</span><span className="text-sub text-right">내장 그래픽 허용</span></div>}
          {req.vram_gb    && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">VRAM</span><span className="text-sub text-right">{req.vram_gb}GB 이상</span></div>}
          {req.ram_gb     && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">RAM</span><span className="text-sub text-right">{req.ram_gb}GB 이상</span></div>}
          {req.storage_gb && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">저장 공간</span><span className="text-sub text-right">{req.storage_gb}GB 이상</span></div>}
          {req.notes      && <div className="flex justify-between gap-3 text-[12px]"><span className="text-muted shrink-0 min-w-[70px]">비고</span><span className="text-amber text-right break-keep">{req.notes}</span></div>}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SpecCheckResult }) {
  const summary = resultSummary(result);
  const source = sourceLabel(result.app);
  const statusTone =
    result.overall === "met" ? "text-green" :
    result.overall === "borderline" ? "text-amber" :
    result.overall === "unmet" ? "text-red" :
    "text-muted";

  const badgeBase =
    "inline-flex h-9 items-center justify-center rounded-[10px] border border-edge/70 bg-white/[2%] px-3.5 text-[12px] font-medium leading-none whitespace-nowrap";

  return (
    <div className={cn("rounded-[8px] border overflow-hidden animate-slide-down", resultCardClass(result.overall))}>
      <div className="flex items-start justify-between gap-3 px-3.5 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-fg">{result.app.name}</span>
          <span className="text-[11px] text-muted bg-white/[5%] border border-edge rounded-[4px] px-[7px] py-px">
            {appKindLabel(result.app.kind)}
          </span>
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className={cn(badgeBase, statusTone)}>
            {overallLabel(result.overall, result.tier)}
          </span>
          <span className={cn(badgeBase, "text-muted")}>
            {confidenceLabel(result.confidence)}
          </span>
        </div>
      </div>
      <div className="px-3.5 pb-1">
        <div className="rounded-[8px] border border-edge/60 bg-white/[2%] px-3 py-2">
          <div className="text-[14px] font-semibold text-fg">{summary.title}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-muted">{summary.detail}</div>
        </div>
      </div>
      <SpecBreakdown result={result} />
      {result.app.source && (
        <div className="px-3.5 pb-3">
          <div className="rounded-[8px] border border-edge/60 bg-white/[2%] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-sub">출처</div>
              </div>
              <button
                type="button"
                onClick={() => void openExternalUrl(result.app.source!)}
                className="inline-flex items-center gap-1 shrink-0 rounded-[7px] border border-edge bg-base px-2.5 py-1.5 text-[11px] font-semibold text-sub transition-colors hover:border-edge/80 hover:text-fg"
                title={result.app.source}
              >
                문서 열기
                <ExternalLink size={11} />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted break-all">
              <span className="font-medium text-muted">{source}</span>
              <span className="text-edge">·</span>
              <span>{result.app.source}</span>
            </div>
          </div>
        </div>
      )}
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

  const filtered = REQUIREMENTS
    .map((requirement) => ({
      requirement,
      score: scoreRequirementMatch(requirement, query),
    }))
    .filter(({ score }) => score !== Number.POSITIVE_INFINITY)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;

      const queryRank = normalizeSearchText(query);
      const aName = normalizeSearchText(a.requirement.name);
      const bName = normalizeSearchText(b.requirement.name);

      const aPrefix = aName.startsWith(queryRank) ? 0 : 1;
      const bPrefix = bName.startsWith(queryRank) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;

      return a.requirement.name.localeCompare(b.requirement.name, "ko");
    })
    .map(({ requirement }) => requirement);

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
    <div className="bg-card border border-edge rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.22)] flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top: header + search */}
      <div className="px-4 py-3.5 flex flex-col gap-2.5 shrink-0 border-b border-edge">
        <div className="flex items-center gap-2 text-[14px] font-bold text-fg">
          <Gamepad2 size={15} />
          <span>게임 / 프로그램 사양 검사</span>
          <span className="ml-auto text-[11px] font-medium text-muted bg-white/[4%] border border-edge rounded-[4px] px-2 py-px">
            추정 판정
          </span>
        </div>

        <div className="flex gap-2.5 items-center">
          {/* Search input — floating reference */}
          <div ref={setWrapperRef} className="flex-1 relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-muted pointer-events-none" />
            <input
              ref={inputRef}
              className="w-full py-2 pl-8 pr-8 bg-base border border-edge rounded-[8px] text-fg text-[13px] font-[inherit] outline-none transition-colors focus:border-edge/80 placeholder:text-muted"
              placeholder="게임, 프로그램 또는 별칭 검색... (예: 롤, 배그, 포토샵)"
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
                    ? "bg-white/[5%] text-fg"
                    : "bg-transparent text-muted hover:bg-white/[4%] hover:text-sub"
                )}
                onClick={() => setTier("minimum")}
              >
                최소
              </button>
              <button
                className={cn(
                  "px-3.5 py-[7px] text-[12px] font-semibold font-[inherit] border-none transition-all duration-150",
                  tier === "recommended"
                    ? "bg-white/[5%] text-fg"
                    : "bg-transparent text-muted",
                  !hasRecommended
                    ? "opacity-35 cursor-not-allowed"
                    : "cursor-pointer hover:bg-white/[4%] hover:text-sub"
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

        {!selectedApp && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted">빠른 검색</span>
            {POPULAR_QUERIES.map((item) => (
              <button
                key={item}
                className="px-2.5 py-1 rounded-[999px] border border-edge bg-white/[2%] text-[11px] text-sub font-medium cursor-pointer transition-colors hover:bg-white/[4%] hover:text-fg hover:border-edge"
                onClick={() => {
                  setQuery(item);
                  setOpen(true);
                  setSelectedId(null);
                  setActiveIndex(null);
                  inputRef.current?.focus();
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
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
            className="bg-card border border-edge rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.28)] z-[100] overflow-y-auto"
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
