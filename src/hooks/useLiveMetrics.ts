import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { LiveMetrics } from "../types/hardware";

const HISTORY_LEN = 40; // 미니 그래프에 유지할 표본 수

export interface MetricsHistory {
  cpu: number[];
  ram: number[];
  temp: number[];
}

/**
 * enabled가 true인 동안 intervalMs 간격으로 실시간 지표를 폴링한다.
 * 이전 요청이 끝나기 전에는 겹쳐 호출하지 않는다.
 */
export function useLiveMetrics(enabled: boolean, intervalMs = 2000) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [history, setHistory] = useState<MetricsHistory>({ cpu: [], ram: [], temp: [] });
  const inFlight = useRef(false);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const m = await invoke<LiveMetrics>("get_live_metrics");
      setMetrics(m);
      setHistory((prev) => ({
        cpu: [...prev.cpu, m.cpu_usage_percent].slice(-HISTORY_LEN),
        ram: [...prev.ram, m.ram_usage_percent].slice(-HISTORY_LEN),
        temp: [...prev.temp, m.cpu_temp_c ?? NaN].slice(-HISTORY_LEN),
      }));
    } catch {
      // 일시적 실패는 조용히 무시하고 다음 폴링을 기다린다.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll(); // 켜자마자 즉시 1회
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, poll]);

  // 모니터링을 끄면 히스토리를 초기화해 다음에 깨끗하게 시작.
  useEffect(() => {
    if (!enabled) setHistory({ cpu: [], ram: [], temp: [] });
  }, [enabled]);

  return { metrics, history };
}
