import { useState, useRef } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center ${className ?? ''}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <span className="block bg-slate-700 text-slate-100 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg border border-slate-600">
            {content}
          </span>
          <span className="block w-2 h-2 bg-slate-700 border-r border-b border-slate-600 rotate-45 mx-auto -mt-1" />
        </span>
      )}
    </span>
  )
}
