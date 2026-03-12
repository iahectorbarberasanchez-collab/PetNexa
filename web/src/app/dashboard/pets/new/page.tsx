'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const SPECIES_OPTIONS = [
    { value: 'Dog', label: '🐶', name: 'Perro', color: '#F59E0B' },
    { value: 'Cat', label: '🐱', name: 'Gato', color: '#8B5CF6' },
    { value: 'Bird', label: '🐦', name: 'Ave', color: '#00D4FF' },
    { value: 'Fish', label: '🐠', name: 'Pez', color: '#06B6D4' },
    { value: 'Rabbit', label: '🐇', name: 'Conejo', color: '#EC4899' },
    { value: 'Hamster', label: '🐹', name: 'Hámster', color: '#F97316' },
    { value: 'Reptile', label: '🦎', name: 'Reptil', color: '#10B981' },
    { value: 'Other', label: '🐾', name: 'Otro', color: '#6C3FF5' },
]

interface AIResult {
    species?: string
    speciesKey?: string
    breed?: string
    confidence?: string
    characteristics?: string[]
    tips?: string
    error?: string
}

const CONFIDENCE_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    'Alta': { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: '● Alta confianza' },
    'Media': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: '◐ Confianza media' },
    'Baja': { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', label: '○ Baja confianza' },
}

