import * as React from "react"
import { cn } from "@/lib/utils"

type RadioGroupContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined)

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (value: string) => void
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          className={cn("space-y-2", className)}
          role="radiogroup"
          {...props}
        />
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    
    if (!context) {
      throw new Error("RadioGroupItem must be used within RadioGroup")
    }

    const isChecked = context.value === value

    return (
      <input
        ref={ref}
        type="radio"
        className={cn(
          "h-4 w-4 rounded-full border border-gray-300 text-luxury-navy focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2",
          className
        )}
        checked={isChecked}
        onChange={() => context.onValueChange(value)}
        value={value}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
