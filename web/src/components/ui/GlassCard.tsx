'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    delay?: number
}

export function GlassCard({ children, className = '', hover = true, delay = 0 }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`glass-card premium-card ${className} ${!hover ? 'no-hover' : ''}`}
        >
            {children}
        </motion.div>
    )
}
