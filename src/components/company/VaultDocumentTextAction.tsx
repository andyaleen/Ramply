interface VaultDocumentTextActionProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

/** Small destructive text action used under vault document Replace buttons. */
export function VaultDocumentTextAction({
  label,
  onClick,
  disabled = false,
}: VaultDocumentTextActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  )
}
