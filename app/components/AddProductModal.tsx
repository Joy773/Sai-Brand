"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LuImagePlus, LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

export type ProductStatus = "in_stock" | "low_stock";

export type NewProductInput = {
  name: string;
  description: string;
  price: string;
  sizeMl: string;
  status: ProductStatus;
  images: string[];
  ingredients: string;
  keyBenefits: string;
  safetyNotes: string;
  howToUse: string;
};

type AddProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: NewProductInput) => void;
};

type FormState = NewProductInput;

const initialFormState: FormState = {
  name: "",
  description: "",
  price: "",
  sizeMl: "",
  status: "in_stock",
  images: [],
  ingredients: "",
  keyBenefits: "",
  safetyNotes: "",
  howToUse: "",
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

const textareaClassName = `${inputClassName} min-h-[88px] resize-y`;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AddProductModal({
  isOpen,
  onClose,
  onAdd,
}: AddProductModalProps) {
  const modal = useMessages().adminPanel.addProductModal;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialFormState);
      setIsSubmitting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_IMAGES - form.images.length;
    if (remainingSlots <= 0) {
      toast.error(modal.imageMaxCount.replace("{count}", String(MAX_IMAGES)));
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(modal.imageMaxCount.replace("{count}", String(MAX_IMAGES)));
    }

    const newImages: string[] = [];

    for (const file of filesToProcess) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(modal.imageInvalidType);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(modal.imageTooLarge);
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (dataUrl) {
          newImages.push(dataUrl);
        }
      } catch {
        toast.error(modal.imageReadError);
      }
    }

    if (newImages.length === 0) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    onAdd(form);
    toast.success(modal.successMessage);
    onClose();
    setIsSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-green/50 p-3 sm:p-4"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-product-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-dark-green/70 transition-colors hover:bg-beige/60 hover:text-dark-green"
          aria-label={modal.close}
        >
          <LuX className="h-5 w-5" aria-hidden />
        </button>

        <div className="pe-8">
          <h2
            id="add-product-modal-title"
            className="text-2xl font-bold text-dark-green sm:text-[1.75rem]"
          >
            {modal.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
            {modal.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.nameLabel}
            </span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={modal.namePlaceholder}
              className={inputClassName}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.descriptionLabel}
            </span>
            <textarea
              name="description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder={modal.descriptionPlaceholder}
              className={textareaClassName}
              required
            />
          </label>

          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.imageLabel}
            </span>
            <div className="rounded-xl border border-dashed border-beige bg-warm-white/60 p-4">
              {form.images.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {form.images.map((image, index) => (
                      <div
                        key={`${image.slice(0, 32)}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-beige bg-beige/30"
                      >
                        <Image
                          src={image}
                          alt={`${modal.imagePreviewAlt} ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute end-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-warm-white/95 text-dark-green/80 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`${modal.removeImage} ${index + 1}`}
                        >
                          <LuX className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                    {form.images.length < MAX_IMAGES ? (
                      <button
                        type="button"
                        onClick={handleChooseImage}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-beige bg-warm-white text-dark-green/70 transition-colors hover:border-gold hover:bg-beige/20 hover:text-dark-green"
                      >
                        <LuImagePlus className="h-6 w-6" aria-hidden />
                        <span className="px-1 text-center text-[10px] font-semibold leading-tight text-dark-green sm:text-xs">
                          {modal.addMoreImages}
                        </span>
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-dark-green/60">
                    {modal.imageCount
                      .replace("{current}", String(form.images.length))
                      .replace("{max}", String(MAX_IMAGES))}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleChooseImage}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-beige bg-warm-white px-4 py-8 text-dark-green/70 transition-colors hover:border-gold hover:bg-beige/20 hover:text-dark-green"
                >
                  <LuImagePlus className="h-8 w-8" aria-hidden />
                  <span className="text-sm font-semibold text-dark-green">
                    {modal.chooseImage}
                  </span>
                </button>
              )}
              <p className="mt-3 text-xs leading-relaxed text-dark-green/60">
                {modal.imageHint}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                {modal.priceLabel}
              </span>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder={modal.pricePlaceholder}
                className={inputClassName}
                min="0"
                step="0.01"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                {modal.sizeLabel}
              </span>
              <input
                type="number"
                name="sizeMl"
                value={form.sizeMl}
                onChange={(event) => updateField("sizeMl", event.target.value)}
                placeholder={modal.sizePlaceholder}
                className={inputClassName}
                min="1"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                {modal.statusLabel}
              </span>
              <select
                name="status"
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as ProductStatus)
                }
                className={inputClassName}
                required
              >
                <option value="in_stock">{modal.statusInStock}</option>
                <option value="low_stock">{modal.statusLowStock}</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.ingredientsLabel}
            </span>
            <textarea
              name="ingredients"
              value={form.ingredients}
              onChange={(event) =>
                updateField("ingredients", event.target.value)
              }
              placeholder={modal.ingredientsPlaceholder}
              className={textareaClassName}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.keyBenefitsLabel}
            </span>
            <textarea
              name="keyBenefits"
              value={form.keyBenefits}
              onChange={(event) =>
                updateField("keyBenefits", event.target.value)
              }
              placeholder={modal.keyBenefitsPlaceholder}
              className={textareaClassName}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.safetyNotesLabel}
            </span>
            <textarea
              name="safetyNotes"
              value={form.safetyNotes}
              onChange={(event) =>
                updateField("safetyNotes", event.target.value)
              }
              placeholder={modal.safetyNotesPlaceholder}
              className={textareaClassName}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.howToUseLabel}
            </span>
            <textarea
              name="howToUse"
              value={form.howToUse}
              onChange={(event) => updateField("howToUse", event.target.value)}
              placeholder={modal.howToUsePlaceholder}
              className={textareaClassName}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modal.submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
