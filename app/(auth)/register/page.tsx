import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/motion-primitives";

import { currentUser } from "@/lib/auth";

export const metadata = { title: "ثبت‌نام" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto my-16 h-72 w-full max-w-md rounded-[1.75rem]" />}>
      <RegisterBlock />
    </Suspense>
  );
}

async function RegisterBlock() {
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell title="ساخت حساب" subtitle="یک‌بار ثبت‌نام کن و برای همیشه در بازار باش.">
      <AuthForm mode="register" />
      <p className="mt-5 text-center text-[13px] text-ink-muted">
        حساب داری؟{" "}
        <Link href="/login" className="font-semibold text-brand-300 hover:underline">
          وارد شو
        </Link>
      </p>
    </AuthShell>
  );
}