"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AddressFields = {
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
};

type ProfileForm = {
  name: string;
  email: string;
  streetAddress: string;
  city: string;
  stateProvince: string;
  zipPostalCode: string;
  country: string;
  phoneNumber: string;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  address: string;
  addressFields: AddressFields;
  createdAt: string;
};

type UsersApiResponse = {
  ok: boolean;
  users?: UserRecord[];
  error?: string;
};

const emptyAddressFields = (): AddressFields => ({
  firstName: "",
  lastName: "",
  streetAddress: "",
  country: "",
  stateProvince: "",
  city: "",
  zipPostalCode: "",
  phoneNumber: "",
});

const ADDRESS_LABELS = [
  { key: "streetAddress", label: "Street Address" },
  { key: "city", label: "City" },
  { key: "stateProvince", label: "State / Province" },
  { key: "zipPostalCode", label: "Zip/Postal Code" },
  { key: "country", label: "Country" },
  { key: "phoneNumber", label: "Phone" },
] as const;

function hasAddressFields(address: AddressFields) {
  return ADDRESS_LABELS.some(({ key }) => address[key].trim());
}

function toProfileForm(user: UserRecord): ProfileForm {
  const address = user.addressFields ?? emptyAddressFields();
  return {
    name: user.name,
    email: user.email,
    streetAddress: address.streetAddress,
    city: address.city,
    stateProvince: address.stateProvince,
    zipPostalCode: address.zipPostalCode,
    country: address.country,
    phoneNumber: address.phoneNumber,
  };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function ProfileField({
  label,
  value,
  isEditing,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
  type?: "text" | "email" | "tel";
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-dark-green/50">
        {label}
      </dt>
      <dd className="break-words text-sm text-dark-green">
        {isEditing ? (
          <input
            type={type}
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange?.(event.target.value)
            }
            className="w-full rounded-xl border border-dark-green/15 bg-warm-white px-3 py-2 text-sm text-dark-green outline-none transition-colors focus:border-dark-green/40"
          />
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

export default function ProfileInformation() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      setIsLoading(false);
      setUser(null);
      setForm(null);
      setIsEditing(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/users");
        const data = (await response.json()) as UsersApiResponse;

        if (!response.ok || !data.ok || !data.users) {
          throw new Error(data.error ?? "Failed to load profile.");
        }

        const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? "";
        const matchedUser =
          data.users.find(
            (entry) => entry.email.trim().toLowerCase() === sessionEmail,
          ) ?? null;

        if (!cancelled) {
          setUser(matchedUser);
          setForm(matchedUser ? toProfileForm(matchedUser) : null);
          setIsEditing(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.email]);

  const baseline = useMemo(
    () => (user ? toProfileForm(user) : null),
    [user],
  );

  const isDirty = Boolean(
    form &&
      baseline &&
      (form.name !== baseline.name ||
        form.email !== baseline.email ||
        form.streetAddress !== baseline.streetAddress ||
        form.city !== baseline.city ||
        form.stateProvince !== baseline.stateProvince ||
        form.zipPostalCode !== baseline.zipPostalCode ||
        form.country !== baseline.country ||
        form.phoneNumber !== baseline.phoneNumber),
  );

  const updateField =
    (field: keyof ProfileForm) => (value: string) => {
      setForm((current) => (current ? { ...current, [field]: value } : current));
    };

  const handleHeaderAction = async () => {
    if (!user || !form || isSaving) {
      return;
    }

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (!isDirty) {
      return;
    }

    setIsSaving(true);

    try {
      const existingAddress = user.addressFields ?? emptyAddressFields();
      const nameParts = splitName(form.name);
      const firstName = nameParts.firstName || existingAddress.firstName.trim();
      const lastName = nameParts.lastName || existingAddress.lastName.trim();

      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: form.name.trim(),
          email: form.email.trim(),
          firstName,
          lastName,
          streetAddress: form.streetAddress.trim(),
          city: form.city.trim(),
          stateProvince: form.stateProvince.trim(),
          zipPostalCode: form.zipPostalCode.trim(),
          country: form.country.trim(),
          phoneNumber: form.phoneNumber.trim(),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        name?: string;
        email?: string;
        address?: AddressFields | string;
        addressFields?: AddressFields;
        emailChanged?: boolean;
        verificationEmailSent?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save changes.");
      }

      const savedAddress = data.addressFields;
      if (!savedAddress) {
        throw new Error(data.error ?? "Failed to save changes.");
      }

      const nextAddress = {
        ...emptyAddressFields(),
        ...savedAddress,
      };

      const nextUser: UserRecord = {
        ...user,
        name: data.name?.trim() || form.name.trim() || user.name,
        email: data.email?.trim() || form.email.trim() || user.email,
        addressFields: nextAddress,
      };

      setUser(nextUser);
      setForm(toProfileForm(nextUser));
      setIsEditing(false);

      if (data.emailChanged && data.verificationEmailSent) {
        toast.success(
          "Changes saved. Please verify your new email — we sent a link to your inbox.",
        );
      } else if (data.emailChanged && !data.verificationEmailSent) {
        toast.error(
          data.error ??
            "Profile updated, but we could not send the verification email.",
        );
      } else {
        toast.success("Changes saved.");
      }
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addressFields = user?.addressFields;
  const addressRows = ADDRESS_LABELS.map(({ key, label }) => ({
    key,
    label,
    value: form?.[key] ?? addressFields?.[key] ?? "",
  }));
  const visibleAddressRows = isEditing
    ? addressRows
    : addressRows.filter((row) => row.value.trim());

  return (
    <section className="overflow-hidden rounded-3xl border border-beige bg-warm-white/70 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-beige px-6 py-5 sm:px-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-green sm:text-3xl">
            Profile Settings
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70 sm:text-base">
            Your account details
          </p>
        </div>
        {status === "authenticated" && user && form ? (
          <button
            type="button"
            onClick={() => void handleHeaderAction()}
            disabled={isSaving}
            className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isDirty
                ? "bg-dark-green text-warm-white hover:bg-dark-green/90"
                : "border border-dark-green/20 text-dark-green hover:bg-dark-green/5"
            }`}
          >
            {isSaving
              ? "Saving…"
              : isDirty
                ? "Save Changes"
                : "Edit"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 sm:gap-8 sm:px-8 sm:py-8">
        {status === "loading" || isLoading ? (
          <p className="text-sm text-dark-green/70">Loading profile…</p>
        ) : status !== "authenticated" ? (
          <div className="rounded-2xl border border-beige bg-beige/20 px-5 py-8">
            <p className="text-sm text-dark-green/80">
              Please sign in to view your profile settings.
            </p>
            <Link
              href="/?signin=true"
              className="mt-4 inline-flex rounded-full bg-dark-green px-4 py-2 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90"
            >
              Sign In
            </Link>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !user || !form ? (
          <p className="text-sm text-dark-green/70">No profile found.</p>
        ) : (
          <>
            <dl className="flex flex-col gap-5 sm:gap-6">
              <ProfileField
                label="Name"
                value={form.name}
                isEditing={isEditing}
                onChange={updateField("name")}
              />
              <ProfileField
                label="Email"
                value={form.email}
                isEditing={isEditing}
                onChange={updateField("email")}
                type="email"
              />
            </dl>

            {isEditing ||
            (addressFields && hasAddressFields(addressFields)) ? (
              <div className="min-w-[15rem] max-w-sm overflow-hidden rounded-2xl border border-dark-green/10 bg-warm-white">
                <dl className="divide-y divide-dark-green/10 px-3.5 py-1">
                  {visibleAddressRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 py-2"
                    >
                      <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-dark-green/45">
                        {row.label}
                      </dt>
                      <dd className="break-words text-sm leading-snug text-dark-green">
                        {isEditing ? (
                          <input
                            type={row.key === "phoneNumber" ? "tel" : "text"}
                            value={form[row.key]}
                            onChange={(event) =>
                              updateField(row.key)(event.target.value)
                            }
                            className="w-full rounded-lg border border-dark-green/15 bg-warm-white px-2.5 py-1.5 text-sm text-dark-green outline-none transition-colors focus:border-dark-green/40"
                          />
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-dark-green/15 px-3 py-2 text-sm text-dark-green/50">
                No address saved yet.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
