import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "FAQ", description: "Answers about VINs, Vinify reports, pricing and data." };

const FAQ: [string, string][] = [
  ["What is a VIN?", "A Vehicle Identification Number is a 17-character code unique to each vehicle built since 1981. It identifies the manufacturer, vehicle attributes, model year, plant and serial number."],
  ["Is the VIN decoder really free?", "Yes. The decoder uses public data from the U.S. National Highway Traffic Safety Administration (NHTSA). No account or card required."],
  ["Why does my VIN say the check digit doesn’t match?", "The 9th character is a check digit calculated from the others. A mismatch almost always means a typo — commonly 0 vs. D, 1 vs. 7, or 5 vs. S. Vehicles built for markets outside North America may not use a check digit."],
  ["What’s in a Vinify history report?", "Reports focus on title records and brands, odometer readings, insurance total-loss records and theft records, plus other categories where our data partners provide them. Each section is labelled with what was found. See our data coverage page for details."],
  ["Is Vinify the same as CARFAX?", "No. Vinify is an independent service and isn’t affiliated with CARFAX. Different providers use different data sources, so reports can differ."],
  ["If a report says “No records found,” is the car clean?", "Not necessarily. It means our sources returned nothing for that category. Some events are never reported. Always get an independent inspection."],
  ["Do recall results mean my car has an open recall?", "The free decoder lists NHTSA recall campaigns for the vehicle’s year, make and model. Not every vehicle is affected, and it doesn’t show whether a repair was done. Check the exact VIN with the manufacturer or at nhtsa.gov/recalls."],
  ["Do you show previous owners’ names or addresses?", "No. Vinify reports describe the vehicle, not the people who owned it."],
  ["What happens if my report fails to generate?", "If our data source can’t produce your report, the credit is returned to your account automatically."],
  ["When do paid reports launch?", "Once our data partnerships are finalised. The free decoder is available now."],
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageIntro eyebrow="FAQ" title="Good questions, straight answers." />
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="mt-0.5 text-xl leading-none text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
