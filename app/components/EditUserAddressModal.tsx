"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { LuX } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

export type EditableAddressFields = {
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
};

type EditUserAddressModalProps = {
  isOpen: boolean;
  userName: string;
  initialValues: EditableAddressFields;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (address: EditableAddressFields) => void | Promise<void>;
};

const emptyAddress = (): EditableAddressFields => ({
  firstName: "",
  lastName: "",
  streetAddress: "",
  country: "",
  stateProvince: "",
  city: "",
  zipPostalCode: "",
  phoneNumber: "",
});

export default function EditUserAddressModal({
  isOpen,
  userName,
  initialValues,
  isSaving,
  onClose,
  onSubmit,
}: EditUserAddressModalProps) {
  const { editAddressModal } = useMessages().adminPanel;
  const [form, setForm] = useState<EditableAddressFields>(emptyAddress);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm({
      firstName: initialValues.firstName ?? "",
      lastName: initialValues.lastName ?? "",
      streetAddress: initialValues.streetAddress ?? "",
      country: initialValues.country ?? "",
      stateProvince: initialValues.stateProvince ?? "",
      city: initialValues.city ?? "",
      zipPostalCode: initialValues.zipPostalCode ?? "",
      phoneNumber: initialValues.phoneNumber ?? "",
    });
  }, [isOpen, initialValues]);

  if (!isOpen) {
    return null;
  }

  const updateField =
    (field: keyof EditableAddressFields) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      streetAddress: form.streetAddress.trim(),
      country: form.country.trim(),
      stateProvince: form.stateProvince.trim(),
      city: form.city.trim(),
      zipPostalCode: form.zipPostalCode.trim(),
      phoneNumber: form.phoneNumber.trim(),
    });
  };

  const inputClassName =
    "mt-1 w-full rounded-xl border border-dark-green/15 bg-warm-white px-3 py-2 text-sm text-dark-green outline-none transition-colors focus:border-dark-green/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-dark-green/40"
        aria-label={editAddressModal.close}
        onClick={onClose}
        disabled={isSaving}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-address-title"
        className="relative z-10 w-full max-w-lg rounded-3xl border border-beige bg-[#F3E8DF] p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="edit-user-address-title"
              className="text-xl font-bold text-dark-green"
            >
              {editAddressModal.title}
            </h2>
            <p className="mt-1 text-sm text-dark-green/70">
              {editAddressModal.subtitle.replace("{name}", userName)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-dark-green transition-colors hover:bg-dark-green/5 disabled:opacity-60"
            aria-label={editAddressModal.close}
          >
            <LuX className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-dark-green">
              {editAddressModal.firstName}
              <input
                type="text"
                value={form.firstName}
                onChange={updateField("firstName")}
                className={inputClassName}
                autoComplete="given-name"
              />
            </label>
            <label className="block text-sm font-medium text-dark-green">
              {editAddressModal.lastName}
              <input
                type="text"
                value={form.lastName}
                onChange={updateField("lastName")}
                className={inputClassName}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-dark-green">
            {editAddressModal.streetAddress}
            <input
              type="text"
              value={form.streetAddress}
              onChange={updateField("streetAddress")}
              className={inputClassName}
              required
              autoComplete="street-address"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-dark-green">
              {editAddressModal.city}
              <input
                type="text"
                value={form.city}
                onChange={updateField("city")}
                className={inputClassName}
                required
                autoComplete="address-level2"
              />
            </label>
            <label className="block text-sm font-medium text-dark-green">
              {editAddressModal.zipPostalCode}
              <input
                type="text"
                value={form.zipPostalCode}
                onChange={updateField("zipPostalCode")}
                className={inputClassName}
                required
                autoComplete="postal-code"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-dark-green">
              {editAddressModal.stateProvince}
              <input
                type="text"
                value={form.stateProvince}
                onChange={updateField("stateProvince")}
                className={inputClassName}
                autoComplete="address-level1"
              />
            </label>
            <label className="block text-sm font-medium text-dark-green">
              {editAddressModal.country}
              <input
                type="text"
                value={form.country}
                onChange={updateField("country")}
                className={inputClassName}
                required
                autoComplete="country-name"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-dark-green">
            {editAddressModal.phoneNumber}
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={updateField("phoneNumber")}
              className={inputClassName}
              required
              autoComplete="tel"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-dark-green/20 px-4 py-2 text-sm font-semibold text-dark-green transition-colors hover:bg-dark-green/5 disabled:opacity-60"
            >
              {editAddressModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-dark-green px-4 py-2 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? editAddressModal.saving : editAddressModal.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
