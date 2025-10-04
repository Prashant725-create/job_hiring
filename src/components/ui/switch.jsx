// src/components/ui/switch.jsx
import React, { forwardRef } from "react";
import clsx from "clsx";

/**
 * Small accessible Switch component (shadcn-style)
 *
 * Props:
 *  - checked: boolean
 *  - onCheckedChange: function(newChecked)
 *  - className: extra classes for root
 *  - disabled
 *
 * Usage: <Switch checked={isOn} onCheckedChange={() => setOn(!isOn)} />
 */

export const Switch = forwardRef(function Switch(
  { checked = false, onCheckedChange = () => {}, className = "", disabled = false, ...rest },
  ref
) {
  // keyboard toggling handled by button with role="switch"
  const rootClasses = clsx(
    "relative inline-flex items-center transition-colors duration-150",
    "w-12 h-7 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2",
    checked ? "bg-[var(--accent)]" : "bg-[var(--button-bg)]",
    disabled ? "opacity-60 pointer-events-none" : "cursor-pointer",
    className
  );

  const thumbClasses = clsx(
    "inline-block w-5 h-5 bg-white rounded-full transform shadow-sm transition-transform duration-150",
    checked ? "translate-x-5" : "translate-x-1"
  );

  return (
    <button
      role="switch"
      aria-checked={checked}
      ref={ref}
      type="button"
      onClick={() => !disabled && onCheckedChange(!checked)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={rootClasses}
      {...rest}
    >
      <span aria-hidden className={thumbClasses} />
    </button>
  );
});

export default Switch;
