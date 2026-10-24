"use client";

import { motion } from "motion/react";
import { BellRing, CalendarDays, CalendarPlus, Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  remindHandoverAction,
  saveMealDayAction,
  setDayStatusAction,
  type AdminState,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { EmptyState } from "@/components/ui/motion-primitives";
import { toJalali, toPersianDigits } from "@/lib/dates";
import { formatNumber } from "@/lib/money";
import { DAY_STATUS } from "@/lib/labels";

/**
 * مدیریت روزهای غذا.
 *
 * The date comes from the same Jalali picker the sell form uses, so an admin
 * never converts months in their head: they pick «۱۲ آبان», the hidden input
 * carries the Gregorian `YYYY-MM-DD` that the action already expects, and the
 * row below shows the day in Jalali again.
 */

export type DayRow = {
  id: number;
  title: string;
  mealType: string;
  menu: string;
  dateISO: string;
  officialPrice: number;
  capacity: number;
  status: string;
  notes: string | null;
  listingsCount: number;
  ordersCount: number;
};

const STATUS_OPTIONS = Object.entries(DAY_STATUS).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export function MealDayManager({
  days,
  todayISO,
}: {
  days: DayRow[];
  /** امروز به وقت تهران، `YYYY-MM-DD` — کمترین روزِ قابل انتخاب. */
  todayISO: string;
}) {
  const [editing, setEditing] = useState<DayRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          روز غذای جدید
        </Button>
      </div>

      <div className="space-y-3">
        {days.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-6" />}
            title="هنوز روز غذایی ثبت نشده"
            description="اولین روز را اضافه کن تا بازار برای آن روز باز شود."
          />
        ) : (
          days.map((day, index) => (
            <DayRowCard
              key={day.id}
              day={day}
              index={index}
              onEdit={() => setEditing(day)}
            />
          ))
        )}
      </div>

      <MealDayDialog
        open={creating || editing !== null}
        day={editing}
        todayISO={todayISO}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function DayRowCard({
  day,
  index,
  onEdit,
}: {
  day: DayRow;
  index: number;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const status = DAY_STATUS[day.status as keyof typeof DAY_STATUS] ?? DAY_STATUS.OPEN;
  const { jy, jm, jd } = toJalali(new Date(day.dateISO));

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="glass rounded-xl2 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-bold text-ink">{day.title}</h3>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="text-[11px] text-ink-faint">{day.mealType}</span>
          </div>

          <p className="mt-1.5 text-[13px] text-ink-soft">{day.menu}</p>

          <p className="mt-1.5 text-[12px] text-ink-muted">
            {toPersianDigits(jy)}/{toPersianDigits(jm)}/{toPersianDigits(jd)} ·{" "}
            {formatNumber(day.officialPrice)} تومان · {day.listingsCount} آگهی ·{" "}
            {day.ordersCount} رزرو
          </p>


        </div>

        <div className="flex items-center gap-2">
          <IconButton label="ویرایش روز" onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>

          <IconButton
            label="یادآوری به پرداخت‌نکرده‌ها"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await remindHandoverAction(day.id);
                if (result?.ok) toast.success(result.message);
                else if (result) toast.error(result.message);
              })
            }
          >
            <BellRing className="size-4" />
          </IconButton>

          <select
            value={day.status}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value;
              startTransition(async () => {
                const result = await setDayStatusAction(day.id, next as never);
                if (result?.ok) {
                  toast.success(result.message);
                  router.refresh();
                } else if (result) {
                  toast.error(result.message);
                }
              });
            }}
            className="h-10 cursor-pointer rounded-xl border border-white/10 bg-canvas-deep/70 px-2.5 text-[12px] text-ink-soft outline-none focus:border-brand-300/50"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-surface">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.article>
  );
}

function MealDayDialog({
  open,
  day,
  todayISO,
  onClose,
}: {
  open: boolean;
  day: DayRow | null;
  todayISO: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(
    saveMealDayAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      onClose();
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // روز گذشته‌ای که در حال ویرایشش هستیم نباید بی‌دلیل غیرفعال شود.
  const minISO = day && day.dateISO < todayISO ? day.dateISO : todayISO;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={day ? "ویرایش روز غذا" : "روز غذای جدید"}
      description={
        day
          ? "تغییرات بلافاصله در بازار اعمال می‌شود."
          : "روز غذا را از تقویم شمسی انتخاب کن؛ به وقت تهران ذخیره می‌شود."
      }
      className="max-w-xl"
    >
      <form action={action} className="space-y-4">
        {day ? <input type="hidden" name="id" value={day.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="عنوان"
            name="title"
            required
            defaultValue={day?.title ?? ""}
            placeholder="مثلاً: ناهار دوشنبه"
            error={state?.errors?.title}
          />
          <Select
            label="نوع وعده"
            name="mealType"
            defaultValue={day?.mealType ?? "ناهار"}
            options={["صبحانه", "ناهار", "شام"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="block text-[13px] font-medium text-ink-soft">تاریخ</span>
            <JalaliDatePicker
              name="date"
              defaultValue={day?.dateISO ?? todayISO}
              minISO={minISO}
              error={state?.errors?.date}
            />
          </div>
          <Select
            label="وضعیت"
            name="status"
            defaultValue={day?.status ?? "OPEN"}
            options={STATUS_OPTIONS}
          />
        </div>

        <Textarea
          label="منو"
          name="menu"
          required
          defaultValue={day?.menu ?? ""}
          placeholder="مثلاً: جوجه‌کباب، برنج ایرانی، سالاد شیرازی"
          error={state?.errors?.menu}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="قیمت رسمی هر ژتون (تومان)"
            name="officialPrice"
            inputMode="numeric"
            dir="ltr"
            required
            defaultValue={day ? String(day.officialPrice) : ""}
            placeholder="۱۲۵۰۰۰"
            error={state?.errors?.officialPrice}
            hint="مبنای مقایسه‌ی قیمت آگهی‌ها با سلف."
          />
          <Field
            label="ظرفیت (۰ = نامحدود)"
            name="capacity"
            inputMode="numeric"
            dir="ltr"
            defaultValue={day ? String(day.capacity) : "0"}
          />
        </div>

        <Textarea
          label="یادداشت (اختیاری)"
          name="notes"
          defaultValue={day?.notes ?? ""}
          maxLength={400}
        />

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarPlus className="size-4" />
          )}
          {day ? "ذخیره تغییرات" : "ثبت روز غذا"}
        </Button>
      </form>
    </Dialog>
  );
}
