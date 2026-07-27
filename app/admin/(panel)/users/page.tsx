"use client";

import { useEffect, useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
import EditUserAddressModal, {
  type EditableAddressFields,
} from "@/app/components/EditUserAddressModal";
import { useMessages } from "@/app/i18n/LocaleProvider";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  address: string;
  addressFields: EditableAddressFields;
  createdAt: string;
};

type UsersApiResponse = {
  ok: boolean;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    address?: string;
    addressFields?: EditableAddressFields;
    createdAt: string;
  }>;
  error?: string;
};

const emptyAddressFields = (): EditableAddressFields => ({
  firstName: "",
  lastName: "",
  streetAddress: "",
  country: "",
  stateProvince: "",
  city: "",
  zipPostalCode: "",
  phoneNumber: "",
});

function hasAddressFields(address: EditableAddressFields): boolean {
  return Boolean(
    address.firstName.trim() ||
      address.lastName.trim() ||
      address.streetAddress.trim() ||
      address.country.trim() ||
      address.stateProvince.trim() ||
      address.city.trim() ||
      address.zipPostalCode.trim() ||
      address.phoneNumber.trim(),
  );
}

function AddressDisplay({
  address,
  labels,
  emptyLabel,
}: {
  address: EditableAddressFields;
  labels: {
    addressName: string;
    addressStreet: string;
    addressCity: string;
    addressState: string;
    addressZip: string;
    addressCountry: string;
    addressPhone: string;
  };
  emptyLabel: string;
}) {
  if (!hasAddressFields(address)) {
    return (
      <p className="rounded-xl border border-dashed border-dark-green/15 px-3 py-2 text-sm text-dark-green/50">
        {emptyLabel}
      </p>
    );
  }

  const fullName = [address.firstName, address.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  const detailRows = [
    address.streetAddress.trim()
      ? { label: labels.addressStreet, value: address.streetAddress.trim() }
      : null,
    address.city.trim()
      ? { label: labels.addressCity, value: address.city.trim() }
      : null,
    address.stateProvince.trim()
      ? { label: labels.addressState, value: address.stateProvince.trim() }
      : null,
    address.zipPostalCode.trim()
      ? { label: labels.addressZip, value: address.zipPostalCode.trim() }
      : null,
    address.country.trim()
      ? { label: labels.addressCountry, value: address.country.trim() }
      : null,
    address.phoneNumber.trim()
      ? { label: labels.addressPhone, value: address.phoneNumber.trim() }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="min-w-[15rem] max-w-sm overflow-hidden rounded-2xl border border-dark-green/10 bg-warm-white">
      {fullName ? (
        <div className="border-b border-dark-green/10 bg-beige/50 px-3.5 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-dark-green/45">
            {labels.addressName}
          </p>
          <p className="mt-0.5 text-sm font-medium text-dark-green">{fullName}</p>
        </div>
      ) : null}

      <dl className="divide-y divide-dark-green/10 px-3.5 py-1">
        {detailRows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-3 py-2"
          >
            <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-dark-green/45">
              {row.label}
            </dt>
            <dd className="break-words text-sm leading-snug text-dark-green">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

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
            addressFields: user.addressFields ?? emptyAddressFields(),
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

  const handleDeleteUser = async (userId: string) => {
    if (deletingId) {
      return;
    }

    setDeletingId(userId);

    try {
      const response = await fetch(
        `/api/users?id=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? usersTable.deleteError);
      }

      setUsers((current) => current.filter((user) => user.id !== userId));
      if (editingUser?.id === userId) {
        setEditingUser(null);
      }
      toast.success(usersTable.userDeleted);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : usersTable.deleteError,
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveAddress = async (address: EditableAddressFields) => {
    if (!editingUser || isSavingAddress) {
      return;
    }

    setIsSavingAddress(true);

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          ...address,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        address?: string;
        addressFields?: EditableAddressFields;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? usersTable.updateError);
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                address: data.address?.trim() || usersTable.noAddress,
                addressFields: data.addressFields ?? address,
              }
            : user,
        ),
      );
      setEditingUser(null);
      toast.success(usersTable.addressUpdated);
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : usersTable.updateError,
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

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
                  <th className="px-4 py-3 font-semibold sm:px-6">
                    {usersTable.actions}
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
                    <td className="min-w-[18rem] px-4 py-4 align-top sm:px-6">
                      <AddressDisplay
                        address={user.addressFields}
                        labels={{
                          addressName: usersTable.addressName,
                          addressStreet: usersTable.addressStreet,
                          addressCity: usersTable.addressCity,
                          addressState: usersTable.addressState,
                          addressZip: usersTable.addressZip,
                          addressCountry: usersTable.addressCountry,
                          addressPhone: usersTable.addressPhone,
                        }}
                        emptyLabel={usersTable.noAddress}
                      />
                    </td>
                    <td className="px-4 py-4 align-top text-dark-green/80 sm:px-6">
                      {user.createdAt}
                    </td>
                    <td className="px-4 py-4 align-top sm:px-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dark-green/20 px-3 py-1.5 text-xs font-semibold text-dark-green transition-colors hover:bg-dark-green/5 sm:w-auto"
                          aria-label={`${usersTable.edit} ${user.name}`}
                        >
                          <LuPencil className="h-3.5 w-3.5" aria-hidden />
                          {usersTable.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(user.id)}
                          disabled={deletingId === user.id}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          aria-label={`${usersTable.delete} ${user.name}`}
                        >
                          <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
                          {usersTable.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditUserAddressModal
        isOpen={Boolean(editingUser)}
        userName={editingUser?.name ?? ""}
        initialValues={editingUser?.addressFields ?? emptyAddressFields()}
        isSaving={isSavingAddress}
        onClose={() => {
          if (!isSavingAddress) {
            setEditingUser(null);
          }
        }}
        onSubmit={handleSaveAddress}
      />
    </div>
  );
}
