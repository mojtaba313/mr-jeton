import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/motion-primitives";

import { currentUser } from "@/lib/auth";

export const metadata = { title: "ورود" };

/**
 * Reads the session behind `<Suspense>`: a `cookies()` read in the shell would
 * make this public page request-bound, and a login page that is never cached is
 * a page every visitor waits on the server for.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeletonShell />}>
      <LoginBlock />
    </Suspense>
  );
}

function AuthSkeletonShell() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-64 rounded-[1.75rem]" />
      </div>
    </div>
  );
}

async function LoginBlock() {
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell title="خوش برگشتی" subtitle="با شماره دانشجویی یا ایمیلت وارد شو.">
      <AuthForm mode="login" />
      <p className="mt-5 text-center text-[13px] text-ink-muted">
        حساب نداری؟{" "}
        <Link href="/register" className="font-semibold text-brand-300 hover:underline">
          ثبت‌نام کن
        </Link>
      </p>
    </AuthShell>
  );
}