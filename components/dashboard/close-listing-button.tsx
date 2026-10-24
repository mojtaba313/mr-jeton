"use client";

import { motion } from "motion/react";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { closeListingAction } from "@/app/actions/market";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * بستن آگهی.
 *
 * Confirmation is a dialog rather than `window.confirm`, because the native one
 * is a different design language on every OS, cannot be animated, and on mobile
 * it renders as a page-level sheet that loses the context of what you are
 * cancelling.
 */
export function CloseListingButton({
  listingId,
  disabled,
}: {
  listingId: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        <XCircle className="size-3.5" />
        بستن آگهی
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="آگهی بسته شود؟"
        description="آگهی از بازار برداشته می‌شود. اگر خریداری آن را خریده باشد، اول باید با او هماهنگ کنی."
      >
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              variant="danger"
              className="w-full"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await closeListingAction(listingId);
                  setOpen(false);
                  if (!result) return;
                  if (result.ok) {
                    toast.success(result.message);
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                })
              }
            >
              {pending ? "…" : "بله، ببند"}
            </Button>
          </motion.div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            انصراف
          </Button>
        </div>
      </Dialog>
    </>
  );
}