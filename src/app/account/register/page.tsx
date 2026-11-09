import { PageShell } from "@/components/PageShell";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create a Vinify account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-md px-6 py-16">
        <h1 className="mb-5 text-3xl font-bold">Create your Vinify account</h1>
        <RegisterForm />
      </section>
    </PageShell>
  );
}
