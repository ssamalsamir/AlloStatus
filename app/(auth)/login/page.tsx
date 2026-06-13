import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">AlloStatus</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            A daily resilience score from your wearables and lifestyle —
            and the ranked nudges to move it.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full h-11 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition"
          >
            Continue with Google
          </button>
        </form>

        <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
          Signing in also grants read access to your Google Fit heart-rate,
          sleep, and activity data. You can revoke this any time in your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="underline"
          >
            Google account
          </a>
          .
        </p>
      </div>
    </main>
  );
}
