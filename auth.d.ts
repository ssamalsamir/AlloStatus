import type { DefaultSession } from "next-auth";

// Surface the user id on the session so server code can scope queries to the
// signed-in person. The id is populated by the `session` callback in auth.ts.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