export default function NewPetPage() {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [name, setName] = useState('')
    const [species, setSpecies] = useState('')
    const [breed, setBreed] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [weightKg, setWeightKg] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // AI state
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageBase64, setImageBase64] = useState<string | null>(null)
    const [imageMime, setImageMime] = useState<string>('image/jpeg')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiResult, setAiResult] = useState<AIResult | null>(null)
    const [aiApplied, setAiApplied] = useState(false)
    const [dragOver, setDragOver] = useState(false)

    const processImageFile = (file: File) => {
        if (file.size > 4 * 1024 * 1024) {
            setError('La imagen es demasiado grande. Máximo 4 MB.')
            return
        }
        setError(null)
        setAiResult(null)
        setAiApplied(false)
        setImageMime(file.type || 'image/jpeg')

        const reader = new FileReader()
        reader.onload = (e) => {
            const result = e.target?.result as string
            setImagePreview(result)
            // Extract pure base64 (remove data:image/...;base64,)
            const base64 = result.split(',')[1]
            setImageBase64(base64)
        }
        reader.readAsDataURL(file)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processImageFile(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) processImageFile(file)
    }

    const handleDetect = async () => {
        if (!imageBase64) return
        setAiLoading(true)
        setAiResult(null)
        setError(null)

        try {
            const res = await fetch('/api/detect-breed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64, mimeType: imageMime }),
            })
            const data: AIResult = await res.json()
            setAiResult(data)

            if (!data.error) {
                // Auto-fill species
                if (data.speciesKey) {
                    setSpecies(data.speciesKey)
                }
                // Auto-fill breed
                if (data.breed && data.breed !== 'Mestizo/a') {
                    setBreed(data.breed)
                }
                setAiApplied(true)
            }
        } catch {
            setAiResult({ error: 'Error de red al conectar con la IA.' })
        } finally {
            setAiLoading(false)
        }
    }

    const clearImage = () => {
        setImagePreview(null)
        setImageBase64(null)
        setAiResult(null)
        setAiApplied(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!species) { setError('Por favor, selecciona el tipo de mascota.'); return }
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth'); return }

        const { error: insertError } = await supabase.from('pets').insert({
            owner_id: user.id,
            name: name.trim(),
            species,
            breed: breed.trim() || null,
            birth_date: birthDate || null,
            weight_kg: weightKg ? parseFloat(weightKg) : null,
        })

        if (insertError) { setError(insertError.message); setLoading(false); return }
        router.push('/dashboard/pets')
        router.refresh()
    }

    const selectedSpecies = SPECIES_OPTIONS.find(s => s.value === species)

    const inputStyle: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(18,18,32,0.9)',
        border: '1px solid rgba(108,63,245,0.18)',
        borderRadius: 12, padding: '13px 16px',
        fontFamily: 'Inter, sans-serif', fontSize: '0.93rem',
        color: '#F8F8FF', outline: 'none', transition: 'all 0.2s',
    }
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.8rem', fontWeight: 600,
        color: 'rgba(248,248,255,0.45)', marginBottom: 8, letterSpacing: '0.03em',
    }

    const confStyle = aiResult?.confidence ? (CONFIDENCE_STYLE[aiResult.confidence] || CONFIDENCE_STYLE['Media']) : null

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07070F' }}>
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
                        <Link href="/dashboard/pets" style={{ color: 'rgba(248,248,255,0.3)', textDecoration: 'none' }}>Mis Mascotas</Link>
                        <span style={{ color: 'rgba(248,248,255,0.2)' }}>›</span>
                        <span style={{ color: 'rgba(248,248,255,0.6)' }}>Nueva Mascota</span>
                    </div>

                    <div style={{ maxWidth: 660 }}>
                        <div style={{ marginBottom: 36 }}>
                            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.9rem', fontWeight: 800, marginBottom: 8 }}>
                                Añadir Mascota 🐾
                            </h1>
                            <p style={{ color: 'rgba(248,248,255,0.4)', lineHeight: 1.65 }}>
                                Sube una foto y nuestra IA detectará la raza automáticamente.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{
                                background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(108,63,245,0.15)', borderRadius: 22,
                                padding: '36px', display: 'flex', flexDirection: 'column', gap: 28,
                            }}>

                                {/* ── AI PHOTO ZONE ── */}
                                <div>
                                    <label style={labelStyle}>FOTO DE TU MASCOTA <span style={{ fontWeight: 400, color: 'rgba(248,248,255,0.25)' }}>(opcional · activa la IA)</span></label>

                                    {!imagePreview ? (
                                        /* Drop zone */
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            style={{
                                                border: `2px dashed ${dragOver ? '#6C3FF5' : 'rgba(108,63,245,0.25)'}`,
                                                borderRadius: 16,
                                                padding: '36px 24px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                background: dragOver ? 'rgba(108,63,245,0.07)' : 'rgba(108,63,245,0.03)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                                            <p style={{ color: 'rgba(248,248,255,0.5)', fontSize: '0.9rem', marginBottom: 4 }}>
                                                Arrastra una foto o <span style={{ color: '#6C3FF5', fontWeight: 700 }}>haz clic para seleccionar</span>
                                            </p>
                                            <p style={{ color: 'rgba(248,248,255,0.25)', fontSize: '0.78rem' }}>JPG, PNG, WEBP · máx. 4 MB</p>
                                        </div>
                                    ) : (
                                        /* Preview + detect */
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, border: '2px solid rgba(108,63,245,0.3)' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={clearImage}
                                                    style={{
                                                        position: 'absolute', top: -8, right: -8,
                                                        background: '#FF6B6B', border: 'none', color: 'white',
                                                        borderRadius: '50%', width: 24, height: 24,
                                                        cursor: 'pointer', fontSize: 14, lineHeight: '24px', padding: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}
                                                >✕</button>
                                            </div>

                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <button
                                                    type="button"
                                                    onClick={handleDetect}
                                                    disabled={aiLoading}
                                                    style={{
                                                        padding: '12px 20px', borderRadius: 12, border: 'none',
                                                        background: aiLoading
                                                            ? 'rgba(108,63,245,0.3)'
                                                            : 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                                        color: 'white', fontFamily: 'Outfit, sans-serif',
                                                        fontWeight: 700, fontSize: '0.9rem', cursor: aiLoading ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: aiLoading ? 'none' : '0 4px 18px rgba(108,63,245,0.4)',
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                    }}
                                                >
                                                    {aiLoading ? (
                                                        <>
                                                            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                                                            Analizando imagen...
                                                        </>
                                                    ) : (
                                                        <>✨ Detectar con IA</>
                                                    )}
                                                </button>

                                                {aiApplied && !aiResult?.error && (
                                                    <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                                                        ✓ Campos completados automáticamente
                                                    </div>
                                                )}

                                                <p style={{ fontSize: '0.78rem', color: 'rgba(248,248,255,0.3)', margin: 0 }}>
                                                    Gemini 1.5 Flash Vision analiza la foto y rellena especie y raza.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>

                                {/* ── AI RESULT PANEL ── */}
                                {aiResult && (
                                    <div style={{
                                        borderRadius: 16,
                                        border: aiResult.error
                                            ? '1px solid rgba(255,107,107,0.25)'
                                            : '1px solid rgba(108,63,245,0.2)',
                                        background: aiResult.error
                                            ? 'rgba(255,107,107,0.05)'
                                            : 'linear-gradient(135deg, rgba(108,63,245,0.07) 0%, rgba(0,212,255,0.04) 100%)',
                                        padding: '20px 22px',
                                        animation: 'fadeIn 0.35s ease',
                                    }}>
                                        {aiResult.error ? (
                                            <p style={{ color: '#FF6B6B', fontSize: '0.9rem', margin: 0 }}>⚠️ {aiResult.error}</p>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                                                    <div>
                                                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', marginBottom: 2 }}>
                                                            {aiResult.species} · {aiResult.breed}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'rgba(248,248,255,0.4)' }}>Detectado por IA</div>
                                                    </div>
                                                    {confStyle && (
                                                        <span style={{
                                                            fontSize: '0.75rem', fontWeight: 700,
                                                            color: confStyle.color, background: confStyle.bg,
                                                            border: `1px solid ${confStyle.color}40`,
                                                            padding: '4px 12px', borderRadius: 100,
                                                        }}>
                                                            {confStyle.label}
                                                        </span>
                                                    )}
                                                </div>

                                                {aiResult.characteristics && aiResult.characteristics.length > 0 && (
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                                        {aiResult.characteristics.map((c, i) => (
                                                            <span key={i} style={{
                                                                fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)',
                                                                border: '1px solid rgba(108,63,245,0.15)',
                                                                padding: '3px 10px', borderRadius: 100,
                                                                color: 'rgba(248,248,255,0.55)',
                                                            }}>{c}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {aiResult.tips && (
                                                    <p style={{ fontSize: '0.82rem', color: 'rgba(248,248,255,0.45)', margin: 0, lineHeight: 1.6 }}>
                                                        💡 {aiResult.tips}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ── SPECIES SELECTOR ── */}
                                <div>
                                    <label style={labelStyle}>TIPO DE MASCOTA *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                        {SPECIES_OPTIONS.map(opt => {
                                            const isSelected = species === opt.value
                                            return (
                                                <button key={opt.value} type="button" onClick={() => setSpecies(opt.value)}
                                                    style={{
                                                        padding: '14px 8px', borderRadius: 14,
                                                        border: `1.5px solid ${isSelected ? opt.color : 'rgba(108,63,245,0.12)'}`,
                                                        background: isSelected ? `${opt.color}18` : 'rgba(255,255,255,0.02)',
                                                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                                                        boxShadow: isSelected ? `0 0 16px ${opt.color}30` : 'none',
                                                    }}>
                                                    <div style={{ fontSize: 28, marginBottom: 5 }}>{opt.label}</div>
                                                    <div style={{ fontSize: '0.74rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: isSelected ? opt.color : 'rgba(248,248,255,0.35)' }}>{opt.name}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {selectedSpecies && (
                                        <div style={{ marginTop: 10, fontSize: '0.82rem', color: selectedSpecies.color, fontWeight: 600 }}>
                                            ✓ {selectedSpecies.label} {selectedSpecies.name} seleccionado
                                        </div>
                                    )}
                                </div>

                                {/* ── NAME ── */}
                                <div>
                                    <label style={labelStyle}>NOMBRE *</label>
                                    <input style={inputStyle} type="text" placeholder="Ej: Buddy, Luna, Milo..." value={name} onChange={e => setName(e.target.value)} required maxLength={50}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.12)' }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.18)'; e.currentTarget.style.boxShadow = 'none' }} />
                                </div>

                                {/* ── BREED ── */}
                                <div>
                                    <label style={labelStyle}>
                                        RAZA <span style={{ fontWeight: 400, color: 'rgba(248,248,255,0.25)' }}>(opcional · la IA la rellena automáticamente)</span>
                                    </label>
                                    <input style={inputStyle} type="text" placeholder="Ej: Golden Retriever, Persa, Sin raza…" value={breed} onChange={e => setBreed(e.target.value)} maxLength={80}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.12)' }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.18)'; e.currentTarget.style.boxShadow = 'none' }} />
                                </div>

                                {/* ── BIRTHDATE & WEIGHT ── */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>FECHA DE NACIMIENTO <span style={{ fontWeight: 400, color: 'rgba(248,248,255,0.25)' }}>(aprox.)</span></label>
                                        <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
                                            onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5' }}
                                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.18)' }} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>PESO (kg) <span style={{ fontWeight: 400, color: 'rgba(248,248,255,0.25)' }}>(opcional)</span></label>
                                        <input style={inputStyle} type="number" placeholder="Ej: 4.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} min="0.1" max="500" step="0.1"
                                            onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.12)' }}
                                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.18)'; e.currentTarget.style.boxShadow = 'none' }} />
                                    </div>
                                </div>

                                {/* ── PRIVACY NOTE ── */}
                                <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, padding: '13px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                                    <p style={{ fontSize: '0.8rem', color: 'rgba(0,212,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                                        <strong>Privacidad garantizada:</strong> Solo tú podrás ver, editar o eliminar esta mascota.
                                    </p>
                                </div>

                                {error && (
                                    <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.22)', borderRadius: 11, padding: '11px 14px', color: '#FF6B6B', fontSize: '0.88rem' }}>
                                        ⚠️ {error}
                                    </div>
                                )}
                            </div>

                            {/* ── SUBMIT ── */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button type="submit" disabled={loading || !name.trim() || !species} style={{
                                    flex: 1, padding: '14px', borderRadius: 13, border: 'none',
                                    cursor: (loading || !name.trim() || !species) ? 'not-allowed' : 'pointer',
                                    background: (loading || !name.trim() || !species)
                                        ? 'rgba(108,63,245,0.3)'
                                        : 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                    color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                    fontSize: '0.95rem', boxShadow: (!name.trim() || !species) ? 'none' : '0 6px 24px rgba(108,63,245,0.4)',
                                    transition: 'all 0.2s',
                                }}>
                                    {loading ? '⏳ Guardando...' : '🐾 Guardar Mascota'}
                                </button>
                                <Link href="/dashboard/pets" style={{
                                    padding: '14px 28px', borderRadius: 13,
                                    background: 'transparent', border: '1px solid rgba(108,63,245,0.2)',
                                    color: 'rgba(248,248,255,0.5)', fontFamily: 'Outfit, sans-serif',
                                    fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none',
                                    display: 'flex', alignItems: 'center',
                                }}>
                                    Cancelar
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>{/* end z-index wrapper */}
            </main>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
