'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const menuCategories = [
    {
        title: 'Principal',
        items: [
            { icon: '🏠', label: 'Inicio', href: '/dashboard' },
            { icon: '🐾', label: 'Mis Mascotas', href: '/dashboard/pets' },
            { icon: '🤖', label: 'PetBot', href: '/dashboard/petbot' },
        ]
    },
    {
        title: 'Gestión',
        items: [
            { icon: '💉', label: 'Cartilla', href: '/dashboard/health' },
            { icon: '🦮', label: 'Paseos', href: '/dashboard/walks' },
            { icon: '🗺️', label: 'Mapa', href: '/dashboard/map' },
        ]
    },
    {
        title: 'Comunidad',
        items: [
            { icon: '📸', label: 'Social', href: '/dashboard/social' },
            { icon: '👥', label: 'Amigos', href: '/dashboard/friends' },
            { icon: '🚨', label: 'Alertas', href: '/dashboard/alerts' },
            { icon: '💞', label: 'Peludos', href: '/dashboard/match' },
        ]
    },
    {
        title: 'Servicios',
        items: [
            { icon: '🛍️', label: 'Tienda', href: '/dashboard/shop' },
            { icon: '🤝', label: 'Servicios', href: '/dashboard/services' },
            { icon: '📝', label: 'Blog', href: '/blog' },
        ]
    },
    {
        title: 'Otros',
        items: [
            { icon: '⚙️', label: 'Ajustes', href: '/dashboard/settings' },
        ]
    }
]

export default function Sidebar() {
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()

    const [petCoins, setPetCoins] = useState<number | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) {
                const { data } = await supabase.from('profiles').select('pet_coins').eq('id', user.id).single()
                if (data && data.pet_coins !== undefined) {
                    setPetCoins(data.pet_coins)
                }
            }
        })
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <aside className="sidebar-desktop" style={{
            width: 260, flexShrink: 0,
            background: 'rgba(8, 8, 18, 0.98)',
            borderRight: '1px solid rgba(108, 63, 245, 0.15)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            display: 'flex', flexDirection: 'column',
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
        }}>
            {/* Logo */}
            <div style={{ padding: '26px 22px', borderBottom: '1px solid rgba(108,63,245,0.12)' }}>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 13,
                        background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, boxShadow: '0 4px 20px rgba(108,63,245,0.4)',
                    }}>🐾</div>
                    <div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.15rem', lineHeight: 1 }}>
                            <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                PetNexa
                            </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(248,248,255,0.35)', marginTop: 2 }}>v1.0 Beta</div>
                    </div>
                </Link>

                {petCoins !== null && (
                    <Link href="/dashboard/petcoins" style={{ textDecoration: 'none' }}>
                        <div className="hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(255,215,0,0.2)] transition-all duration-200" style={{
                            marginTop: 16,
                            padding: '8px 12px',
                            background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#FFD700',
                            fontFamily: 'Outfit, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            boxShadow: '0 2px 10px rgba(255, 215, 0, 0.1)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="text-[1.1rem] hover:scale-110 transition-transform duration-200">🪙</span>
                                <span>{petCoins.toLocaleString()}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8, background: 'rgba(255,215,0,0.2)', padding: '2px 6px', borderRadius: '6px' }}>
                                PetCoins
                            </span>
                        </div>
                    </Link>
                )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
                {menuCategories.map((category) => (
                    <div key={category.title} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <h3 style={{
                            paddingLeft: 14,
                            marginBottom: 4,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'rgba(248,248,255,0.25)',
                            fontFamily: 'Outfit, sans-serif'
                        }}>
                            {category.title}
                        </h3>
                        {category.items.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                            return (
                                <Link key={item.label} href={item.href}
                                    className={`group ${!isActive ? 'hover:bg-white/5 hover:text-white' : ''}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px',
                                        borderRadius: 11, textDecoration: 'none',
                                        fontSize: '0.88rem', fontWeight: isActive ? 600 : 500,
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.2s ease',
                                        background: isActive ? 'rgba(108,63,245,0.18)' : 'transparent',
                                        color: isActive ? '#A78BFA' : 'rgba(248,248,255,0.55)',
                                        border: isActive ? '1px solid rgba(108,63,245,0.3)' : '1px solid transparent',
                                        boxShadow: isActive ? '0 0 16px rgba(108,63,245,0.12)' : 'none',
                                    }}>
                                    <span
                                        className="text-[17px] shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6"
                                    >
                                        {item.icon}
                                    </span>
                                    {item.label}
                                    {isActive && (
                                        <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', boxShadow: '0 0 6px #6C3FF5' }} />
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(108,63,245,0.12)' }}>
                <button
                    onClick={handleLogout}
                    className="w-full p-[10px] rounded-[11px] bg-transparent border border-[rgba(108,63,245,0.2)] text-[rgba(248,248,255,0.45)] font-outfit font-semibold text-[0.84rem] cursor-pointer transition-all duration-200 flex items-center justify-center gap-[7px] hover:bg-[rgba(255,80,80,0.08)] hover:border-[rgba(255,80,80,0.25)] hover:text-[#FF6B6B] hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span>🚪</span> Cerrar sesión
                </button>
            </div>
        </aside>
    )
}
