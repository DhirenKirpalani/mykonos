'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DatePicker({ value, onChange, placeholder = 'Select date', label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const d = new Date(value)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })
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

  // Sync viewMonth when value changes externally
  useEffect(() => {
    if (value && open) {
      const d = new Date(value)
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [value, open])

  const selectedDate = value ? new Date(value) : null

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }

  const days = getDaysInMonth(viewMonth)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleSelect = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setOpen(false)
  }

  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30 transition-colors hover:bg-gray-50"
      >
        <Calendar className="h-4 w-4 text-luxury-gold shrink-0" />
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 rounded-lg border border-luxury-gold/30 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-luxury-gold/10 hover:text-luxury-navy transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-luxury-gold/10 hover:text-luxury-navy transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 p-2 pb-1">
            {DAY_NAMES.map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-luxury-gold/70 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 p-2 pt-0">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={idx} />
              }
              const isSelected = isSameDay(date, selectedDate)
              const isToday = isSameDay(date, today)

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(date)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-luxury-gold text-luxury-navy font-bold'
                      : isToday
                        ? 'border border-luxury-gold/50 text-gray-900 hover:bg-luxury-gold/10'
                        : 'text-gray-700 hover:bg-luxury-gold/10 hover:text-luxury-navy'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                const t = new Date()
                handleSelect(t)
              }}
              className="text-xs font-medium text-luxury-gold hover:text-luxury-gold/80 transition-colors px-2 py-1"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
