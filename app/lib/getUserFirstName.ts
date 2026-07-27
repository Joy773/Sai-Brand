export function getUserFirstName(user: {
  name?: string | null;
  address?: { firstName?: string | null } | null;
}): string {
  const addressFirst = user.address?.firstName?.trim();
  if (addressFirst) {
    return addressFirst;
  }

  const name = user.name?.trim() ?? "";
  const [firstName] = name.split(/\s+/);
  return firstName || name;
}
