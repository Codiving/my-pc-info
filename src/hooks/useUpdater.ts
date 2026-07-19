import { useState, useEffect } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function useUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      check().then(u => {
        if (u) {
          setUpdate(u);
          setShowModal(true);
        }
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => setShowModal(false);

  const openModal = () => setShowModal(true);

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

  return { update, showModal, installing, dismiss, openModal, install };
}
