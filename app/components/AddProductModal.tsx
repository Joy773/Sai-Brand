"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LuImagePlus, LuVideo, LuX } from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

export type ProductStatus = "in_stock" | "low_stock";

export type ProductType = "single" | "kit";

export type ProductLocaleKey = "en" | "de" | "ar";

export type ProductLocaleContent = {
  name: string;
  description: string;
  ingredients: string;
  keyBenefits: string;
  safetyNotes: string;
  howToUse: string;
};

export type NewProductInput = {
  productType: ProductType;
  en: ProductLocaleContent;
  de: ProductLocaleContent;
  ar: ProductLocaleContent;
  price: string;
  sizeMl: string;
  kitSize: string;
  status: ProductStatus;
  images: string[];
  videos: string[];
};

type AddProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: NewProductInput) => void | Promise<void>;
  initialValues?: NewProductInput | null;
  mode?: "create" | "edit";
};

type FormState = NewProductInput;

const emptyLocaleContent = (): ProductLocaleContent => ({
  name: "",
  description: "",
  ingredients: "",
  keyBenefits: "",
  safetyNotes: "",
  howToUse: "",
});

const initialFormState: FormState = {
  productType: "single",
  en: emptyLocaleContent(),
  de: emptyLocaleContent(),
  ar: emptyLocaleContent(),
  price: "",
  sizeMl: "",
  kitSize: "",
  status: "in_stock",
  images: [],
  videos: [],
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_IMAGES = 10;
const MAX_VIDEOS = 5;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

type LocaleFieldKey =
  | "name"
  | "description"
  | "ingredients"
  | "keyBenefits"
  | "safetyNotes"
  | "howToUse";

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white/60 px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

const textareaClassName = `${inputClassName} min-h-[88px] resize-y`;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function readUploadResponse(response: Response): Promise<{
  ok?: boolean;
  url?: string;
  error?: string;
}> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
    } catch {
      throw new Error("Upload failed: server returned invalid JSON.");
    }
  }

  // Platform / Next.js error pages often come back as HTML (413, 500, etc.).
  if (raw.trimStart().startsWith("<") || contentType.includes("text/html")) {
    if (response.status === 413) {
      throw new Error(
        "Image is too large for upload. Please use a file under 4MB.",
      );
    }

    throw new Error(
      `Upload failed (HTTP ${response.status}). The server returned an error page instead of JSON. Check Cloudinary env vars and try a smaller image.`,
    );
  }

  try {
    return JSON.parse(raw) as {
      ok?: boolean;
      url?: string;
      error?: string;
    };
  } catch {
    throw new Error(
      `Upload failed (HTTP ${response.status}). Unexpected server response.`,
    );
  }
}

