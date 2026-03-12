'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface ServiceProvider {
    id: string
    headline: string
    bio: string
    location_city: string
    is_verified: boolean
    rating: number
    review_count: number
    profiles: { id: string; full_name: string; avatar_url: string | null } | null
    services: { service_type: string; price_amount: number; price_unit: string }[]
}

const SERVICE_CATEGORIES = [
    { type: 'Walker', icon: '🐕', label: 'Paseadores', color: '#F59E0B' },
    { type: 'Sitter', icon: '🏠', label: 'Cuidadores', color: '#8B5CF6' },
    { type: 'Trainer', icon: '🎓', label: 'Adiestradores', color: '#00D4FF' },
    { type: 'Groomer', icon: '✂️', label: 'Peluqueros', color: '#EC4899' },
    { type: 'Vet', icon: '🩺', label: 'Veterinarios', color: '#10B981' },
]

const DEMO_AVATARS: Record<string, string> = {
    'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa': '👨‍🦱',
    'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa': '👩',
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa': '👩‍🦰',
    'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa': '👩‍🦳',
    'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa': '🧔',
    'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa': '👨‍🦲',
}

function Stars({ rating }: { rating: number }) {
    return (
        <span style={{ fontSize: '0.78rem', color: '#F59E0B', letterSpacing: 1 }}>
            {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
        </span>
    )
}

export default function ServicesClient() {
    const supabase = createClient()
    const router = useRouter()
    const [providers, setProviders] = useState<ServiceProvider[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    useEffect(() => { fetchProviders() }, [activeCategory])

    const fetchProviders = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('service_providers')
            .select('*, profiles:user_id(id, full_name, avatar_url), services(service_type, price_amount, price_unit)')

        let list = (data as ServiceProvider[]) || []
        if (activeCategory) {
            list = list.filter(p => p.services.some(s => s.service_type === activeCategory))
        }
        setProviders(list)
        setLoading(false)
    }

    const filtered = providers.filter(p => {
        const name = p.profiles?.full_name || 'Demo'
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.location_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.headline.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })

    const getMinPrice = (p: ServiceProvider) => {
        if (!p.services.length) return null
        return Math.min(...p.services.map(s => s.price_amount))
    }

    const getCategories = (p: ServiceProvider) => [...new Set(p.services.map(s => s.service_type))]

    return (
        <div className="min-h-screen bg-dark-bg text-white">
            <Sidebar />

            <main className="dashboard-main">
                <PageHeader
                    title="Servicios para tu Mascota"
                    emoji="🐾"
                    subtitle="Paseadores, cuidadores, adiestradores y más — todos verificados por PetNexa"
                    action={
                        <Link href="/dashboard/services/new" className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white font-outfit font-bold text-[0.88rem] no-underline shadow-lg shadow-[#6C3FF5]/30 hover:shadow-[#6C3FF5]/50 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                            <span>➕ Ofrecer mis servicios</span>
                        </Link>
                    }
                />

                {/* Map Integration Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Link href="/dashboard/map" className="block group">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/20 to-cyan-500/20 border border-white/10 p-6 backdrop-blur-xl tap-bounce">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl shadow-inner">
                                    📍
                                </div>
                                <div>
                                    <h3 className="text-xl font-outfit font-bold text-white mb-1">Mapa Pet-Friendly</h3>
                                    <p className="text-white/60 text-sm">Encuentra parques, veterinarios y cafeterías cerca de ti.</p>
                                </div>
                                <div className="ml-auto w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <ChevronRight size={20} className="text-white/40" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 20 }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Busca por nombre, ciudad o especialidad..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '13px 16px 13px 44px',
                            borderRadius: 14, background: 'rgba(18,18,32,0.85)',
                            border: '1px solid rgba(108,63,245,0.2)',
                            color: '#F8F8FF', fontSize: '0.92rem', outline: 'none',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    />
                </div>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveCategory(null)} style={{
                        padding: '8px 18px', borderRadius: 100, border: '1px solid',
                        borderColor: !activeCategory ? '#6C3FF5' : 'rgba(108,63,245,0.18)',
                        background: !activeCategory ? 'rgba(108,63,245,0.18)' : 'transparent',
                        color: !activeCategory ? '#fff' : 'rgba(248,248,255,0.5)',
                        fontWeight: !activeCategory ? 700 : 400,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', transition: 'all 0.2s',
                    }}>Todos</button>
                    {SERVICE_CATEGORIES.map(cat => {
                        const active = activeCategory === cat.type
                        return (
                            <button key={cat.type} onClick={() => setActiveCategory(cat.type)} style={{
                                padding: '8px 18px', borderRadius: 100, border: '1px solid',
                                borderColor: active ? cat.color : 'rgba(108,63,245,0.18)',
                                background: active ? `${cat.color}18` : 'transparent',
                                color: active ? cat.color : 'rgba(248,248,255,0.5)',
                                fontWeight: active ? 700 : 400,
                                cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                {cat.icon} {cat.label}
                            </button>
                        )
                    })}
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 20 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: 260, borderRadius: 20, background: 'rgba(13,13,25,0.7)', border: '1px solid rgba(108,63,245,0.08)', animation: 'pulse 1.8s ease-in-out infinite', opacity: 0.5 }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(108,63,245,0.07) 0%, rgba(0,212,255,0.03) 100%)',
                        border: '1px dashed rgba(108,63,245,0.2)', borderRadius: 24,
                        padding: '72px 48px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 70, marginBottom: 20 }}>🐾</div>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.4rem', marginBottom: 10 }}>
                            ¡Sé el primero en ofrecer servicios!
                        </h2>
                        <p style={{ color: 'rgba(248,248,255,0.4)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.7 }}>
                            Aún no hay profesionales en esta categoría. Si eres paseador, cuidador o adiestrador, únete ahora.
                        </p>
                        <Link href="/dashboard/services/new" style={{
                            padding: '13px 32px', borderRadius: 13,
                            background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                            color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                            textDecoration: 'none', fontSize: '0.92rem',
                            boxShadow: '0 6px 24px rgba(108,63,245,0.4)', display: 'inline-block',
                        }}>
                            ➕ Registrarme como profesional
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 22 }}>
                        {filtered.map(p => {
                            const minPrice = getMinPrice(p)
                            const cats = getCategories(p)
                            const avatar = DEMO_AVATARS[p.id]
                            const name = p.profiles?.full_name || 'Profesional PetNexa'

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => router.push(`/dashboard/services/${p.id}`)}
                                    style={{
                                        background: 'rgba(13,13,25,0.82)', backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(108,63,245,0.12)', borderRadius: 22,
                                        padding: '24px', cursor: 'pointer', transition: 'all 0.25s',
                                        position: 'relative', overflow: 'hidden',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-4px)'
                                        e.currentTarget.style.borderColor = 'rgba(108,63,245,0.36)'
                                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(108,63,245,0.15)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.borderColor = 'rgba(108,63,245,0.12)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    {p.is_verified && (
                                        <div style={{
                                            position: 'absolute', top: 16, right: 16,
                                            background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)',
                                            borderRadius: 100, padding: '3px 10px',
                                            fontSize: '0.72rem', color: '#00D4FF', fontWeight: 700,
                                        }}>✓ Verificado</div>
                                    )}

                                    {/* Avatar + name row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                        <div style={{
                                            width: 58, height: 58, borderRadius: 16, flexShrink: 0,
                                            background: p.profiles?.avatar_url
                                                ? `url(${p.profiles.avatar_url}) center/cover`
                                                : 'linear-gradient(135deg, rgba(108,63,245,0.3), rgba(0,212,255,0.2))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 28, border: '1px solid rgba(108,63,245,0.2)',
                                        }}>
                                            {!p.profiles?.avatar_url && avatar}
                                        </div>
                                        <div>
                                            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', marginBottom: 2 }}>{name}</div>
                                            <div style={{ color: 'rgba(248,248,255,0.4)', fontSize: '0.8rem' }}>📍 {p.location_city}</div>
                                        </div>
                                    </div>

                                    {/* Headline */}
                                    <p style={{ fontSize: '0.88rem', color: '#A78BFA', fontWeight: 600, marginBottom: 8 }}>{p.headline}</p>
                                    <p style={{
                                        fontSize: '0.83rem', color: 'rgba(248,248,255,0.5)', lineHeight: 1.55, marginBottom: 16,
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>{p.bio}</p>

                                    {/* Rating */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                                        <Stars rating={p.rating} />
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8F8FF' }}>{p.rating}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(248,248,255,0.3)' }}>({p.review_count} reseñas)</span>
                                    </div>

                                    {/* Category badges + price */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTop: '1px solid rgba(108,63,245,0.1)' }}>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {cats.slice(0, 3).map(ct => {
                                                const cat = SERVICE_CATEGORIES.find(c => c.type === ct)
                                                return cat ? (
                                                    <span key={ct} style={{
                                                        fontSize: '0.72rem', fontWeight: 600,
                                                        background: `${cat.color}14`,
                                                        border: `1px solid ${cat.color}30`,
                                                        color: cat.color, padding: '3px 9px', borderRadius: 100,
                                                    }}>{cat.icon} {cat.label}</span>
                                                ) : null
                                            })}
                                        </div>
                                        {minPrice !== null && (
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(248,248,255,0.35)' }}>desde</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00D4FF' }}>{minPrice}€</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
