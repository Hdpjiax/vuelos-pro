"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={disabled || pending}
      onClick={(event) => {
        if (!confirmMessage) return;
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Procesando..." : children}
    </button>
  );
}
