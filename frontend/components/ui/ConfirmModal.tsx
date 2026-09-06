"use client";

import { AlertTriangle, Info, Trash2, X, Loader2 } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
  /** If true, acts as a simple alert popup (only one button: OK) */
  isAlert?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
  isAlert = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const defaultTitle = isAlert
    ? "Notification"
    : variant === "danger"
    ? "Confirm Delete"
    : "Confirm Action";

  const defaultConfirmText = confirmText ?? (isAlert ? "OK" : variant === "danger" ? "Delete" : "Confirm");

  const Icon = variant === "danger" ? Trash2 : variant === "warning" ? AlertTriangle : Info;

  const iconBg =
    variant === "danger"
      ? "bg-red-950/60 text-red-400 border-red-800/60"
      : variant === "warning"
      ? "bg-amber-950/60 text-amber-400 border-amber-800/60"
      : "bg-sky-950/60 text-sky-400 border-sky-800/60";

  const confirmBtnCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white shadow-red-950/50"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50"
      : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div
        className="bg-theme-surface border border-theme-border-hover/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${iconBg} shadow-inner`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-theme-text tracking-wide">
              {title ?? defaultTitle}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 rounded-lg text-theme-sub hover:text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-theme-sub leading-relaxed font-normal">
            {message}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-theme-base/50 border-t border-theme-border/80">
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-theme-sub bg-theme-elevated hover:bg-theme-muted border border-theme-border-hover transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              } else {
                onCancel();
              }
            }}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 ${confirmBtnCls}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
