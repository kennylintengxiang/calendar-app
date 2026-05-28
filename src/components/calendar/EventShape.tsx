'use client'

import React from 'react'

interface EventShapeProps {
  shape: string
  color: string
  size?: number
  className?: string
  symbol?: string
}

export function EventShape({ shape, color, size = 12, className = '', symbol }: EventShapeProps) {
  const s = size
  const half = s / 2
  const fontSize = Math.max(s * 0.55, 8)
  // Determine text color - white for dark backgrounds, dark for light backgrounds
  const textColor = isLightColor(color) ? '#1a1a1a' : '#ffffff'

  const shapeOnly = (
    <>
      {shape === 'circle' && (
        <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={half} cy={half} r={half - 1} fill={color} />
        </svg>
      )}
      {shape === 'square' && (
        <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}>
          <rect x={1} y={1} width={s - 2} height={s - 2} fill={color} rx={1} />
        </svg>
      )}
      {shape === 'triangle' && (
        <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${half},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={color} />
        </svg>
      )}
      {shape === 'diamond' && (
        <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={`${half},1 ${s - 1},${half} ${half},${s - 1} 1,${half}`} fill={color} />
        </svg>
      )}
      {shape === 'star' && (
        <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}>
          <polygon
            points={`${half},1 ${half + s * 0.15},${half - s * 0.1} ${s - 1},${half - s * 0.1} ${half + s * 0.2},${half + s * 0.05} ${half + s * 0.35},${s - 1} ${half},${half + s * 0.25} ${half - s * 0.35},${s - 1} ${half - s * 0.2},${half + s * 0.05} 1,${half - s * 0.1} ${half - s * 0.15},${half - s * 0.1}`}
            fill={color}
          />
        </svg>
      )}
      {shape === 'heart' && (
        <svg width={s} height={s} className={className} viewBox="0 0 24 24">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={color}
          />
        </svg>
      )}
      {shape === 'hexagon' && (
        <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}>
          <polygon
            points={`${half},1 ${s - 1},${half * 0.5} ${s - 1},${half * 1.5} ${half},${s - 1} 1,${half * 1.5} 1,${half * 0.5}`}
            fill={color}
          />
        </svg>
      )}
    </>
  )

  // If no symbol, just render the shape
  if (!symbol || symbol.trim() === '') {
    // Render default shape
    if (shape === 'circle') return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 1} fill={color} /></svg>
    if (shape === 'square') return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><rect x={1} y={1} width={s - 2} height={s - 2} fill={color} rx={1} /></svg>
    if (shape === 'triangle') return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={color} /></svg>
    if (shape === 'diamond') return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${s - 1},${half} ${half},${s - 1} 1,${half}`} fill={color} /></svg>
    if (shape === 'star') return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${half + s * 0.15},${half - s * 0.1} ${s - 1},${half - s * 0.1} ${half + s * 0.2},${half + s * 0.05} ${half + s * 0.35},${s - 1} ${half},${half + s * 0.25} ${half - s * 0.35},${s - 1} ${half - s * 0.2},${half + s * 0.05} 1,${half - s * 0.1} ${half - s * 0.15},${half - s * 0.1}`} fill={color} /></svg>
    if (shape === 'heart') return <svg width={s} height={s} className={className} viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} /></svg>
    if (shape === 'hexagon') return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${s - 1},${half * 0.5} ${s - 1},${half * 1.5} ${half},${s - 1} 1,${half * 1.5} 1,${half * 0.5}`} fill={color} /></svg>
    return <svg width={s} height={s} className={className} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 1} fill={color} /></svg>
  }

  // Render shape with text inside
  // For triangle/heart/star, offset the text down a bit since the center is lower
  const textOffsetY = (shape === 'triangle' || shape === 'heart' || shape === 'star')
    ? half * 0.2
    : 0

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      {/* Shape layer */}
      <div className="absolute inset-0">
        {shape === 'circle' && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 1} fill={color} /></svg>}
        {shape === 'square' && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={1} y={1} width={s - 2} height={s - 2} fill={color} rx={1} /></svg>}
        {shape === 'triangle' && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={color} /></svg>}
        {shape === 'diamond' && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${s - 1},${half} ${half},${s - 1} 1,${half}`} fill={color} /></svg>}
        {shape === 'star' && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${half + s * 0.15},${half - s * 0.1} ${s - 1},${half - s * 0.1} ${half + s * 0.2},${half + s * 0.05} ${half + s * 0.35},${s - 1} ${half},${half + s * 0.25} ${half - s * 0.35},${s - 1} ${half - s * 0.2},${half + s * 0.05} 1,${half - s * 0.1} ${half - s * 0.15},${half - s * 0.1}`} fill={color} /></svg>}
        {shape === 'heart' && <svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} /></svg>}
        {shape === 'hexagon' && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},1 ${s - 1},${half * 0.5} ${s - 1},${half * 1.5} ${half},${s - 1} 1,${half * 1.5} 1,${half * 0.5}`} fill={color} /></svg>}
        {!['circle','square','triangle','diamond','star','heart','hexagon'].includes(shape) && <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - 1} fill={color} /></svg>}
      </div>
      {/* Text layer */}
      <span
        className="absolute inset-0 flex items-center justify-center font-bold leading-none select-none"
        style={{
          fontSize: `${fontSize}px`,
          color: textColor,
          transform: `translateY(${textOffsetY}px)`,
        }}
      >
        {symbol.slice(0, 2)}
      </span>
    </div>
  )
}

/**
 * Determine if a hex color is light (needs dark text) or dark (needs light text)
 */
function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  // Luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6
}

export const SHAPE_OPTIONS = [
  { value: 'circle', label: '圆形' },
  { value: 'square', label: '方形' },
  { value: 'triangle', label: '三角形' },
  { value: 'diamond', label: '菱形' },
  { value: 'star', label: '星形' },
  { value: 'heart', label: '心形' },
  { value: 'hexagon', label: '六边形' },
]
