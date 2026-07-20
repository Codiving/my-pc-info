import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { HardwareInfo } from "../types/hardware";
import { getMockHardwareInfo } from "../data/mockHardware";

// Tauri 백엔드가 없는 환경(예: Mac 브라우저 `pnpm dev`)에서는 목업 데이터로 미리보기.
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function useHardwareInfo() {
  const [data, setData] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isTauri) {
        await new Promise((r) => setTimeout(r, 400));
        setData(getMockHardwareInfo());
        return;
      }
      const info = await invoke<HardwareInfo>("get_hardware_info");
      setData(info);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  return { data, loading, error, refresh, copyToClipboard, copied };
}
