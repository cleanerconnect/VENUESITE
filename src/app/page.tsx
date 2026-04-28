import { redirect } from "next/navigation";

// Root always lands on /splash. The splash component reads localStorage
// and forwards to /dashboard (session exists) or /login (no session).
export default function Index() {
  redirect("/splash");
}