async function uploadImageFile(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large. Please use a file under 4MB.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = await readUploadResponse(response);

    if (!response.ok || !data.ok || !data.url) {
      throw new Error(data.error ?? "Failed to upload image.");
    }

    return data.url;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Image upload timed out. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function uploadVideoFile(file: File): Promise<string> {
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error("Video is too large. Please use a file under 100MB.");
  }

  const signResponse = await fetch("/api/upload/sign", { method: "POST" });
  const signData = (await signResponse.json()) as {
    ok?: boolean;
    error?: string;
    cloudName?: string;
    apiKey?: string;
    timestamp?: number;
    folder?: string;
    signature?: string;
    uploadUrl?: string;
  };

  if (
    !signResponse.ok ||
    !signData.ok ||
    !signData.uploadUrl ||
    !signData.apiKey ||
    !signData.timestamp ||
    !signData.folder ||
    !signData.signature
  ) {
    throw new Error(signData.error ?? "Failed to prepare video upload.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signData.apiKey);
  formData.append("timestamp", String(signData.timestamp));
  formData.append("folder", signData.folder);
  formData.append("signature", signData.signature);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 300_000);

  try {
    const response = await fetch(signData.uploadUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = (await response.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };

    if (!response.ok || !data.secure_url) {
      throw new Error(
        data.error?.message ?? "Failed to upload video to Cloudinary.",
      );
    }

    return data.secure_url;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Video upload timed out. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

type LocaleSectionProps = {
  locale: ProductLocaleKey;
  title: string;
  content: ProductLocaleContent;
  labels: Record<`${LocaleFieldKey}Label`, string> &
    Record<`${LocaleFieldKey}Placeholder`, string>;
  onChange: (field: LocaleFieldKey, value: string) => void;
  dir?: "ltr" | "rtl";
};

function LocaleProductSection({
  locale,
  title,
  content,
  labels,
  onChange,
  dir = "ltr",
}: LocaleSectionProps) {
  return (
    <section
      dir={dir}
      className="space-y-4 rounded-2xl border border-beige bg-beige/20 p-4 sm:p-5"
      aria-labelledby={`add-product-${locale}-section`}
    >
      <h3
        id={`add-product-${locale}-section`}
        className="text-sm font-semibold uppercase tracking-[0.12em] text-dark-green"
      >
        {title}
      </h3>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
          {labels.nameLabel}
        </span>
        <input
          type="text"
          name={`${locale}-name`}
          value={content.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder={labels.namePlaceholder}
          className={inputClassName}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
          {labels.descriptionLabel}
        </span>
        <textarea
          name={`${locale}-description`}
          value={content.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder={labels.descriptionPlaceholder}
          className={textareaClassName}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
          {labels.ingredientsLabel}
        </span>
        <textarea
          name={`${locale}-ingredients`}
          value={content.ingredients}
          onChange={(event) => onChange("ingredients", event.target.value)}
          placeholder={labels.ingredientsPlaceholder}
          className={textareaClassName}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
          {labels.keyBenefitsLabel}
        </span>
        <textarea
          name={`${locale}-keyBenefits`}
          value={content.keyBenefits}
          onChange={(event) => onChange("keyBenefits", event.target.value)}
          placeholder={labels.keyBenefitsPlaceholder}
          className={textareaClassName}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
          {labels.safetyNotesLabel}
        </span>
        <textarea
          name={`${locale}-safetyNotes`}
          value={content.safetyNotes}
          onChange={(event) => onChange("safetyNotes", event.target.value)}
          placeholder={labels.safetyNotesPlaceholder}
          className={textareaClassName}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
          {labels.howToUseLabel}
        </span>
        <textarea
          name={`${locale}-howToUse`}
          value={content.howToUse}
          onChange={(event) => onChange("howToUse", event.target.value)}
          placeholder={labels.howToUsePlaceholder}
          className={textareaClassName}
          required
        />
      </label>
    </section>
  );
}

export default function AddProductModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues = null,
  mode = "create",
}: AddProductModalProps) {
  const modal = useMessages().adminPanel.addProductModal;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadRequestIdRef = useRef(0);
  const videoUploadRequestIdRef = useRef(0);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const isEditMode = mode === "edit";

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
      uploadRequestIdRef.current += 1;
      videoUploadRequestIdRef.current += 1;
      setForm(initialFormState);
      setIsSubmitting(false);
      setIsUploadingImages(false);
      setIsUploadingVideos(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
      return;
    }

    setForm(
      initialValues
        ? {
            ...initialValues,
            videos: initialValues.videos ?? [],
          }
        : initialFormState,
    );
    setIsSubmitting(false);
    setIsUploadingImages(false);
    setIsUploadingVideos(false);
  }, [isOpen, initialValues]);

  if (!isOpen) {
    return null;
  }

  const updateField = (
    field: Exclude<keyof FormState, ProductLocaleKey>,
    value: string | ProductStatus | ProductType | string[],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductTypeChange = (productType: ProductType) => {
    setForm((prev) => ({
      ...prev,
      productType,
      sizeMl: productType === "single" ? prev.sizeMl : "",
      kitSize: productType === "kit" ? prev.kitSize : "",
    }));
  };

  const updateLocaleField = (
    locale: ProductLocaleKey,
    field: LocaleFieldKey,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || isUploadingImages) {
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

    const validFiles: File[] = [];

    for (const file of filesToProcess) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(modal.imageInvalidType);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(modal.imageTooLarge);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    const requestId = ++uploadRequestIdRef.current;
    setIsUploadingImages(true);

    const newImages: string[] = [];

    try {
      for (const file of validFiles) {
        if (uploadRequestIdRef.current !== requestId) {
          return;
        }

        try {
          const imageUrl = await uploadImageFile(file);
          newImages.push(imageUrl);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : modal.imageUploadError,
          );
        }
      }

      if (uploadRequestIdRef.current !== requestId) {
        return;
      }

      if (newImages.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));
      }
    } finally {
      if (uploadRequestIdRef.current === requestId) {
        setIsUploadingImages(false);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleChooseVideo = () => {
    videoInputRef.current?.click();
  };

  const handleVideoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || isUploadingVideos) {
      return;
    }

    const remainingSlots = MAX_VIDEOS - form.videos.length;
    if (remainingSlots <= 0) {
      toast.error(modal.videoMaxCount.replace("{count}", String(MAX_VIDEOS)));
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(modal.videoMaxCount.replace("{count}", String(MAX_VIDEOS)));
    }

    const validFiles: File[] = [];

    for (const file of filesToProcess) {
      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        toast.error(modal.videoInvalidType);
        continue;
      }

      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        toast.error(modal.videoTooLarge);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    const requestId = ++videoUploadRequestIdRef.current;
    setIsUploadingVideos(true);

    const newVideos: string[] = [];

    try {
      for (const file of validFiles) {
        if (videoUploadRequestIdRef.current !== requestId) {
          return;
        }

        try {
          const videoUrl = await uploadVideoFile(file);
          newVideos.push(videoUrl);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : modal.videoUploadError,
          );
        }
      }

      if (videoUploadRequestIdRef.current !== requestId) {
        return;
      }

      if (newVideos.length > 0) {
        setForm((prev) => ({
          ...prev,
          videos: [...prev.videos, ...newVideos],
        }));
      }
    } finally {
      if (videoUploadRequestIdRef.current === requestId) {
        setIsUploadingVideos(false);
      }
    }
  };

  const handleRemoveVideo = (index: number) => {
    setForm((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, videoIndex) => videoIndex !== index),
    }));
  };

  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(form);
      toast.success(
        isEditMode ? modal.updateSuccessMessage : modal.successMessage,
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
            ? modal.updateError
            : modal.saveError,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const englishLabels = {
    nameLabel: modal.nameLabel,
    namePlaceholder: modal.namePlaceholder,
    descriptionLabel: modal.descriptionLabel,
    descriptionPlaceholder: modal.descriptionPlaceholder,
    ingredientsLabel: modal.ingredientsLabel,
    ingredientsPlaceholder: modal.ingredientsPlaceholder,
    keyBenefitsLabel: modal.keyBenefitsLabel,
    keyBenefitsPlaceholder: modal.keyBenefitsPlaceholder,
    safetyNotesLabel: modal.safetyNotesLabel,
    safetyNotesPlaceholder: modal.safetyNotesPlaceholder,
    howToUseLabel: modal.howToUseLabel,
    howToUsePlaceholder: modal.howToUsePlaceholder,
  };

  const germanLabels = {
    nameLabel: modal.nameLabelDe,
    namePlaceholder: modal.namePlaceholderDe,
    descriptionLabel: modal.descriptionLabelDe,
    descriptionPlaceholder: modal.descriptionPlaceholderDe,
    ingredientsLabel: modal.ingredientsLabelDe,
    ingredientsPlaceholder: modal.ingredientsPlaceholderDe,
    keyBenefitsLabel: modal.keyBenefitsLabelDe,
    keyBenefitsPlaceholder: modal.keyBenefitsPlaceholderDe,
    safetyNotesLabel: modal.safetyNotesLabelDe,
    safetyNotesPlaceholder: modal.safetyNotesPlaceholderDe,
    howToUseLabel: modal.howToUseLabelDe,
    howToUsePlaceholder: modal.howToUsePlaceholderDe,
  };

  const arabicLabels = {
    nameLabel: modal.nameLabelAr,
    namePlaceholder: modal.namePlaceholderAr,
    descriptionLabel: modal.descriptionLabelAr,
    descriptionPlaceholder: modal.descriptionPlaceholderAr,
    ingredientsLabel: modal.ingredientsLabelAr,
    ingredientsPlaceholder: modal.ingredientsPlaceholderAr,
    keyBenefitsLabel: modal.keyBenefitsLabelAr,
    keyBenefitsPlaceholder: modal.keyBenefitsPlaceholderAr,
    safetyNotesLabel: modal.safetyNotesLabelAr,
    safetyNotesPlaceholder: modal.safetyNotesPlaceholderAr,
    howToUseLabel: modal.howToUseLabelAr,
    howToUsePlaceholder: modal.howToUsePlaceholderAr,
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
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8"
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
            {isEditMode ? modal.editTitle : modal.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
            {isEditMode ? modal.editSubtitle : modal.subtitle}
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.productTypeLabel}
            </span>
            <select
              name="productType"
              value={form.productType}
              onChange={(event) =>
                handleProductTypeChange(event.target.value as ProductType)
              }
              className={inputClassName}
              required
            >
              <option value="single">{modal.productTypeSingle}</option>
              <option value="kit">{modal.productTypeKit}</option>
            </select>
          </div>

          <LocaleProductSection
            locale="en"
            title={modal.englishSection}
            content={form.en}
            labels={englishLabels}
            onChange={(field, value) => updateLocaleField("en", field, value)}
          />

          <LocaleProductSection
            locale="de"
            title={modal.germanSection}
            content={form.de}
            labels={germanLabels}
            onChange={(field, value) => updateLocaleField("de", field, value)}
          />

          <LocaleProductSection
            locale="ar"
            title={modal.arabicSection}
            content={form.ar}
            labels={arabicLabels}
            onChange={(field, value) => updateLocaleField("ar", field, value)}
            dir="rtl"
          />

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
                        disabled={isUploadingImages}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-beige bg-warm-white text-dark-green/70 transition-colors hover:border-gold hover:bg-beige/20 hover:text-dark-green disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LuImagePlus className="h-6 w-6" aria-hidden />
                        <span className="px-1 text-center text-[10px] font-semibold leading-tight text-dark-green sm:text-xs">
                          {isUploadingImages
                            ? modal.imageUploading
                            : modal.addMoreImages}
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
                  disabled={isUploadingImages}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-beige bg-warm-white px-4 py-8 text-dark-green/70 transition-colors hover:border-gold hover:bg-beige/20 hover:text-dark-green disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuImagePlus className="h-8 w-8" aria-hidden />
                  <span className="text-sm font-semibold text-dark-green">
                    {isUploadingImages
                      ? modal.imageUploading
                      : modal.chooseImage}
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
                onChange={(event) => void handleImageChange(event)}
                disabled={isUploadingImages}
                className="hidden"
              />
            </div>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
              {modal.videoLabel}
            </span>
            <div className="rounded-xl border border-dashed border-beige bg-warm-white/60 p-4">
              {form.videos.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {form.videos.map((video, index) => (
                      <div
                        key={`${video.slice(0, 32)}-${index}`}
                        className="group relative aspect-video overflow-hidden rounded-xl border border-beige bg-beige/30"
                      >
                        <video
                          src={video}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(index)}
                          className="absolute end-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-warm-white/95 text-dark-green/80 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`${modal.removeVideo} ${index + 1}`}
                        >
                          <LuX className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                    {form.videos.length < MAX_VIDEOS ? (
                      <button
                        type="button"
                        onClick={handleChooseVideo}
                        disabled={isUploadingVideos}
                        className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border border-beige bg-warm-white text-dark-green/70 transition-colors hover:border-gold hover:bg-beige/20 hover:text-dark-green disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LuVideo className="h-6 w-6" aria-hidden />
                        <span className="px-1 text-center text-[10px] font-semibold leading-tight text-dark-green sm:text-xs">
                          {isUploadingVideos
                            ? modal.videoUploading
                            : modal.addMoreVideos}
                        </span>
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-dark-green/60">
                    {modal.videoCount
                      .replace("{current}", String(form.videos.length))
                      .replace("{max}", String(MAX_VIDEOS))}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleChooseVideo}
                  disabled={isUploadingVideos}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-beige bg-warm-white px-4 py-8 text-dark-green/70 transition-colors hover:border-gold hover:bg-beige/20 hover:text-dark-green disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuVideo className="h-8 w-8" aria-hidden />
                  <span className="text-sm font-semibold text-dark-green">
                    {isUploadingVideos
                      ? modal.videoUploading
                      : modal.chooseVideo}
                  </span>
                </button>
              )}
              <p className="mt-3 text-xs leading-relaxed text-dark-green/60">
                {modal.videoHint}
              </p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                multiple
                onChange={(event) => void handleVideoChange(event)}
                disabled={isUploadingVideos}
                className="hidden"
              />
            </div>
          </div>

          <div
            className={`grid gap-4 ${form.productType === "single" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
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

            {form.productType === "single" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                  {modal.sizeLabel}
                </span>
                <input
                  type="number"
                  name="sizeMl"
                  value={form.sizeMl}
                  onChange={(event) =>
                    updateField("sizeMl", event.target.value)
                  }
                  placeholder={modal.sizePlaceholder}
                  className={inputClassName}
                  min="1"
                  required
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                  {modal.kitSizeLabel}
                </span>
                <input
                  type="text"
                  name="kitSize"
                  value={form.kitSize}
                  onChange={(event) =>
                    updateField("kitSize", event.target.value)
                  }
                  placeholder={modal.kitSizePlaceholder}
                  className={inputClassName}
                  required
                />
              </label>
            )}

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

          <button
            type="submit"
            disabled={isSubmitting || isUploadingImages || isUploadingVideos}
            className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEditMode ? modal.updateLabel : modal.submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
