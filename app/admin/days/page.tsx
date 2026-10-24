import { Suspense } from "react";

import { MealDayManager, type DayRow } from "@/components/admin/meal-day-manager";
import { Skeleton } from "@/components/ui/motion-primitives";

import { requireAdmin } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { getAllDays } from "@/lib/queries";

export const metadata = { title: "روزهای غذا" };

export default async function AdminDaysPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          روزهای غذا
        </h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-muted">
          هر روز غذا یک منو و یک قیمت رسمی دارد. محل و ساعت تحویل را فروشنده خودش
          تعیین می‌کند، پس اینجا چیزی برای ثبت آن نیست. تا وقتی وضعیت «باز» است،
          کاربرها می‌توانند آگهی بگذارند.
        </p>
      </header>

      <Suspense fallback={<DaysSkeleton />}>
        <DaysBlock />
      </Suspense>
    </div>
  );
}

async function DaysBlock() {
  await requireAdmin();
  const days = await getAllDays();

  // روزی که ثبت نشده هم باید از همین صفحه اضافه شود؛ پس فهرست خالی را خودِ
  // مدیر نشان می‌دهد، نه یک حالت خالیِ بدون دکمه.
  const rows: DayRow[] = days.map((day) => ({
    id: day.id,
    title: day.title,
    mealType: day.mealType,
    menu: day.menu,
    // تاریخ میلادی برای <input type="date">: به وقت تهران محاسبه می‌شود تا
    // انتخاب مدل با همان روزی که در بازار می‌بیند یکی باشد.
    dateISO: toDateInput(day.date),
    officialPrice: day.officialPrice,
    capacity: day.capacity,
    status: day.status,
    notes: day.notes,
    listingsCount: day.listingsCount,
    ordersCount: day.reservationsCount,
  }));

  return <MealDayManager days={rows} />;
}

function DaysSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl2" />
      ))}
    </div>
  );
}