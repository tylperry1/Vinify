"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-bold">Administration unavailable</h1><p className="my-4">Check database configuration and migrations, or try again shortly. No changes have been confirmed.</p><button className="admin-button" onClick={reset}>Try again</button></main>;
}
