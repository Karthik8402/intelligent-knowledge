import type { ReactNode } from 'react';

type Tone = 'danger' | 'info';

type ConfirmToastProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: Tone;
  busy?: boolean;
  extra?: ReactNode;
};

const toneMap: Record<Tone, {
  bg: string;
  border: string;
  icon: string;
  iconName: string;
  confirm: string;
  cancel: string;
}> = {
  danger: {
    bg: 'bg-[#2d0a0a]/90',
    border: 'border-[#ff4961]/30',
    icon: 'text-[#ff4961]',
    iconName: 'warning',
    confirm: 'bg-[#ff4961]/20 text-[#ff9aa8] hover:bg-[#ff4961]/30',
    cancel: 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high',
  },
  info: {
    bg: 'bg-surface-container-high/90',
    border: 'border-primary/30',
    icon: 'text-primary',
    iconName: 'info',
    confirm: 'bg-primary/20 text-primary hover:bg-primary/30',
    cancel: 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high',
  },
};

export default function ConfirmToast({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'danger',
  busy = false,
  extra,
}: ConfirmToastProps) {
  if (!open) return null;
  const styles = toneMap[tone];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[92%] max-w-md animate-scale-in">
        <div className={`${styles.bg} ${styles.border} border backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex items-start gap-3`}>
          <span className={`material-symbols-outlined ${styles.icon} text-xl mt-0.5`}>{styles.iconName}</span>
          <div className="flex-grow min-w-0">
            <p className="text-on-surface font-semibold text-sm">{title}</p>
            <p className="text-on-surface-variant text-xs mt-0.5 leading-relaxed">{message}</p>
            {extra && <div className="mt-2">{extra}</div>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onConfirm}
                disabled={busy}
                className={`${styles.confirm} px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                disabled={busy}
                className={`${styles.cancel} px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {cancelLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
