'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className={variant === 'default' ? 'bg-luxury-gold hover:bg-luxury-gold-light text-luxury-navy' : ''}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>>({
    title: '',
    description: '',
    onConfirm: () => {},
  })

  const confirm = (newConfig: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    setConfig(newConfig)
    setIsOpen(true)
  }

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      {...config}
    />
  )

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}
