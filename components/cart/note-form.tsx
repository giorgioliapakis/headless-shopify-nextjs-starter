"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useCart, useCartForm } from "./hydrogen";

export function CartNoteForm({ note }: { note?: string | null }) {
  const t = useTranslations("cart");
  const { formProps, register } = useCartForm();
  const pending = useCart((state) => state.pending.note);
  const errors = useCart((state) => state.errors.note);
  const messages = [...errors.userErrors, ...errors.warnings];

  return (
    <form {...formProps()} className={cn("grid gap-2", pending && "opacity-60")}>
      <label htmlFor="cart-note" className="text-sm font-medium text-foreground">
        {t("orderNote")}
      </label>
      <textarea
        id="cart-note"
        {...register("note", { defaultValue: note ?? "" })}
        placeholder={t("orderNotePlaceholder")}
        maxLength={500}
        rows={3}
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button type="submit" variant="secondary" {...register("note-update")}>
        {t("saveNote")}
      </Button>
      {messages.length > 0 ? (
        <p role="alert" className="text-xs text-destructive">
          {messages.map((message) => message.message).join(" ")}
        </p>
      ) : null}
    </form>
  );
}
