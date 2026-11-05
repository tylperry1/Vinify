import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/PageShell";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <PageShell>
      <PageIntro eyebrow="Contact" title="Questions? We’re listening.">
        Dealership enquiries, report questions, feedback on the preview — send it our way.
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          {[
            ["Report or billing issue", "Include your report number (it starts with VNF-) so we can find it quickly."],
            ["Dealership & business", "Tell us roughly how many reports you run per month."],
            ["Data or privacy request", "Requests about your personal data and account deletion."],
          ].map(([t, d]) => (
            <div key={t}>
              <h2 className="font-bold text-navy-900">{t}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <ContactForm />
      </section>
    </PageShell>
  );
}
