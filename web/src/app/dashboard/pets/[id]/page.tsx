'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

// ── Constants ────────────────────────────────────────────────────────────────
const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🐦', Fish: '🐠',
    Rabbit: '🐇', Hamster: '🐹', Reptile: '🦎', Other: '🐾',
}
const SPECIES_COLOR: Record<string, string> = {
    Dog: '#F59E0B', Cat: '#8B5CF6', Bird: '#00D4FF', Fish: '#06B6D4',
    Rabbit: '#EC4899', Hamster: '#F97316', Reptile: '#10B981', Other: '#6C3FF5',
}
const SPECIES_OPTIONS = [
    { value: 'Dog', label: '🐶 Perro' }, { value: 'Cat', label: '🐱 Gato' },
    { value: 'Bird', label: '🐦 Ave' }, { value: 'Fish', label: '🐠 Pez' },
    { value: 'Rabbit', label: '🐇 Conejo' }, { value: 'Hamster', label: '🐹 Hámster' },
    { value: 'Reptile', label: '🦎 Reptil' }, { value: 'Other', label: '🐾 Otro' },
]

interface Pet {
    id: string; name: string; species: string; breed: string | null
    birth_date: string | null; weight_kg: number | null
    avatar_url: string | null; created_at: string
}

function calcAge(birthDate: string | null): string {
    if (!birthDate) return 'Desconocida'
    const birth = new Date(birthDate)
    const now = new Date()
    const total = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (total < 1) return 'Recién nacido'
    if (total < 12) return `${total} ${total === 1 ? 'mes' : 'meses'}`
    const y = Math.floor(total / 12); const m = total % 12
    return m > 0 ? `${y}a ${m}m` : `${y} ${y === 1 ? 'año' : 'años'}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PetDetailPage() {
    const supabase = createClient()
    const router = useRouter()
    const params = useParams()
    const petId = params.id as string
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [pet, setPet] = useState<Pet | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Photo upload state
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [photoHover, setPhotoHover] = useState(false)
    const [avatarKey, setAvatarKey] = useState(Date.now()) // force img re-render

    // Edit state
    const [editName, setEditName] = useState('')
    const [editSpecies, setEditSpecies] = useState('')
    const [editBreed, setEditBreed] = useState('')
    const [editBirth, setEditBirth] = useState('')
    const [editWeight, setEditWeight] = useState('')

    const [userId, setUserId] = useState<string | null>(null)

    // ── Load ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)
            loadPet()
        })
    }, [petId])

    const loadPet = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('pets').select('*').eq('id', petId).single()
        if (error || !data) { router.push('/dashboard/pets'); return }
        setPet(data)
        setEditName(data.name)
        setEditSpecies(data.species)
        setEditBreed(data.breed || '')
        setEditBirth(data.birth_date || '')
        setEditWeight(data.weight_kg?.toString() || '')
        setLoading(false)
    }

    // ── Photo upload ──────────────────────────────────────────────────────────
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId) return
        if (file.size > 5 * 1024 * 1024) { alert('La foto debe ser menor a 5 MB.'); return }

        setUploadingPhoto(true)
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${userId}/${petId}/avatar.${ext}`

        // Delete old avatar if exists
        if (pet?.avatar_url) {
            // Extract old path from URL
            const oldPath = pet.avatar_url.split('/pet-photos/')[1]
            if (oldPath) await supabase.storage.from('pet-photos').remove([oldPath])
        }

        const { error: upErr } = await supabase.storage
            .from('pet-photos')
            .upload(path, file, { upsert: true, contentType: file.type })

        if (upErr) { alert('Error subiendo la foto: ' + upErr.message); setUploadingPhoto(false); return }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('pet-photos').getPublicUrl(path)

        // Update pets table
        const { error: dbErr } = await supabase.from('pets').update({ avatar_url: publicUrl }).eq('id', petId)
        if (dbErr) { alert('Error guardando la URL: ' + dbErr.message); setUploadingPhoto(false); return }

        setPet(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
        setAvatarKey(Date.now())
        setUploadingPhoto(false)
    }

    // ── Save edit ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!editName.trim()) return
        setSaving(true); setError(null)
        const { data, error } = await supabase.from('pets').update({
            name: editName.trim(),
            species: editSpecies,
            breed: editBreed.trim() || null,
            birth_date: editBirth || null,
            weight_kg: editWeight ? parseFloat(editWeight) : null,
        }).eq('id', petId).select().single()
        if (error) { setError(error.message); setSaving(false); return }
        setPet(data)
        setEditing(false)
        setSaving(false)
    }

    // ── Delete pet ────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirm(`¿Eliminar a ${pet?.name}? Esta acción es irreversible.`)) return
        setDeleting(true)
        if (pet?.avatar_url && userId) {
            const oldPath = pet.avatar_url.split('/pet-photos/')[1]
            if (oldPath) await supabase.storage.from('pet-photos').remove([oldPath])
        }
        await supabase.from('pets').delete().eq('id', petId)
        router.push('/dashboard/pets')
    }

    // ── Styles ────────────────────────────────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(18,18,32,0.9)', border: '1px solid rgba(108,63,245,0.2)',
        borderRadius: 11, padding: '11px 14px',
        fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#F8F8FF', outline: 'none',
    }
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.73rem', fontWeight: 700,
        color: 'rgba(248,248,255,0.35)', marginBottom: 6, letterSpacing: '0.05em',
    }

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07070F' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
                    <p style={{ color: 'rgba(248,248,255,0.4)', fontFamily: 'Outfit, sans-serif' }}>Cargando perfil...</p>
                </div>
            </main>
        </div>
    )

    if (!pet) return null

    const color = SPECIES_COLOR[pet.species] || '#6C3FF5'
    const emoji = SPECIES_EMOJI[pet.species] || '🐾'

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07070F' }}>
            <Sidebar />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
            />

            <main className="dashboard-main" style={{ overflowY: 'auto' }}>
                {/* Hero banner */}
                <div style={{
                    background: `linear-gradient(135deg, ${color}22 0%, rgba(0,0,0,0) 100%), #0D0D1A`,
                    borderBottom: `1px solid ${color}18`,
                    padding: '40px 48px 32px',
                    position: 'relative',
                }}>
                    <Link href="/dashboard/pets" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28,
                        color: 'rgba(248,248,255,0.4)', fontSize: '0.82rem', textDecoration: 'none',
                        transition: 'color 0.2s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#F8F8FF')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,248,255,0.4)')}>
                        ← Mis Mascotas
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
                        {/* Avatar con upload */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div
                                onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                                onMouseEnter={() => setPhotoHover(true)}
                                onMouseLeave={() => setPhotoHover(false)}
                                style={{
                                    width: 110, height: 110, borderRadius: '50%',
                                    border: `3px solid ${color}`,
                                    boxShadow: `0 0 30px ${color}35`,
                                    cursor: uploadingPhoto ? 'wait' : 'pointer',
                                    overflow: 'hidden', position: 'relative',
                                    transition: 'transform 0.2s',
                                    transform: photoHover ? 'scale(1.04)' : 'scale(1)',
                                }}
                            >
                                {pet.avatar_url ? (
                                    <img
                                        key={avatarKey}
                                        src={pet.avatar_url}
                                        alt={pet.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: `linear-gradient(135deg, ${color}30, ${color}08)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 44,
                                    }}>
                                        {emoji}
                                    </div>
                                )}

                                {/* Overlay on hover */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.55)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexDirection: 'column', gap: 4,
                                    opacity: (photoHover || uploadingPhoto) ? 1 : 0,
                                    transition: 'opacity 0.2s',
                                }}>
                                    {uploadingPhoto ? (
                                        <span style={{ fontSize: 22 }}>⏳</span>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: 20 }}>📷</span>
                                            <span style={{ fontSize: '0.62rem', color: 'white', fontWeight: 700 }}>
                                                {pet.avatar_url ? 'Cambiar' : 'Añadir'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Upload hint */}
                            <div style={{
                                position: 'absolute', bottom: -6, right: -4,
                                width: 28, height: 28, borderRadius: '50%',
                                background: color, border: '3px solid #07070F',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, cursor: 'pointer',
                                boxShadow: `0 2px 8px ${color}50`,
                            }}
                                onClick={() => fileInputRef.current?.click()}>
                                {uploadingPhoto ? '⏳' : '✏️'}
                            </div>
                        </div>

                        {/* Name & info */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 900, margin: 0 }}>
                                    {pet.name}
                                </h1>
                                <span style={{
                                    padding: '4px 14px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700,
                                    background: `${color}18`, border: `1px solid ${color}30`, color,
                                }}>
                                    {emoji} {pet.species}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', color: 'rgba(248,248,255,0.5)', fontSize: '0.85rem' }}>
                                {pet.breed && <span>🐾 {pet.breed}</span>}
                                <span>🎂 {calcAge(pet.birth_date)}</span>
                                {pet.weight_kg && <span>⚖️ {pet.weight_kg} kg</span>}
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'rgba(248,248,255,0.2)', marginTop: 10 }}>
                                📷 Haz clic en la foto para cambiarla · Max 5 MB · JPG, PNG o WebP
                            </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            {!editing && (
                                <button onClick={() => setEditing(true)} style={{
                                    padding: '10px 22px', borderRadius: 12,
                                    background: `${color}18`, border: `1px solid ${color}30`,
                                    color, fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                    fontSize: '0.85rem', cursor: 'pointer',
                                }}>✏️ Editar</button>
                            )}
                            <button onClick={handleDelete} disabled={deleting} style={{
                                padding: '10px 18px', borderRadius: 12,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#EF4444', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                                fontSize: '0.85rem', cursor: deleting ? 'wait' : 'pointer',
                            }}>
                                {deleting ? '⏳' : '🗑️'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '36px 48px', maxWidth: 860 }}>
                    {/* Edit form */}
                    {editing ? (
                        <div style={{
                            background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(108,63,245,0.18)', borderRadius: 20, padding: '28px',
                            marginBottom: 28,
                        }}>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginBottom: 24, fontSize: '1rem' }}>
                                ✏️ Editar información
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                                <div>
                                    <label style={labelStyle}>NOMBRE *</label>
                                    <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.1)' }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.2)'; e.currentTarget.style.boxShadow = 'none' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>RAZA / VARIEDAD</label>
                                    <input style={inputStyle} value={editBreed} onChange={e => setEditBreed(e.target.value)} placeholder="Golden Retriever, Persa..."
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.1)' }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.2)'; e.currentTarget.style.boxShadow = 'none' }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>FECHA DE NACIMIENTO</label>
                                    <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={editBirth} onChange={e => setEditBirth(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div>
                                    <label style={labelStyle}>PESO (kg)</label>
                                    <input style={inputStyle} type="number" step="0.1" min="0" max="999" value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="4.5"
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6C3FF5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,63,245,0.1)' }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(108,63,245,0.2)'; e.currentTarget.style.boxShadow = 'none' }} />
                                </div>
                            </div>

                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>ESPECIE</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {SPECIES_OPTIONS.map(opt => (
                                        <button key={opt.value} type="button" onClick={() => setEditSpecies(opt.value)} style={{
                                            padding: '10px 8px', borderRadius: 11, cursor: 'pointer',
                                            border: `1.5px solid ${editSpecies === opt.value ? color : 'rgba(108,63,245,0.12)'}`,
                                            background: editSpecies === opt.value ? `${color}18` : 'rgba(255,255,255,0.02)',
                                            color: editSpecies === opt.value ? color : 'rgba(248,248,255,0.45)',
                                            fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: editSpecies === opt.value ? 700 : 400,
                                            transition: 'all 0.15s',
                                        }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#EF4444', fontSize: '0.84rem', marginBottom: 16 }}>⚠️ {error}</div>}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={handleSave} disabled={saving || !editName.trim()} style={{
                                    flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                                    background: !editName.trim() ? 'rgba(108,63,245,0.3)' : 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                    color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                                    cursor: (!editName.trim() || saving) ? 'not-allowed' : 'pointer',
                                    boxShadow: editName.trim() ? '0 4px 18px rgba(108,63,245,0.4)' : 'none',
                                }}>
                                    {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
                                </button>
                                <button onClick={() => { setEditing(false); setError(null) }} style={{
                                    padding: '12px 22px', borderRadius: 12, background: 'transparent',
                                    border: '1px solid rgba(108,63,245,0.18)', color: 'rgba(248,248,255,0.45)',
                                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.88rem',
                                }}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Info cards */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
                            {[
                                { label: 'Especie', value: `${emoji} ${pet.species}`, icon: '🐾' },
                                { label: 'Raza', value: pet.breed || 'No especificada', icon: '🏷️' },
                                { label: 'Edad', value: calcAge(pet.birth_date), icon: '🎂' },
                                { label: 'Peso', value: pet.weight_kg ? `${pet.weight_kg} kg` : 'No registrado', icon: '⚖️' },
                            ].map(stat => (
                                <div key={stat.label} style={{
                                    background: 'rgba(13,13,25,0.7)', border: '1px solid rgba(108,63,245,0.1)',
                                    borderRadius: 16, padding: '18px 20px',
                                }}>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(248,248,255,0.35)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>
                                        {stat.label.toUpperCase()}
                                    </div>
                                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem' }}>
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quick links */}
                    {!editing && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                            {[
                                { icon: '💉', title: 'Cartilla Veterinaria', desc: 'Vacunas, revisiones y tratamientos', href: '/dashboard/health', color: '#6C3FF5' },
                                { icon: '📸', title: 'Red Social', desc: 'Posts y fotos de la comunidad', href: '/dashboard/social', color: '#00D4FF' },
                                { icon: '🚨', title: 'Alertas', desc: 'Mascotas perdidas en tu zona', href: '/dashboard/alerts', color: '#EF4444' },
                            ].map(link => (
                                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        background: 'rgba(13,13,25,0.7)', border: `1px solid ${link.color}15`,
                                        borderRadius: 16, padding: '20px', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${link.color}35`; e.currentTarget.style.background = `${link.color}08` }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${link.color}15`; e.currentTarget.style.background = 'rgba(13,13,25,0.7)' }}>
                                        <div style={{ fontSize: 26, marginBottom: 10 }}>{link.icon}</div>
                                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{link.title}</div>
                                        <div style={{ color: 'rgba(248,248,255,0.38)', fontSize: '0.78rem' }}>{link.desc}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
