import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
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
          // Force a refresh token on every consent so background jobs keep working
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "database" },
});
