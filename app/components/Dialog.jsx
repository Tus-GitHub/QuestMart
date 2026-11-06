"use client";
import { useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function Dialog({
  children,
  onClose,
  label,
  wide = false,
  className = "",
  footer,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""} ${className}`}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <XMarkIcon />
      </button>
      <div className="dialog-scroll">{children}</div>
      {footer ? <div className="dialog-footer">{footer}</div> : null}
    </dialog>
  );
}
