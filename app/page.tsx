import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";

export default async function Landing() {
  const viewer = await getViewer();
  redirect(viewer ? "/dashboard" : "/login");
}
