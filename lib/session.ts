import { demoMode } from "@/lib/config";

// A "viewer" is whoever the dashboard is rendering for. In real mode it's the
// signed-in Auth.js user; in demo mode it's a fixed stand-in so the whole app
// works without anyone signing in. Pages depend on this, never on Auth.js
// directly, which is what lets demo mode skip the database and OAuth entirely.
export interface Viewer {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isDemo: boolean;
}

export const DEMO_VIEWER: Viewer = {
  id: "demo",
  name: "Sam",
  email: "demo@allostatus.app",
  image: null,
  isDemo: true,
};

export async function getViewer(): Promise<Viewer | null> {
  if (demoMode) return DEMO_VIEWER;

  // Imported lazily so demo mode never pulls in Auth.js or the database client.
  const { auth } = await import("@/auth");
  const user = (await auth())?.user;
  if (!user?.id) return null;

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    isDemo: false,
  };
}
