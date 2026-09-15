import React from 'react'

function Ring({ size = 88, stroke = 12, progress = 0, color = '#ff3b30' }: { size?: number; stroke?: number; progress?: number; color?: string }) {
  const radius = (size - stroke) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * Math.max(0, Math.min(1, progress))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={center} cy={center} r={radius} stroke="#eef2ff" strokeWidth={stroke} fill="none" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  )
}

export default function ActivityRings({ move = 0.6, exercise = 0.5, stand = 0.8 }: { move?: number; exercise?: number; stand?: number }) {
  return (
    <div className="rings">
      <div className="ring-item">
        <Ring size={120} stroke={14} progress={move} color="#ff3b30" />
        <div className="ring-label">Move</div>
      </div>
      <div className="ring-item">
        <Ring size={88} stroke={12} progress={exercise} color="#ff8c00" />
        <div className="ring-label">Exercise</div>
      </div>
      <div className="ring-item">
        <Ring size={56} stroke={10} progress={stand} color="#34c759" />
        <div className="ring-label">Stand</div>
      </div>
    </div>
  )
}
