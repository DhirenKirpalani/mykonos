'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ReasonDialogProps {
  isOpen: boolean
  title: string
  description: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export function ReasonDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel'
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (reason.trim().length < 5) {
      return
    }
    onConfirm(reason)
    setReason('')
  }

  const handleCancel = () => {
    setReason('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for {title.toLowerCase()}:
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Enter reason (minimum 5 characters)"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && reason.trim().length >= 5) {
                handleConfirm()
              } else if (e.key === 'Escape') {
                handleCancel()
              }
            }}
          />
          {reason.length > 0 && reason.length < 5 && (
            <p className="mt-1 text-sm text-red-600">
              Reason must be at least 5 characters
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={reason.trim().length < 5}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
