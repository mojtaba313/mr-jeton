import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  EyeOff,
  HandCoins,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/marketing/sections";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion-primitives";

import { FEE_PERCENT, MAP, PAYMENT } from "@/lib/config";
import { toPersianDigits } from "@/lib/dates";

export const metadata = { title: "چطور کار می‌کند" };

/**
 * قوانین و روند کار.
 *
 * The one rule this page exists to make obvious: **مدیر در معامله نیست**. He
 * tops up wallets and pays withdrawals; everything else happens between two
 * people who can see each other's phone number and can walk to a point on the
 * map.
 */

const FLOW: { icon: LucideIcon; title: string; body: string; state: string }[] = [
  {
    icon: Ticket,
    title: "آگهی می‌گذاری",
    body: "قیمت دلخواهت را می‌نویسی و روی نقشه‌ی دانشگاه نقطه‌ی تحویل را انتخاب می‌کنی، با یک توضیح فارسی که یک غریبه هم بتواند پیدایش کند. روز و بازه‌ی تحویل هم مال خودت است.",
    state: "وضعیت: باز",
  },
  {
    icon: Wallet,
    title: "خریدار کیف پولش را شارژ می‌کند",
    body: "قبل از هر رزرو، کیف پول باید پول داشته باشد. یک‌بار کارت‌به‌کارت واریز می‌شود و رسیدش به مدیر می‌رسد؛ بعد از تایید، موجودی اضافه می‌شود و برای همیشه می‌ماند.",
    state: "موجودی کیف پول",
  },
  {
    icon: MapPin,
    title: "رزرو و پیدا شدن همدیگر",
    body: "خریدار ژتون را رزرو می‌کند و پول از کیف پولش قفل می‌شود. از همین لحظه شماره‌ی تو برای او باز می‌شود — نه قبلش.",
    state: "وضعیت: رزرو شده",
  },
  {
    icon: CalendarClock,
    title: "تحویل در نقطه‌ی تو",
    body: "روز و ساعتی که اعلام کرده‌ای، سراغ هم می‌روید. وقتی ژتون را دادی، اعلام می‌کنی و خریدار با یک دکمه تایید می‌کند که گرفته است.",
    state: "وضعیت: تحویل شد — تایید خریدار",
  },
  {
    icon: HandCoins,
    title: "پول به کیف پول فروشنده می‌رسد",
    body: "با تایید خریدار، سهم تو به کیف پولت اضافه می‌شود (کمی از آن سهم سایت است). هر وقت خواستی، از کیف پول برداشت می‌کنی و مدیر آن را به کارت واریز می‌کند.",
    state: "تسویه شد",
  },
];

