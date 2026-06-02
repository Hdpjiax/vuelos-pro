"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

function InnerButton({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`${className} inline-flex items-center justify-center gap-2`}
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          Procesando...
        </>
      ) : children}
    </button>
  );
}

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage: _confirmMessage,
  disabled,
  variant: _variant,
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <InnerButton className={className} disabled={disabled}>
      {children}
    </InnerButton>
  );
}