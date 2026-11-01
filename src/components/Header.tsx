import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { NavBar } from "./NavBar";

export async function Header() {
  const user = await getCurrentUser();
  return <NavBar appName={config.appName} user={user ? { name: user.name, role: user.role } : null} />;
}
