import { AlertCircle } from 'lucide-react';

export function DeleteModal({ name, status, onConfirm, onCancel, loading }) {
  const isDraft = status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl p-7 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={18} className="text-failed shrink-0" />
          <h3 className="font-semibold text-failed">Delete campaign?</h3>
        </div>
        <p className="text-sm text-muted mb-2 leading-relaxed wrap-break-word">
          <span className="text-main font-medium">"{name}"</span> will be permanently deleted.
        </p>
        {!isDraft && (
          <p className="text-xs text-failed bg-failed/10 border border-failed/20 rounded px-3 py-2 mt-2">
            Only DRAFT campaigns can be deleted. This campaign is {status}.
          </p>
        )}
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted border border-border hover:text-main transition-colors"
          >
            Cancel
          </button>
          {isDraft && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-md text-sm font-medium bg-failed/10 text-failed border border-failed/30 hover:bg-failed/20 transition-colors"
            >
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}