'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

interface ProviderDetail {
    id: string
    headline: string
    bio: string
    location_city: string
    phone: string | null
    is_verified: boolean
    rating: number
    review_count: number
    profiles: { id: string; full_name: string; avatar_url: string | null } | null
    services: { id: string; service_type: string; price_amount: number; price_unit: string; description: string | null }[]
}

const SERVICE_CATEGORIES: Record<string, { icon: string; label: string; color: string }> = {
    Walker: { icon: '🐕', label: 'Paseos', color: '#F59E0B' },
    Sitter: { icon: '🏠', label: 'Cuidados', color: '#8B5CF6' },
    Trainer: { icon: '🎓', label: 'Adiestramiento', color: '#00D4FF' },
    Groomer: { icon: '✂️', label: 'Peluquería', color: '#EC4899' },
    Vet: { icon: '🩺', label: 'Veterinaria', color: '#10B981' },
    Other: { icon: '⭐', label: 'Otro', color: '#6C3FF5' },
}

const PRICE_UNIT_LABEL: Record<string, string> = {
    'Per Hour': '/ hora',
    'Per Day': '/ día',
    'Per Visit': '/ visita',
    'Per Session': '/ sesión',
}

const DEMO_AVATARS: Record<string, string> = {
    'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa': '👨‍🦱',
    'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa': '👩',
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa': '👩‍🦰',
    'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa': '👩‍🦳',
    'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa': '🧔',
    'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa': '👨‍🦲',
}

function Stars({ rating }: { rating: number }) {
    return <span style={{ color: '#F59E0B', letterSpacing: 1 }}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
}

