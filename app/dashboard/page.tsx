import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="flex-1 px-6 py-12 max-w-3xl w-full mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Signed in as {session.user.email}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Resilience buffer
          </h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
        <p className="text-6xl font-bold tracking-tight">—%</p>
        <p className="text-sm text-zinc-500">
          Score lands here once we have a few days of data.
          Day 2 wires up the scoring engine; day 3 the lifestyle form.
        </p>
      </section>

      <section className="space-y-2 text-sm text-zinc-500">
        <p>What&apos;s coming next:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Lifestyle log (diet, social, exercise)</li>
          <li>Google Fit pull (HRV, sleep, resting HR)</li>
          <li>Apple Health upload + iOS Shortcut</li>
          <li>Ranked depleting factors with nudges</li>
          <li>30-day trend</li>
        </ul>
      </section>
    </main>
  );
}
