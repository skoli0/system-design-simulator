"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  className?: string
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
  disabled?: boolean
  "aria-label"?: string
}

function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled = false,
  "aria-label": ariaLabel,
}: SliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = React.useState(defaultValue?.[0] ?? min)
  const isControlled = value !== undefined
  const currentValue = isControlled ? (value?.[0] ?? min) : internalValue

  const clamped = Math.max(min, Math.min(max, currentValue))
  const percentage = max === min ? 0 : ((clamped - min) / (max - min)) * 100

  const setValue = React.useCallback(
    (next: number) => {
      const snapped = Math.round(next / step) * step
      const bounded = Math.max(min, Math.min(max, snapped))
      if (!isControlled) setInternalValue(bounded)
      onValueChange?.([bounded])
    },
    [isControlled, max, min, onValueChange, step]
  )

  const valueFromClientX = React.useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return min
      const { left, width } = el.getBoundingClientRect()
      if (width <= 0) return min
      const t = Math.max(0, Math.min(1, (clientX - left) / width))
      return min + t * (max - min)
    },
    [max, min]
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setValue(valueFromClientX(e.clientX))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    setValue(valueFromClientX(e.clientX))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault()
      setValue(clamped + step)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault()
      setValue(clamped - step)
    } else if (e.key === "Home") {
      e.preventDefault()
      setValue(min)
    } else if (e.key === "End") {
      e.preventDefault()
      setValue(max)
    }
  }

  return (
    <div
      ref={trackRef}
      data-slot="slider"
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "relative h-5 w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      {/* Track — centered on the container midpoint */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-cyan-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb — same vertical center as the track */}
      <div
        className="pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-500 bg-white shadow-sm"
        style={{ left: `${percentage}%` }}
      />
    </div>
  )
}

export { Slider }
