import { useState, useEffect } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function useUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      check().then(u => setUpdate(u ?? null)).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const install = async () => {
    if (!update || installing) return;
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch {
      setInstalling(false);
    }
  };

  return { update, installing, install };
}
