"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LuLayoutDashboard,
  LuLogOut,
  LuPackage,
  LuShoppingBag,
  LuTruck,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { toast } from "sonner";
import { useMessages } from "@/app/i18n/LocaleProvider";

const navIcons = {
  dashboard: LuLayoutDashboard,
  products: LuPackage,
  orders: LuShoppingBag,
  users: LuUsers,
  shipping: LuTruck,
} as const;

type SidebarProps = {
  onNavigate?: () => void;
  onClose?: () => void;
};

export default function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const { brandLabel, navLinks, logout, logoutSuccess, closeMenu } =
    useMessages().adminSidebar;
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast.success(logoutSuccess);
    onNavigate?.();
    router.replace("/admin");
    router.refresh();
  };

  return (
    <aside className="flex h-dvh w-full flex-col border-e border-dark-green/10 bg-dark-green text-warm-white lg:h-screen lg:w-64 lg:shrink-0">
      <div className="relative border-b border-warm-white/10 px-5 py-6">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-warm-white/80 transition-colors hover:bg-warm-white/10 hover:text-warm-white lg:hidden"
            aria-label={closeMenu}
          >
            <LuX className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        <Image
          src="/German_Care_Logo_Print-page.png"
          alt="German Care"
          width={900}
          height={165}
          className="h-9 w-auto object-contain brightness-0 invert"
          unoptimized
          priority
        />
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-warm-white/60">
          {brandLabel}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {navLinks.map((item) => {
          const Icon = navIcons[item.id as keyof typeof navIcons];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-warm-white/15 text-warm-white"
                  : "text-warm-white/75 hover:bg-warm-white/10 hover:text-warm-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-warm-white/10 p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-warm-white/75 transition-colors hover:bg-warm-white/10 hover:text-warm-white"
        >
          <LuLogOut className="h-5 w-5 shrink-0" aria-hidden />
          {logout}
        </button>
      </div>
    </aside>
  );
}
