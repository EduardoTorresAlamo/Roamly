import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  /** Short question, e.g. "Delete this trip?" */
  title: string
  /** Explains exactly what is lost so the user can make an informed choice */
  description: string
  /** Label of the destructive action button */
  confirmLabel?: string
  /** Invoked when the user confirms; the caller performs the deletion */
  onConfirm: () => void
  /** Invoked on cancel, Escape, backdrop click, or the X button */
  onCancel: () => void
}

/**
 * Generic confirmation dialog for irreversible actions.
 *
 * Trips and activities live only in localStorage with no undo history, so a
 * mistaken tap — easy on a touch screen, where delete buttons are always visible —
 * destroys data permanently. This dialog is the guard for those actions.
 *
 * The cancel button is rendered last in the DOM but appears first visually via
 * DialogFooter's flex-col-reverse, so the safe action is the one under the thumb
 * on mobile while confirm keeps initial focus off the destructive button.
 *
 * @param open - Whether the dialog is visible
 * @param title - Short confirmation question
 * @param description - What will be permanently removed
 * @param confirmLabel - Text of the destructive button (defaults to "Delete")
 * @param onConfirm - Called when the user confirms the action
 * @param onCancel - Called when the user dismisses the dialog
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-1">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-white/50">{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl glass-inner text-white/70 hover:text-white text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
