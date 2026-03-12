'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    emoji?: string
    action?: ReactNode
}

export function PageHeader({ title, subtitle, emoji, action }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4 flex-wrap">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
            >
                <h1 className="flex items-center gap-3 font-outfit text-3xl md:text-4xl font-extrabold text-white">
                    {title} {emoji && <span>{emoji}</span>}
                </h1>
                {subtitle && (
                    <p className="text-white/40 text-base mt-2 max-w-2xl leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </motion.div>
            {action && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="shrink-0"
                >
                    {action}
                </motion.div>
            )}
        </div>
    )
}
