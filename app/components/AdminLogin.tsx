"use client";

import Image from "next/image";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

type FormState = {
  email: string;
  password: string;
};

const initialFormState: FormState = {
  email: "",
  password: "",
};

const inputClassName =
  "w-full rounded-xl border border-beige bg-warm-white px-4 py-2.5 text-sm text-dark-green outline-none transition-colors placeholder:text-dark-green/35 focus:border-gold";

export default function AdminLogin() {
  const {
    title,
    subtitle,
    emailLabel,
    emailPlaceholder,
    passwordLabel,
    passwordPlaceholder,
    submitLabel,
    successMessage,
    errorMessage,
    notAdminError,
  } = useMessages().adminLogin;

  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error(errorMessage);
        return;
      }

      const session = await getSession();

      if (session?.user?.role !== "admin") {
        const { signOut } = await import("next-auth/react");
        await signOut({ redirect: false });
        toast.error(notAdminError);
        return;
      }

      toast.success(successMessage);
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3E8DF] px-6 py-12">
      <div className="mb-8">
        <Image
          src="/German_Care_Logo_Print-page.png"
          alt="German Care"
          width={900}
          height={165}
          className="h-12 w-auto object-contain sm:h-14"
          unoptimized
          priority
        />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-beige bg-warm-white p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-green sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-dark-green/70">
            {subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                  {emailLabel}
                </span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder={emailPlaceholder}
                  className={inputClassName}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-green/70">
                  {passwordLabel}
                </span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  placeholder={passwordPlaceholder}
                  className={inputClassName}
                  autoComplete="current-password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-full bg-dark-green px-5 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-dark-green/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLabel}
              </button>
          </form>
      </div>
    </div>
  );
}