export default function ProviderDetailClient({ initialProvider }: { initialProvider: ProviderDetail }) {
    const [provider] = useState<ProviderDetail>(initialProvider)
    const [modal, setModal] = useState<{ open: boolean; service: ProviderDetail['services'][0] | null }>({ open: false, service: null })
    const [bookingDate, setBookingDate] = useState('')
    const [bookingNotes, setBookingNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!modal.service || !provider) return
        setSubmitting(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSubmitting(false); return }
        await supabase.from('service_bookings').insert({
            client_id: user.id,
            provider_id: provider.id,
            service_id: modal.service.id,
            status: 'Pending',
            booking_date: bookingDate ? new Date(bookingDate).toISOString() : null,
            notes: bookingNotes || null,
        })
        setSuccess(true)
        setSubmitting(false)
        setTimeout(() => { setModal({ open: false, service: null }); setSuccess(false); setBookingDate(''); setBookingNotes('') }, 2800)
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box', padding: '12px 14px',
        borderRadius: 11, background: 'rgba(18,18,32,0.9)',
        border: '1px solid rgba(108,63,245,0.2)', color: '#F8F8FF',
        fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif',
    }

    const name = provider.profiles?.full_name || 'Profesional PetNexa'
    const avatar = DEMO_AVATARS[provider.id]
    const cats = [...new Set(provider.services.map(s => s.service_type))]

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07070F', color: '#F8F8FF' }}>
            <Sidebar />

            <main className="dashboard-main" style={{ overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: '0.85rem' }}>
                    <Link href="/dashboard" style={{ color: 'rgba(248,248,255,0.3)', textDecoration: 'none' }}>Dashboard</Link>
                    <span style={{ color: 'rgba(248,248,255,0.2)' }}>›</span>
                    <Link href="/dashboard/services" style={{ color: 'rgba(248,248,255,0.3)', textDecoration: 'none' }}>Servicios</Link>
                    <span style={{ color: 'rgba(248,248,255,0.2)' }}>›</span>
                    <span style={{ color: 'rgba(248,248,255,0.6)' }}>{name}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 28, alignItems: 'start' }}>
                    <div style={{
                        background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(108,63,245,0.15)', borderRadius: 24, padding: '36px',
                        position: 'sticky', top: 24,
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{
                                width: 110, height: 110, borderRadius: 24,
                                margin: '0 auto 16px',
                                background: provider.profiles?.avatar_url
                                    ? `url(${provider.profiles.avatar_url}) center/cover`
                                    : 'linear-gradient(135deg, rgba(108,63,245,0.35), rgba(0,212,255,0.25))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 52, border: '2px solid rgba(108,63,245,0.25)',
                                boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
                            }}>
                                {!provider.profiles?.avatar_url && avatar}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{name}</h1>
                                {provider.is_verified && (
                                    <span style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 100, padding: '2px 8px', fontSize: '0.7rem', color: '#00D4FF', fontWeight: 700 }}>✓ Verificado</span>
                                )}
                            </div>
                            <p style={{ color: 'rgba(248,248,255,0.45)', fontSize: '0.85rem', marginBottom: 12 }}>📍 {provider.location_city}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Stars rating={provider.rating} />
                                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{provider.rating}</span>
                                <span style={{ color: 'rgba(248,248,255,0.35)', fontSize: '0.78rem' }}>({provider.review_count})</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(108,63,245,0.1)', border: '1px solid rgba(108,63,245,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 20, textAlign: 'center' }}>
                            <p style={{ color: '#A78BFA', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{provider.headline}</p>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                            {cats.map(ct => {
                                const cat = SERVICE_CATEGORIES[ct] || SERVICE_CATEGORIES['Other']
                                return (
                                    <span key={ct} style={{ fontSize: '0.75rem', fontWeight: 600, background: `${cat.color}14`, border: `1px solid ${cat.color}30`, color: cat.color, padding: '4px 10px', borderRadius: 100 }}>
                                        {cat.icon} {cat.label}
                                    </span>
                                )
                            })}
                        </div>

                        <div>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(248,248,255,0.4)', letterSpacing: '0.05em', marginBottom: 10 }}>SOBRE MÍ</h3>
                            <p style={{ fontSize: '0.88rem', color: 'rgba(248,248,255,0.65)', lineHeight: 1.7 }}>{provider.bio}</p>
                        </div>

                        <div style={{ marginTop: 24, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                            <p style={{ fontSize: '0.78rem', color: 'rgba(0,212,255,0.7)', margin: 0, lineHeight: 1.6 }}>
                                🛡️ <strong>Pagos seguros PetNexa:</strong> Tu dinero está protegido hasta que el servicio se complete.
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.3rem', marginBottom: 20 }}>Servicios y Tarifas</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {provider.services.map(svc => {
                                const cat = SERVICE_CATEGORIES[svc.service_type] || SERVICE_CATEGORIES['Other']
                                const unit = PRICE_UNIT_LABEL[svc.price_unit] || svc.price_unit
                                return (
                                    <div key={svc.id} style={{
                                        background: 'rgba(13,13,25,0.82)', backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(108,63,245,0.13)', borderRadius: 18, padding: '22px 24px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                                        transition: 'border-color 0.2s',
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,63,245,0.3)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(108,63,245,0.13)'}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                                                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem' }}>
                                                    {cat.label}
                                                </span>
                                            </div>
                                            {svc.description && (
                                                <p style={{ fontSize: '0.83rem', color: 'rgba(248,248,255,0.5)', margin: 0 }}>{svc.description}</p>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00D4FF', lineHeight: 1.1 }}>{svc.price_amount}€</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(248,248,255,0.35)', marginBottom: 10 }}>{unit}</div>
                                            <button
                                                onClick={() => setModal({ open: true, service: svc })}
                                                style={{
                                                    padding: '9px 20px', borderRadius: 11, border: 'none',
                                                    background: `linear-gradient(135deg, ${cat.color}, #6C3FF5)`,
                                                    color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                                    fontSize: '0.85rem', cursor: 'pointer',
                                                    boxShadow: `0 4px 16px ${cat.color}30`, transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                Contratar
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </main>

            {modal.open && modal.service && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(12px)', padding: 20,
                }}>
                    <div style={{
                        background: '#0D0D19', borderRadius: 24,
                        border: '1px solid rgba(108,63,245,0.3)',
                        width: '100%', maxWidth: 440, padding: '40px',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                    }}>
                        {success ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
                                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.4rem', marginBottom: 10 }}>¡Solicitud enviada!</h2>
                                <p style={{ color: 'rgba(248,248,255,0.6)', lineHeight: 1.6 }}>
                                    {name} recibirá tu reserva y te confirmará en breve por PetNexa.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>Reservar Servicio</h2>
                                    <button onClick={() => setModal({ open: false, service: null })} style={{ background: 'none', border: 'none', color: 'rgba(248,248,255,0.4)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                                </div>
                                <p style={{ fontSize: '0.88rem', color: 'rgba(248,248,255,0.55)', marginBottom: 24 }}>
                                    Solicitando <strong style={{ color: '#A78BFA' }}>{SERVICE_CATEGORIES[modal.service.service_type]?.label || 'Servicio'}</strong> con <strong>{name}</strong> · <span style={{ color: '#00D4FF' }}>{modal.service.price_amount}€ {PRICE_UNIT_LABEL[modal.service.price_unit] || modal.service.price_unit}</span>
                                </p>
                                <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(248,248,255,0.45)', marginBottom: 8, letterSpacing: '0.04em' }}>FECHA DEL SERVICIO</label>
                                        <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} min={new Date().toISOString().split('T')[0]} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(248,248,255,0.45)', marginBottom: 8, letterSpacing: '0.04em' }}>NOTAS <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                                        <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Raza de tu mascota, horario preferido, necesidades especiales..." style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} />
                                    </div>
                                    <button type="submit" disabled={submitting} style={{
                                        padding: '13px', borderRadius: 12, border: 'none',
                                        background: submitting ? 'rgba(108,63,245,0.3)' : 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                        color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                        fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: submitting ? 'none' : '0 6px 24px rgba(108,63,245,0.4)',
                                    }}>
                                        {submitting ? '⏳ Enviando...' : '✅ Confirmar Reserva'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
