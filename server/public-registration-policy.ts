/** Never let public registration choose staff privileges. Provision agents/admins out of band. */
export function enforcePublicClientRole<T extends { role?: string | null }>(
  proposed: T,
): Omit<T, "role"> & { role: "client" } {
  if (proposed.role != null && proposed.role !== "client") {
    throw new Error("Public registration cannot assign staff roles");
  }
  return { ...proposed, role: "client" };
}
