'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface StatCardProps {
    icon: ReactNode
    label: string
    value: string
    color: string
    href: string
    delay?: number
}

export function StatCard({ icon, label, value, color, href, delay = 0 }: StatCardProps) {
    return (
        <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.96 }}
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = `${color}40`
                    el.style.boxShadow = `0 4px 20px ${color}12`
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'rgba(255,255,255,0.06)'
                    el.style.boxShadow = 'none'
                }}
            >
                {/* Icon */}
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: `${color}14`,
                    color: color,
                    border: `1px solid ${color}22`,
                    fontSize: '1.2rem',
                }}>
                    {icon}
                </div>
                {/* Text */}
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        lineHeight: 1,
                        marginBottom: 5,
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {label}
                    </div>
                    <div style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        lineHeight: 1,
                    }}>
                        {value}
                    </div>
                </div>
            </motion.div>
        </Link>
    )
}
