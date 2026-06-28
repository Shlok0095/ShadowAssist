// Copyright (c) 2026 VeilAssist. All rights reserved.
// Lucide icons — consistent stroke weight across settings and overlay chrome.

import React from 'react'

/** @typedef {import('lucide-react').LucideIcon} LucideIcon */

/**
 * @param {{ icon: LucideIcon, size?: number, strokeWidth?: number, className?: string } & React.SVGAttributes<SVGSVGElement>} props
 */
export default function AppIcon({ icon: Icon, size = 16, strokeWidth = 1.75, className = '', ...rest }) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`.trim()}
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    />
  )
}
