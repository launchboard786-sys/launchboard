import { notFound, redirect } from "next/navigation";
import { AppError } from "./errors";
import { getCurrentUser } from "./auth";

/** For server pages: send signed-out visitors to login and come back afterwards. */
export async function requireUserOrRedirect(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdminOrRedirect() {
  const user = await requireUserOrRedirect("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Turn "not yours / doesn't exist" errors into a 404 page instead of an error screen. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof AppError && (e.status === 403 || e.status === 404)) notFound();
    throw e;
  }
}
