import { Logo } from "@/components/site/logo";

/**
 * پوسته‌ی مشترک صفحه‌های ورود و ثبت‌نام.
 *
 * One shell with a `mode` prop rather than two pages: they are the same form
 * with three extra fields, and the only visual difference is a heading.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center px-4 py-12 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 size-[420px] -translate-x-1/2 rounded-full bg-brand-500/14 blur-[110px]" />
      </div>

      <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <Logo />
          <h2 className="mt-8 max-w-md text-4xl font-black leading-tight tracking-tight text-ink">
            ژتون‌ها را
            <br />
            بین خودتان رد و بدل کنید.
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-8 text-ink-muted">
            بازار ژتون، جایی است که ژتون رزروشده‌ی بی‌استفاده به ناهار کسی می‌رسد.
            ثبت‌نام با شماره دانشجویی، و بدون هیچ واسطه‌ای.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "تسویه کارت‌به‌کارت با رسید قابل بررسی",
              "تحویل ژتون در روز غذا با کد یکتا",
              "سهم کوچک سایت، باقی‌اش سهم فروشنده",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-[13px] text-ink-soft"
              >
                <span className="grid size-5 place-items-center rounded-full bg-jade-400/15 text-[11px] text-jade-400">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-strong mx-auto w-full max-w-md rounded-[1.75rem] p-7 shadow-lift">
          <div className="lg:hidden">
            <Logo className="mb-6" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-[13px] leading-6 text-ink-muted">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}