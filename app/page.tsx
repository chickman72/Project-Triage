import Link from "next/link";
import ChatInterface from "../components/ChatInterface";

type PageProps = {
  searchParams?: { mode?: string };
};

export default function Home({ searchParams }: PageProps) {
  const mode =
    searchParams?.mode === "provider" ? "provider" : searchParams?.mode === "patient" ? "patient" : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 lg:px-10">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            Project Triage
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-800 sm:text-5xl">
            AI-assisted intake and clinical insight, ready in seconds.
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Choose a flow to begin. Patient Intake captures structured symptoms.
            Provider Dashboard surfaces an instant summary powered by your
            patient records.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/?mode=patient"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-sky-600"
            >
              Enter Patient Mode
            </Link>
            <Link
              href="/provider"
              className="rounded-full border border-slate-200 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand"
            >
              Open Provider Mode
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/60 p-6 shadow-soft">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
              Upcoming: triage summary, risk flags, and evidence-aware notes.
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
              Securely connect to Cosmos DB and Azure OpenAI.
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
              Built with Next.js App Router + Tailwind for clinical clarity.
            </div>
          </div>
        </div>
      </section>

      {mode && (
        <section className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-3xl bg-white/80 p-6 text-sm text-slate-600 shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Active Mode
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-800">
              {mode === "patient" ? "Patient Intake" : "Provider Dashboard"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {mode === "patient"
                ? "Collects structured symptoms and history."
                : "Queries Cosmos DB to answer clinical questions."}
            </p>
          </aside>
          <ChatInterface mode={mode} />
        </section>
      )}
    </main>
  );
}
