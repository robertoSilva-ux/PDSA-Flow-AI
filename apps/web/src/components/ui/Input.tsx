import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
        "placeholder:text-slate-400",
        className
      )}
      {...props}
    />
  )
}
