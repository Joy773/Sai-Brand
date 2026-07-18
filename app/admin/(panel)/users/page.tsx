"use client";

import { useEffect, useState } from "react";
import { useMessages } from "@/app/i18n/LocaleProvider";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  address: string;
  createdAt: string;
};

type UsersApiResponse = {
  ok: boolean;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    address?: string;
    createdAt: string;
  }>;
  error?: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export default function AdminUsersPage() {
  const { usersTitle, usersDescription, usersTable } =
    useMessages().adminPanel;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        const data = (await response.json()) as UsersApiResponse;

        if (!response.ok || !data.ok || !data.users) {
          throw new Error(data.error ?? usersTable.loadError);
        }

        setUsers(
          data.users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            address: user.address?.trim() || usersTable.noAddress,
            createdAt: formatDate(user.createdAt),
          })),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : usersTable.loadError,
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();
  }, [usersTable.loadError, usersTable.noAddress]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">{usersTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-green/70 sm:mt-3 sm:text-base">
        {usersDescription}
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-beige bg-beige/20">
        {isLoading ? (
          <p className="px-6 py-10 text-sm text-dark-green/70">
            {usersTable.loading}
          </p>
        ) : error ? (
          <p className="px-6 py-10 text-sm text-red-600">{error}</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-10 text-sm text-dark-green/70">
            {usersTable.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-beige bg-beige/40 text-dark-green/70">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {usersTable.name}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell sm:px-6">
                    {usersTable.email}
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {usersTable.address}
                  </th>
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {usersTable.createdAt}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-beige/70 bg-warm-white/60 last:border-b-0"
                  >
                    <td className="px-4 py-4 align-top sm:px-6">
                      <p className="font-medium text-dark-green">{user.name}</p>
                      <p className="mt-0.5 text-xs text-dark-green/60 md:hidden">
                        {user.email}
                      </p>
                    </td>
                    <td className="hidden px-4 py-4 align-top text-dark-green/80 md:table-cell sm:px-6">
                      {user.email}
                    </td>
                    <td className="max-w-xs px-4 py-4 align-top text-dark-green/80 sm:px-6">
                      <p className="whitespace-pre-line break-words">
                        {user.address}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top text-dark-green/80 sm:px-6">
                      {user.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
