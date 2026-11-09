"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Installation = createContext<{ installed: boolean; prompt: InstallPrompt | null; clearPrompt: () => void }>({
  installed: false,
  prompt: null,
  clearPrompt() {},
});

export function AppInstallation({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => setInstalled(standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const savePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const appInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    syncDisplayMode();
    standalone.addEventListener("change", syncDisplayMode);
    window.addEventListener("beforeinstallprompt", savePrompt);
    window.addEventListener("appinstalled", appInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // The manifest and browser's install menu remain available.
      });
    }

    return () => {
      standalone.removeEventListener("change", syncDisplayMode);
      window.removeEventListener("beforeinstallprompt", savePrompt);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  return <Installation.Provider value={{ installed, prompt, clearPrompt: () => setPrompt(null) }}>{children}</Installation.Provider>;
}

export function InstallControls() {
  const { installed, prompt, clearPrompt } = useContext(Installation);
  const [pending, setPending] = useState(false);

  async function install() {
    if (!prompt || pending) return;
    setPending(true);
    try {
      await prompt.prompt();
    } catch {
      // The platform instructions below cover browsers that decline the prompt.
    } finally {
      clearPrompt();
      setPending(false);
    }
  }

  if (installed) return <p role="status" className="font-semibold text-navy-900">Vinify is installed.</p>;

  return (
    <>
      {prompt && <button className="admin-button mb-6" type="button" onClick={install} disabled={pending}>Install Vinify</button>}
      <ul className="space-y-4 text-muted">
        <li><strong className="text-navy-900">iPhone or iPad</strong> · In Safari, open Share and choose Add to Home Screen.</li>
        <li><strong className="text-navy-900">Android</strong> · Open Chrome’s menu and choose Install app or Add to Home screen.</li>
        <li><strong className="text-navy-900">Desktop</strong> · Use Chrome or Edge’s install icon or app menu. In Safari on Mac, choose File, then Add to Dock.</li>
      </ul>
    </>
  );
}
