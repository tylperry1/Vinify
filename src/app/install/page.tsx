import type { Metadata } from "next";
import { InstallControls } from "@/components/AppInstallation";
import { PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Install Vinify" };

export default function InstallPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Vinify app" title="Install Vinify">
        Open Vinify from your home screen, dock, or app launcher.
      </PageIntro>
      <section aria-label="Installation options" className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <InstallControls />
        <p className="mt-8 text-sm text-muted">VIN decoding, reports, and account features require an internet connection.</p>
      </section>
    </PageShell>
  );
}
