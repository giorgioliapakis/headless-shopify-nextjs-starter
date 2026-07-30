"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useCart, useCartForm } from "./hydrogen";

export function CartNoteForm({
  note,
  labelHidden = false,
}: {
  note?: string | null;
  /** Hide the visible label (kept for screen readers) when a disclosure trigger already labels the form. */
  labelHidden?: boolean;
}) {
  const t = useTranslations("cart");
  const { formProps, register } = useCartForm();
  const pending = useCart((state) => state.pending.note);
  const errors = useCart((state) => state.errors.note);
  const messages = [...errors.userErrors, ...errors.warnings];
  // The drawer and the /cart page can be mounted at the same time; hardcoded ids would collide.
  const noteId = useId();
  const errorId = `${noteId}-error`;
  const hasError = messages.length > 0;

  return (
    <form {...formProps()} className={cn("grid gap-2", pending && "opacity-60")}>
      <label
        htmlFor={noteId}
        className={cn("text-sm font-medium text-foreground", labelHidden && "sr-only")}
      >
        {t("orderNote")}
      </label>
      <textarea
        id={noteId}
        {...register("note", { defaultValue: note ?? "" })}
        placeholder={t("orderNotePlaceholder")}
        maxLength={500}
        rows={3}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      <Button type="submit" variant="secondary" {...register("note-update")}>
        {t("saveNote")}
      </Button>
      {hasError ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {messages.map((message) => message.message).join(" ")}
        </p>
      ) : null}
    </form>
  );
}
