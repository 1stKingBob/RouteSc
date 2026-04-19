'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glowColor?: 'blue' | 'teal' | 'purple' | 'green' | 'amber' | 'red' | 'none'
  hover?: boolean
  onClick?: () => void
  delay?: number
  animateIn?: boolean
}

const glowClasses = {
  blue: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
  teal: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
  purple: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
  green: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
  amber: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
  red: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]',
  none: '',
}

export function GlassCard({
  children,
  className,
  glowColor = 'blue',
  hover = true,
  onClick,
  delay = 0,
  animateIn = true,
}: GlassCardProps) {
  const Component = animateIn ? motion.div : 'div'

  const motionProps = animateIn
    ? {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-50px' },
        transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] },
        whileHover: hover ? { scale: 1.01, transition: { duration: 0.2 } } : undefined,
        whileTap: onClick ? { scale: 0.99 } : undefined,
      }
    : {}

  return (
    <Component
      {...(motionProps as object)}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl border',
        'bg-white/[0.04] backdrop-blur-xl',
        'border-white/[0.08]',
        'shadow-[0_4px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]',
        'transition-all duration-300',
        hover && glowClasses[glowColor],
        hover && 'hover:border-white/[0.12] hover:bg-white/[0.06]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </Component>
  )
}
