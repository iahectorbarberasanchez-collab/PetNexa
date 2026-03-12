'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import Link from 'next/link'

interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, 'ref'> {
    children: ReactNode
    variant?: 'primary' | 'ghost' | 'danger'
    icon?: ReactNode
    href?: string
}

export function PremiumButton({
    children,
    variant = 'primary',
    icon,
    href,
    className = '',
    ...props
}: PremiumButtonProps) {
    const baseClass = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-ghost'

    const content = (
        <>
            {icon && <span style={{ display: 'inline-flex', fontSize: '1.2em' }}>{icon}</span>}
            {children}
        </>
    )

    if (href) {
        return (
            <Link href={href} className={`${baseClass} ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {content}
            </Link>
        )
    }

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`${baseClass} tap-bounce ${className}`}
            {...props}
        >
            {content}
        </motion.button>
    )
}
