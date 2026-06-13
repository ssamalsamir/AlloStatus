import { redirect } from "next/navigation";

// The dashboard is public: logged-out visitors see the demo, signed-in users
// see their own data. So the landing just forwards there.
export default function Landing() {
  redirect("/dashboard");
}
