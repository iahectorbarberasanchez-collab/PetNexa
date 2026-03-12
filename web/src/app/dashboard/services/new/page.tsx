'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const SERVICE_TYPES = [
    { value: 'Walker', icon: '🐕', label: 'Paseador', color: '#F59E0B' },
    { value: 'Sitter', icon: '🏠', label: 'Cuidador/a', color: '#8B5CF6' },
    { value: 'Trainer', icon: '🎓', label: 'Adiestrador/a', color: '#00D4FF' },
    { value: 'Groomer', icon: '✂️', label: 'Peluquero/a', color: '#EC4899' },
    { value: 'Vet', icon: '🩺', label: 'Veterinario/a', color: '#10B981' },
    { value: 'Other', icon: '⭐', label: 'Otro', color: '#6C3FF5' },
]

const PRICE_UNITS = [
    { value: 'Per Hour', label: 'Por hora' },
    { value: 'Per Day', label: 'Por día' },
    { value: 'Per Visit', label: 'Por visita' },
    { value: 'Per Session', label: 'Por sesión' },
]

interface ServiceEntry {
    service_type: string
    price_amount: string
    price_unit: string
    description: string
}

export default function NewProviderPage() {
    const supabase = createClient()
    const router = useRouter()

    const [headline, setHeadline] = useState('')
    const [bio, setBio] = useState('')
    const [city, setCity] = useState('')
    const [phone, setPhone] = useState('')
    const [services, setServices] = useState<ServiceEntry[]>([
        { service_type: 'Walker', price_amount: '', price_unit: 'Per Hour', description: '' }
    ])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const addService = () => setServices(prev => [...prev, { service_type: 'Walker', price_amount: '', price_unit: 'Per Hour', description: '' }])
    const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i))
    const updateService = (i: number, key: keyof ServiceEntry, val: string) =>
        setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!headline.trim() || !city.trim()) { setError('Completa al menos el titular y la ciudad.'); return }
        if (services.some(s => !s.price_amount || isNaN(parseFloat(s.price_amount)))) {
            setError('Todos los servicios deben tener un precio válido.'); return
        }
        setLoading(true); setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth'); return }

        const { data: prov, error: provErr } = await supabase.from('service_providers').insert({
            user_id: user.id,
            headline: headline.trim(),
            bio: bio.trim() || null,
            location_city: city.trim(),
            phone: phone.trim() || null,
            is_verified: false,
            rating: 5.0,
            review_count: 0,
        }).select().single()

        if (provErr || !prov) { setError(provErr?.message || 'Error al crear tu perfil.'); setLoading(false); return }

        const svcRows = services.map(s => ({
            provider_id: prov.id,
            service_type: s.service_type,
            price_amount: parseFloat(s.price_amount),
            price_unit: s.price_unit,
            description: s.description.trim() || null,
        }))

        const { error: svcErr } = await supabase.from('services').insert(svcRows)
        if (svcErr) { setError(svcErr.message); setLoading(false); return }

        router.push(`/dashboard/services/${prov.id}`)
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box', padding: '12px 14px',
        borderRadius: 11, background: 'rgba(18,18,32,0.9)',
        border: '1px solid rgba(108,63,245,0.18)', color: '#F8F8FF',
        fontSize: '0.92rem', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
    }
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.78rem', fontWeight: 700,
        color: 'rgba(248,248,255,0.4)', marginBottom: 7, letterSpacing: '0.04em',
    }
    const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = '#6C3FF5'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.12)'
    }
    const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'rgba(108,63,245,0.18)'
        e.currentTarget.style.boxShadow = 'none'
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07070F', color: '#F8F8FF' }}>
            <Sidebar />

            <main className="dashboard-main" style={{ overflowY: 'auto', position: 'relative' }}>
                {/* Premium background */}
                <div className="noise-overlay" />
                <div className="orb w-[500px] h-[500px] -top-20 -right-20 bg-[radial-gradient(circle,rgba(108,63,245,0.07)_0%,transparent_70%)]" />
                <div className="orb w-[400px] h-[400px] bottom-0 -left-20 bg-[radial-gradient(circle,rgba(0,212,255,0.04)_0%,transparent_70%)]" />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: '0.85rem' }}>
                        <Link href="/dashboard" style={{ color: 'rgba(248,248,255,0.3)', textDecoration: 'none' }}>Dashboard</Link>
                        <span style={{ color: 'rgba(248,248,255,0.2)' }}>›</span>
                        <Link href="/dashboard/services" style={{ color: 'rgba(248,248,255,0.3)', textDecoration: 'none' }}>Servicios</Link>
                        <span style={{ color: 'rgba(248,248,255,0.2)' }}>›</span>
                        <span style={{ color: 'rgba(248,248,255,0.6)' }}>Nuevo Profesional</span>
                    </div>

                    <div style={{ maxWidth: 700 }}>
                        <div style={{ marginBottom: 36 }}>
                            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.9rem', fontWeight: 800, marginBottom: 8 }}>
                                Conviértete en Profesional 🌟
                            </h1>
                            <p style={{ color: 'rgba(248,248,255,0.4)', lineHeight: 1.65 }}>
                                Crea tu perfil y llega a miles de dueños de mascotas en tu ciudad. Es gratis para empezar.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Profile card */}
                            <div style={{
                                background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(108,63,245,0.15)', borderRadius: 22,
                                padding: '34px', display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 20,
                            }}>
                                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'rgba(248,248,255,0.6)', margin: 0, letterSpacing: '0.03em' }}>
                                    👤 PERFIL PROFESIONAL
                                </h2>

                                <div>
                                    <label style={labelStyle}>TITULAR *</label>
                                    <input style={inputStyle} type="text" placeholder="Ej: Paseadora profesional con 5 años de experiencia" value={headline} onChange={e => setHeadline(e.target.value)} required maxLength={100} onFocus={focus} onBlur={blur} />
                                </div>

                                <div>
                                    <label style={labelStyle}>DESCRIPCIÓN <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                                    <textarea
                                        style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
                                        placeholder="Cuéntales a los dueños quién eres, tu experiencia y qué hace especiales tus servicios..."
                                        value={bio} onChange={e => setBio(e.target.value)} maxLength={600}
                                        onFocus={focus} onBlur={blur}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>CIUDAD *</label>
                                        <input style={inputStyle} type="text" placeholder="Ej: Barcelona" value={city} onChange={e => setCity(e.target.value)} required maxLength={60} onFocus={focus} onBlur={blur} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>TELÉFONO <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                                        <input style={inputStyle} type="tel" placeholder="Ej: 612 345 678" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} onFocus={focus} onBlur={blur} />
                                    </div>
                                </div>
                            </div>

                            {/* Services card */}
                            <div style={{
                                background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(108,63,245,0.15)', borderRadius: 22,
                                padding: '34px', display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 20,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'rgba(248,248,255,0.6)', margin: 0, letterSpacing: '0.03em' }}>
                                        💼 MIS SERVICIOS Y TARIFAS
                                    </h2>
                                    <button type="button" onClick={addService} style={{
                                        padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(108,63,245,0.3)',
                                        background: 'rgba(108,63,245,0.1)', color: '#A78BFA',
                                        fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s',
                                    }}>+ Añadir servicio</button>
                                </div>

                                {services.map((svc, i) => {
                                    const selectedType = SERVICE_TYPES.find(t => t.value === svc.service_type)
                                    return (
                                        <div key={i} style={{
                                            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(108,63,245,0.1)',
                                            borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
                                        }}>
                                            {/* Type selector */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={labelStyle}>TIPO DE SERVICIO</label>
                                                {services.length > 1 && (
                                                    <button type="button" onClick={() => removeService(i)} style={{ background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>✕ Eliminar</button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {SERVICE_TYPES.map(t => {
                                                    const sel = svc.service_type === t.value
                                                    return (
                                                        <button key={t.value} type="button" onClick={() => updateService(i, 'service_type', t.value)} style={{
                                                            padding: '7px 14px', borderRadius: 100, border: '1px solid',
                                                            borderColor: sel ? t.color : 'rgba(108,63,245,0.15)',
                                                            background: sel ? `${t.color}18` : 'transparent',
                                                            color: sel ? t.color : 'rgba(248,248,255,0.45)',
                                                            fontWeight: sel ? 700 : 400,
                                                            fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', cursor: 'pointer',
                                                            transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 5,
                                                        }}>
                                                            {t.icon} {t.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div>
                                                    <label style={labelStyle}>PRECIO (€)</label>
                                                    <input
                                                        style={{ ...inputStyle, borderColor: selectedType ? `${selectedType.color}40` : 'rgba(108,63,245,0.18)' }}
                                                        type="number" placeholder="Ej: 15" step="0.5" min="1"
                                                        value={svc.price_amount} onChange={e => updateService(i, 'price_amount', e.target.value)}
                                                        required onFocus={focus} onBlur={blur}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>UNIDAD</label>
                                                    <select style={inputStyle} value={svc.price_unit} onChange={e => updateService(i, 'price_unit', e.target.value)} onFocus={focus} onBlur={blur}>
                                                        {PRICE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>DESCRIPCIÓN DEL SERVICIO <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                                                <input style={inputStyle} type="text" placeholder="Ej: Paseo individual de 60 minutos por el parque" value={svc.description} onChange={e => updateService(i, 'description', e.target.value)} maxLength={120} onFocus={focus} onBlur={blur} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Notice */}
                            <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.14)', borderRadius: 12, padding: '13px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(0,212,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                                    Tu perfil será visible inmediatamente. El <strong>sello de Verificado</strong> se otorga tras revisión del equipo PetNexa (24–48h).
                                </p>
                            </div>

                            {error && (
                                <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.22)', borderRadius: 11, padding: '11px 14px', color: '#FF6B6B', fontSize: '0.88rem', marginBottom: 16 }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="submit" disabled={loading} style={{
                                    flex: 1, padding: '14px', borderRadius: 13, border: 'none',
                                    background: loading ? 'rgba(108,63,245,0.3)' : 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                    color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                    fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 6px 24px rgba(108,63,245,0.4)', transition: 'all 0.2s',
                                }}>
                                    {loading ? '⏳ Publicando...' : '🌟 Publicar mi Perfil'}
                                </button>
                                <Link href="/dashboard/services" style={{
                                    padding: '14px 26px', borderRadius: 13, background: 'transparent',
                                    border: '1px solid rgba(108,63,245,0.2)', color: 'rgba(248,248,255,0.5)',
                                    fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.95rem',
                                    textDecoration: 'none', display: 'flex', alignItems: 'center',
                                }}>Cancelar</Link>
                            </div>
                        </form>
                    </div>
                </div>{/* end z-index wrapper */}
            </main>
        </div>
    )
}
