import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { HardwareInfo } from "../types/hardware";
import { getMockHardwareInfo } from "../data/mockHardware";

export function useHardwareInfo() {
  const [data, setData] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await invoke<HardwareInfo>("get_hardware_info");
      setData(info);
    } catch (e) {
      // 개발 모드에서는 백엔드가 없거나(브라우저 `pnpm dev`) Windows가 아니어서
      // (Mac `pnpm tauri dev` → WINDOWS_ONLY) 실패하면 목업으로 미리보기한다.
      // 릴리즈 빌드에서는 import.meta.env.DEV가 false라 이 분기와 목업 모듈이 통째로 제거된다.
      if (import.meta.env.DEV) {
        setData(getMockHardwareInfo());
      } else {
        setData(null);
        setError(e instanceof Error ? e.message : String(e));
      }
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
