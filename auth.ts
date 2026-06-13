import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { demoMode } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

// The Google Fit scopes ride along with the standard sign-in grant. This means
// the user only sees one consent screen, and the access/refresh tokens for Fit
// land in the same `accounts` row as the auth tokens — no second OAuth dance.
const googleFitScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
  "https://www.googleapis.com/auth/fitness.activity.read",
].join(" ");

// In demo mode there's no database or OAuth client to wire up, and these
// handlers are never called (getViewer hands back a stand-in user instead). We
// still export a valid, empty NextAuth so the module — and the auth route — can
// be imported without a configured backend.
function buildConfig(): NextAuthConfig {
  if (demoMode) {
    return { providers: [], pages: { signIn: "/login" } };
  }

  return {
    adapter: DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        authorization: {
          params: {
            scope: googleFitScopes,
            // Force a refresh token on every consent so background jobs keep working.
            access_type: "offline",
            prompt: "consent",
          },
        },
      }),
    ],
    pages: { signIn: "/login" },
    session: { strategy: "database" },
    callbacks: {
      // Database sessions don't expose the user id by default; add it so queries
      // can be scoped to the signed-in person.
      session({ session, user }) {
        if (session.user) session.user.id = user.id;
        return session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildConfig());
