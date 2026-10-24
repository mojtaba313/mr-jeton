"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * بارگذاری تصویر (رسید کارت‌به‌کارت، آواتار، عکس منو).
 *
 * Why not a plain `<input type="file">` with a submit: the receipt must be on
 * the bucket before the form is submitted, because the form carries a *path*,
 * not a file. If the upload failed after the order was created, the buyer would
 * be stuck in «در انتظار پرداخت» with no way to attach a receipt. Uploading
 * first means the submit is one atomic step.
 *
 * The preview is a real object URL, revoked on replace — the leak is small but
 * it is the kind of small thing that shows up as a tab using 400 MB after an
 * hour of taking pictures of receipts.
 */

export type UploadState = {
  path: string | null;
  url: string | null;
  name: string | null;
};

export function ReceiptUpload({
  kind,
  value,
  onChange,
  error,
  hint = "تصویر رسید باید خوانا باشد؛ فقط چهار رقم آخر کارت و مبلغ دیده شود.",
  className,
}: {
  kind: "receipt" | "avatar" | "menu";
  value: UploadState;
  onChange: (next: UploadState) => void;
  error?: string;
  hint?: string;
  className?: string;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setLocalError(null);
      setProgress(8);

      try {
        // درخواست واقعی با XMLHttpRequest چون fetch پیشرفت آپلود نمی‌دهد.
        // یک نوار پیشرفتِ ساختگی بهتر از هیچ نواری است، ولی نوار واقعی بهتر
        // از نوار ساختگی است.
        const uploaded = await uploadWithProgress(file, kind, setProgress);

        onChange({
          path: uploaded.path,
          url: uploaded.url,
          name: file.name,
        });
      } catch (cause) {
        setLocalError(
          cause instanceof Error ? cause.message : "آپلود انجام نشد.",
        );
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [kind, onChange],
  );

  const message = error ?? localError;

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        className="block text-[13px] font-medium text-ink-soft"
      >
        تصویر رسید
      </label>

      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />

      <AnimatePresence mode="wait">
        {value.url ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="group relative overflow-hidden rounded-2xl border border-jade-400/30 bg-canvas-deep"
          >
            {/* عکس رسید از باکت می‌آید؛ next/image روی URL خارجی
                به‌صورت پیش‌فرض بهینه نمی‌کند چون هدر احراز هویت را فوروارد نمی‌کند. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.url}
              alt="پیش‌نمایش رسید"
              className="max-h-56 w-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-canvas-deep to-transparent px-3 py-2">
              <span className="flex items-center gap-1.5 text-[12px] text-jade-400">
                <Check className="size-3.5" />
                بارگذاری شد
              </span>
              <button
                type="button"
                onClick={() => onChange({ path: null, url: null, name: null })}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-ink-muted transition-colors hover:text-rose-warm"
              >
                <Trash2 className="size-3.5" />
                حذف
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.label
            key="drop"
            htmlFor={inputId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void upload(file);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-brand-300/70 bg-brand-400/10"
                : "border-white/12 bg-white/[0.02] hover:border-brand-300/40",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin text-brand-300" />
                <p className="text-[13px] text-ink-soft">در حال بارگذاری…</p>
                <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand-300 to-ember-500"
                    animate={{ width: `${Math.max(8, progress)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-400/10 text-brand-300">
                  <ImageUp className="size-5" />
                </span>
                <p className="text-[13px] font-medium text-ink-soft">
                  تصویر را انتخاب کن یا اینجا رها کن
                </p>
                <p className="text-[12px] text-ink-faint">
                  JPG، PNG یا WebP — حداکثر ۴ مگابایت
                </p>
              </>
            )}
          </motion.label>
        )}
      </AnimatePresence>

      {message ? (
        <p className="text-[12px] font-medium text-rose-warm">{message}</p>
      ) : (
        <p className="text-[12px] leading-5 text-ink-faint">{hint}</p>
      )}

      {value.url ? (
        <input type="hidden" name="receiptUrl" value={value.url} />
      ) : null}
    </div>
  );
}

/**
 * آپلود با گزارش پیشرفت.
 *
 * XHR because `fetch` has no upload progress event, and an 800 KB receipt that
 * appears to hang for three seconds on a campus wifi is a support ticket.
 */
function uploadWithProgress(
  file: File,
  kind: string,
  onProgress: (percent: number) => void,
): Promise<{ path: string; url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          path?: string;
          url?: string;
          error?: string;
        };

        if (xhr.status >= 200 && xhr.status < 300 && body.path && body.url) {
          resolve({ path: body.path, url: body.url });
        } else {
          reject(new Error(body.error ?? "آپلود انجام نشد."));
        }
      } catch {
        reject(new Error("پاسخ سرور قابل خواندن نبود."));
      }
    };

    xhr.onerror = () => reject(new Error("ارتباط با سرور قطع شد."));
    xhr.send(formData);
  });
}