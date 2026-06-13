import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { signIn } from "@/auth";

export default async function LoginPage() {
  // In demo mode getViewer returns the stand-in user, so this redirects straight
  // to the dashboard and the sign-in form below only ever renders for real.
  if (await getViewer()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md space-y-8 p-9 text-center sm:p-11">
        <div className="space-y-4">
          <span
            className="mx-auto block size-3 rounded-full"
            style={{ background: "var(--accent)" }}
            aria-hidden
          />
          <h1 className="font-display text-3xl text-foreground">
            Welcome to <span className="italic">AlloStatus</span>
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            A daily resilience-buffer score from your wearables and lifestyle —
            and a ranked breakdown of what&apos;s depleting it right now.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className="btn-primary h-11 w-full">
            Continue with Google
          </button>
        </form>

        <p className="text-xs text-muted leading-relaxed">
          Signing in also grants read access to your Google Fit heart-rate, sleep,
          and activity data. You can revoke it any time in your{" "}
          <a href="https://myaccount.google.com/permissions" className="underline">
            Google account
          </a>
          .
        </p>
      </div>
    </main>
  );
}
