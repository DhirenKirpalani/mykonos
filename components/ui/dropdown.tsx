'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface DropdownOption {
  value: string | number
  label: string
}

interface DropdownProps {
  value: string | number
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  label?: string
  className?: string
  align?: 'left' | 'right'
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  className = '',
  align = 'left',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30 transition-colors hover:bg-gray-50"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-luxury-gold shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 min-w-full rounded-lg border border-luxury-gold/30 bg-white shadow-xl py-1 max-h-60 overflow-y-auto ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(String(option.value))
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-luxury-gold/10 text-luxury-navy font-medium'
                    : 'text-gray-700 hover:bg-luxury-gold/5 hover:text-luxury-navy'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-luxury-gold shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
