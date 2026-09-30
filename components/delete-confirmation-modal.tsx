"use client";

type DeleteConfirmationModalProps = {
  open: boolean;
  type: "task" | "note";
  itemName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationModal({
  open,
  type,
  itemName,
  loading = false,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  if (!open) return null;

  const isTask = type === "task";

  return (
    <div
      className="delete-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <h2 id="delete-modal-title">
          {isTask ? "Delete task?" : "Delete note?"}
        </h2>

        <p>
          {isTask ? (
            <>
              This will delete
              {itemName ? (
                <>
                  {" "}
                  <strong>“{itemName}”</strong>
                </>
              ) : (
                " this task"
              )}{" "}
              and its task notes. This can&apos;t be undone.
            </>
          ) : (
            <>
              This note will be permanently deleted. This
              can&apos;t be undone.
            </>
          )}
        </p>

        <div className="delete-modal-actions">
          <button
            type="button"
            className="button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button delete-modal-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Deleting…"
              : isTask
                ? "Delete task"
                : "Delete note"}
          </button>
        </div>
      </div>
    </div>
  );
}