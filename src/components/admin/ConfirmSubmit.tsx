"use client";
import { useEffect, useRef, useState } from "react";
import { AdminIcon } from "./icons";

/**
 * A submit button that asks for confirmation first. The confirmation is a real
 * modal: Escape cancels, focus is moved to the confirm action, and the form is
 * only submitted after the operator confirms.
 */
export function ConfirmSubmit({
  children, message, confirmLabel = "Confirm", className = "admin-button",
}: {
  children: React.ReactNode;
  message: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirm.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"
            className="admin-fade w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
            <div className="flex items-start gap-3 p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn-bg text-warn"><AdminIcon name="alert" className="size-5" /></span>
              <div>
                <h2 id="confirm-title" className="font-display text-base font-bold text-ink">{confirmLabel}?</h2>
                <p id="confirm-body" className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-line bg-surface/60 px-5 py-3">
              <button type="button" className="admin-button-secondary" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Cancel</button>
              <button ref={confirm} type="button" className="admin-button" onClick={() => { setOpen(false); trigger.current?.form?.requestSubmit(); }}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