const RULES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: EyeOff,
    title: "تا قبل از رزرو، همدیگر را نمی‌شناسید",
    body: "در بازار فقط قیمت، محل و ساعت دیده می‌شود. نام و شماره‌ی تماس بعد از رزرو باز می‌شود — برای همین نمی‌شود معامله را دور زد و پول را مستقیم داد.",
  },
  {
    icon: ShieldCheck,
    title: "پول وسط می‌ماند",
    body: "پول خریدار از کیف پولش به امانت می‌ماند تا لحظه‌ای که خریدار دریافت ژتون را تایید کند. فروشنده نمی‌تواند خودش پولش را بردارد.",
  },
  {
    icon: CreditCard,
    title: "شارژ کیف پول تنها جایی است که کارت‌به‌کارت داریم",
    body: "یک واریز برای هر کاربر، و برداشت‌ها بعداً. یعنی درگاه پرداخت نمی‌خواهیم و کارمزد درگاه هم نداریم.",
  },
  {
    icon: AlertTriangle,
    title: "اگر کسی نیامد چه؟",
    body: "قبل از تحویل، خریدار می‌تواند رزرو را لغو کند و پولش برمی‌گردد. اگر یکی از طرفین اعتراض کند، پول همان‌جا می‌ماند تا مدیر تصمیم بگیرد.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Reveal>
        <div className="text-center">
          <SectionHeading
            eyebrow="قوانین بازار"
            title="چطور کار می‌کند"
            description="مدیر واسطه نیست: خریدار و فروشنده خودشان همدیگر را پیدا می‌کنند و کار می‌کنند. نقش سایت، نگه‌داشتن پول وسط معامله است."
          />
        </div>
      </Reveal>

      <ol className="mt-14 space-y-3">
        {FLOW.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.06}>
            <li className="glass group flex gap-4 rounded-xl2 p-5 transition-colors hover:border-brand-300/25">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-brand-300/25 bg-canvas-deep text-brand-200">
                <step.icon className="size-5" />
                <span className="absolute -bottom-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-brand-400 text-[10px] font-black text-canvas-deep">
                  {toPersianDigits(index + 1)}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-bold text-ink">{step.title}</h3>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-ink-muted">
                    {step.state}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-7 text-ink-muted">{step.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>

      <Reveal>
        <section className="mt-20">
          <SectionHeading
            eyebrow="قوانین"
            title="چهار قاعده‌ای که باید بدانی"
            description="این‌ها همان چیزهایی است که در عمل اختلاف می‌سازد."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {RULES.map((rule, index) => (
              <Reveal key={rule.title} delay={index * 0.06}>
                <div className="glass h-full rounded-xl2 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-400/10 text-brand-300">
                    <rule.icon className="size-4.5" />
                  </span>
                  <h3 className="mt-4 text-[14px] font-bold text-ink">{rule.title}</h3>
                  <p className="mt-2 text-[13px] leading-7 text-ink-muted">
                    {rule.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="glass-strong mt-20 rounded-[2rem] p-8">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink">
                <Wallet className="size-4.5 text-brand-300" />
                پول کجا می‌رود؟
              </h2>
              <p className="mt-3 text-[13px] leading-7 text-ink-muted">
                قیمت هر ژتون را خریدار تعیین می‌کند. پول اول از کیف پول خریدار به
                امانت می‌رود، بعد از تحویل{" "}
                <strong className="text-brand-200">
                  {toPersianDigits(FEE_PERCENT)} درصد سهم سایت
                </strong>{" "}
                کم می‌شود (این کل درآمد سایت است) و باقی‌اش به کیف پول فروشنده
                می‌رود.
              </p>
              {PAYMENT.cardNumber ? (
                <div className="mt-5 rounded-2xl border border-white/8 bg-canvas-deep/50 p-4">
                  <p className="text-[12px] text-ink-muted">کارت سایت برای شارژ</p>
                  <code
                    dir="ltr"
                    className="mt-1.5 block select-all text-lg font-black tracking-widest text-ink"
                  >
                    {PAYMENT.cardNumber}
                  </code>
                  {PAYMENT.cardHolder ? (
                    <p className="mt-1.5 text-[12px] text-ink-faint">
                      به نام {PAYMENT.cardHolder}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink">
                <MessageCircle className="size-4.5 text-brand-300" />
                چطور مطمئن شوم طرف مقابل واقعی است؟
              </h2>
              <p className="mt-3 text-[13px] leading-7 text-ink-muted">
                شماره‌ی تماس هر کاربر با ربات تلگرام تایید می‌شود، یعنی همان شماره‌ای
                که تلگرام برایش تأییدیه دارد. کسی نمی‌تواند شماره‌ی دوستش را بنویسد
                و نقش خودش را بازی کند.
              </p>
              <ul className="mt-5 space-y-2.5 text-[13px] text-ink-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-jade-400" />
                  ثبت‌نام فقط با شماره‌ی تاییدشده انجام می‌شود.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-jade-400" />
                  قیمت‌ها به هزار تومان گرد می‌شوند.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-jade-400" />
                  نقطه‌ی تحویل روی نقشه‌ی {MAP.label} ذخیره می‌شود.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap gap-3 border-t border-white/8 pt-7">
            <LinkButton href="/market">دیدن بازار</LinkButton>
            <LinkButton href="/register" variant="outline">
              ساخت حساب
            </LinkButton>
            <Link
              href="/"
              className="flex items-center gap-1.5 self-center text-[13px] text-ink-muted transition-colors hover:text-ink"
            >
              <Sparkles className="size-3.5" />
              بازگشت به صفحه‌ی اصل
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}