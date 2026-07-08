"use client";

import emailjs from "@emailjs/browser";
import { FormEvent, useState } from "react";
import { LuCheck, LuMail, LuMapPin } from "react-icons/lu";
import { useMessages } from "@/app/i18n/LocaleProvider";

const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  inquiryType: string;
  message: string;
};

type FormStatus = "idle" | "success" | "error";

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  inquiryType: "",
  message: "",
};

export default function ContactForm() {
  const {
    title,
    subtitle,
    infoTitle,
    infoDescription,
    email,
    location,
    firstNameLabel,
    lastNameLabel,
    firstNamePlaceholder,
    lastNamePlaceholder,
    emailLabel,
    phoneLabel,
    emailPlaceholder,
    phonePlaceholder,
    inquiryLabel,
    inquiryOptions,
    messageLabel,
    messagePlaceholder,
    submitLabel,
    successMessage,
    errorMessage,
  } = useMessages().contactForm;

  const [form, setForm] = useState<FormState>({
    ...initialFormState,
    inquiryType: inquiryOptions[0]?.id ?? "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!form.firstName || !form.email || !form.message) {
      setStatus("error");
      setStatusMessage(errorMessage);
      return;
    }

    if (!emailPattern.test(form.email)) {
      setStatus("error");
      setStatusMessage(errorMessage);
      return;
    }

    if (!serviceId || !templateId || !publicKey) {
      setStatus("error");
      setStatusMessage(errorMessage);
      return;
    }

    const inquiryLabel =
      inquiryOptions.find((option) => option.id === form.inquiryType)?.label ??
      form.inquiryType;
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const submittedAt = new Date().toLocaleString();
    const messageBody = [
      form.message,
      "",
      `Phone: ${form.phone || "N/A"}`,
      `Inquiry: ${inquiryLabel}`,
    ].join("\n");

    try {
      setIsSubmitting(true);
      setStatus("idle");
      setStatusMessage(null);

      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: fullName || form.firstName,
          from_email: form.email,
          message: messageBody,
          name: fullName || form.firstName,
          time: submittedAt,
        },
        { publicKey },
      );

      setForm({
        ...initialFormState,
        inquiryType: inquiryOptions[0]?.id ?? "",
      });
      setStatus("success");
      setStatusMessage(successMessage);
    } catch {
      setStatus("error");
      setStatusMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="bg-warm-white px-6 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="text-3xl font-bold text-dark-green sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-dark-green/60 sm:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-dark-green/10 ring-1 ring-beige/60">
          <div className="grid lg:grid-cols-[minmax(0,340px)_1fr]">
            <aside className="relative overflow-hidden bg-dark-green px-8 py-10 text-warm-white sm:px-10 sm:py-12">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold sm:text-[1.7rem]">
                  {infoTitle}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-warm-white/75 sm:text-base">
                  {infoDescription}
                </p>

                <ul className="mt-10 space-y-6 text-sm sm:mt-12 sm:text-base">
                  <li className="flex items-center gap-4">
                    <LuMail className="h-5 w-5 shrink-0" aria-hidden />
                    <a
                      href={`mailto:${email}`}
                      className="transition-colors hover:text-gold"
                    >
                      {email}
                    </a>
                  </li>
                  <li className="flex items-start gap-4">
                    <LuMapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <span>{location}</span>
                  </li>
                </ul>
              </div>

              <div
                className="pointer-events-none absolute -bottom-16 -end-10 h-44 w-44 rounded-full bg-gold/35"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-6 end-16 h-28 w-28 rounded-full bg-beige/40"
                aria-hidden
              />
            </aside>

            <form
              onSubmit={handleSubmit}
              className="bg-warm-white/40 px-6 py-8 sm:px-10 sm:py-12 lg:px-12"
            >
              {status !== "idle" && statusMessage ? (
                <div
                  role={status === "error" ? "alert" : "status"}
                  className={`mb-8 rounded-2xl border px-4 py-3 text-sm sm:text-[15px] ${
                    status === "success"
                      ? "border-dark-green/20 bg-dark-green/5 text-dark-green"
                      : "border-[#b45309]/20 bg-[#fef3c7] text-[#78350f]"
                  }`}
                >
                  {statusMessage}
                </div>
              ) : null}

              <div className="grid gap-8 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-green/70">
                    {firstNameLabel}
                  </span>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    placeholder={firstNamePlaceholder}
                    className="w-full border-0 border-b border-beige bg-transparent pb-2 text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-green/70">
                    {lastNameLabel}
                  </span>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    placeholder={lastNamePlaceholder}
                    className="w-full border-0 border-b border-beige bg-transparent pb-2 text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-green/70">
                    {emailLabel}
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder={emailPlaceholder}
                    className="w-full border-0 border-b border-beige bg-transparent pb-2 text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-dark-green/70">
                    {phoneLabel}
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder={phonePlaceholder}
                    className="w-full border-0 border-b border-beige bg-transparent pb-2 text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold"
                  />
                </label>
              </div>

              <fieldset className="mt-10">
                <legend className="text-sm font-semibold text-dark-green sm:text-base">
                  {inquiryLabel}
                </legend>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                  {inquiryOptions.map((option) => {
                    const isSelected = form.inquiryType === option.id;

                    return (
                      <label
                        key={option.id}
                        className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-dark-green/80 sm:text-[15px]"
                      >
                        <input
                          type="radio"
                          name="inquiryType"
                          value={option.id}
                          checked={isSelected}
                          onChange={() =>
                            updateField("inquiryType", option.id)
                          }
                          className="sr-only"
                        />
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? "border-dark-green bg-dark-green text-warm-white"
                              : "border-dark-green/30 bg-transparent"
                          }`}
                          aria-hidden
                        >
                          {isSelected ? (
                            <LuCheck className="h-3 w-3" strokeWidth={3} />
                          ) : null}
                        </span>
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mt-10 block">
                <span className="mb-2 block text-sm font-medium text-dark-green/70">
                  {messageLabel}
                </span>
                <textarea
                  name="message"
                  rows={3}
                  value={form.message}
                  onChange={(event) =>
                    updateField("message", event.target.value)
                  }
                  placeholder={messagePlaceholder}
                  className="w-full resize-none border-0 border-b border-beige bg-transparent pb-2 text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold"
                  required
                />
              </label>

              <div className="mt-10 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl px-8 py-3.5 text-sm font-semibold text-warm-white transition-colors sm:text-base ${
                    isSubmitting
                      ? "cursor-not-allowed bg-dark-green/60"
                      : "bg-dark-green hover:bg-dark-green/90"
                  }`}
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
