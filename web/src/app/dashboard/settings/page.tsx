'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ────────────────────────────────────────────────────────────────────
interface Profile {
    id: string
    display_name: string | null
    city: string | null
    bio: string | null
    avatar_url: string | null
    notifications_email: boolean
    notifications_alerts: boolean
    notifications_social: boolean
    profile_public: boolean
    pet_coins?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div className="bg-dark-card border border-white/5 backdrop-blur-xl rounded-2xl p-7 mb-5">
        <h2 className="font-outfit font-extrabold text-base mb-5 flex items-center gap-2 text-white">
            <span className="text-xl">{icon}</span> {title}
        </h2>
        {children}
    </div>
)

const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: () => void; label: string; desc?: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
        <div>
            <div className="font-semibold text-sm font-inter text-white">{label}</div>
            {desc && <div className="text-xs text-white/40 mt-1">{desc}</div>}
        </div>
        <button onClick={onChange} className={`w-12 h-6 rounded-full border-none cursor-pointer relative transition-all duration-300 flex-shrink-0 ${checked ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-white/10'}`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-md ${checked ? 'left-6.5' : 'left-0.5'}`} />
        </button>
    </div>
)

// ── Component ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const supabase = createClient()
    const router = useRouter()

    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    // Profile form
    const [pName, setPName] = useState('')
    const [pCity, setPCity] = useState('')
    const [pBio, setPBio] = useState('')
    const [pPublic, setPPublic] = useState(true)
    const [pSaving, setPSaving] = useState(false)
    const [pMsg, setPMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    // Notifications
    const [nEmail, setNEmail] = useState(true)
    const [nAlerts, setNAlerts] = useState(true)
    const [nSocial, setNSocial] = useState(false)
    const [nSaving, setNSaving] = useState(false)

    // Password
    const [pwCurrent, setPwCurrent] = useState('')
    const [pwNew, setPwNew] = useState('')
    const [pwConfirm, setPwConfirm] = useState('')
    const [pwSaving, setPwSaving] = useState(false)
    const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    // Tab
    const [tab, setTab] = useState<'profile' | 'notifications' | 'security' | 'danger'>('profile')

    // ── Load ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true

        const load = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!isMounted) return

                if (!user) {
                    router.push('/auth')
                    return
                }

                setUserEmail(user.email ?? null)
                setUserId(user.id)

                // Upsert profile row (ensures it exists)
                const { data: prof, error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({ id: user.id }, { onConflict: 'id' })
                    .select()
                    .single()

                if (!isMounted) return

                if (prof) {
                    setProfile(prof)
                    setPName(prof.display_name || '')
                    setPCity(prof.city || '')
                    setPBio(prof.bio || '')
                    setPPublic(prof.profile_public ?? true)
                    setNEmail(prof.notifications_email ?? true)
                    setNAlerts(prof.notifications_alerts ?? true)
                    setNSocial(prof.notifications_social ?? false)
                }
            } catch (err) {
                console.error('Error loading settings:', err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        load()

        // Safety timeout to ensure loading hides eventually
        const timeout = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 5000)

        return () => {
            isMounted = false
            clearTimeout(timeout)
        }
    }, [])

    // ── Save profile ──────────────────────────────────────────────────────────
    const saveProfile = async () => {
        if (!userId) return
        setPSaving(true); setPMsg(null)
        const { error } = await supabase.from('profiles').update({
            display_name: pName.trim() || null,
            city: pCity.trim() || null,
            bio: pBio.trim() || null,
            profile_public: pPublic,
            updated_at: new Date().toISOString(),
        }).eq('id', userId)
        if (error) { setPMsg({ type: 'err', text: error.message }); setPSaving(false); return }
        setPMsg({ type: 'ok', text: '✅ Perfil actualizado' })
        setPSaving(false)
        setTimeout(() => setPMsg(null), 3000)
    }

    // ── Save notifications ────────────────────────────────────────────────────
    const saveNotifications = async () => {
        if (!userId) return
        setNSaving(true)
        await supabase.from('profiles').update({
            notifications_email: nEmail,
            notifications_alerts: nAlerts,
            notifications_social: nSocial,
            updated_at: new Date().toISOString(),
        }).eq('id', userId)
        setNSaving(false)
    }

    // ── Change password ───────────────────────────────────────────────────────
    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (pwNew !== pwConfirm) { setPwMsg({ type: 'err', text: 'Las contraseñas no coinciden.' }); return }
        if (pwNew.length < 6) { setPwMsg({ type: 'err', text: 'La contraseña debe tener al menos 6 caracteres.' }); return }
        setPwSaving(true); setPwMsg(null)
        const { error } = await supabase.auth.updateUser({ password: pwNew })
        if (error) { setPwMsg({ type: 'err', text: error.message }); setPwSaving(false); return }
        setPwMsg({ type: 'ok', text: '✅ Contraseña actualizada correctamente' })
        setPwCurrent(''); setPwNew(''); setPwConfirm('')
        setPwSaving(false)
        setTimeout(() => setPwMsg(null), 4000)
    }

    // ── Sign out ───────────────────────────────────────────────────────────────
    const signOut = async () => {
        await supabase.auth.signOut()
        router.push('/auth')
    }

    // ── Delete account ─────────────────────────────────────────────────────────
    const deleteAccount = async () => {
        const confirm1 = confirm('⚠️ Esta acción eliminará TODAS tus mascotas, registros médicos y datos. ¿Estás seguro?')
        if (!confirm1) return
        const confirm2 = prompt('Escribe "ELIMINAR" para confirmar:')
        if (confirm2 !== 'ELIMINAR') { alert('Cancelado. Texto incorrecto.'); return }
        alert('Para eliminar tu cuenta, contacta con soporte en: hola@petnexa.app')
    }

    // ── Styles ────────────────────────────────────────────────────────────────
    const inputClass = "w-full bg-[#121220]/90 border border-primary/20 rounded-xl px-4 py-3 font-inter text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
    const labelClass = "block text-[0.73rem] font-bold text-white/40 mb-1.5 tracking-wide uppercase"
    const tabClass = (active: boolean) => `px-5 py-2.5 rounded-xl font-inter font-semibold text-[0.85rem] transition-all cursor-pointer border-none ${active ? 'bg-primary/20 text-primary-light' : 'bg-transparent text-white/40 hover:text-white/70'}`

    if (loading) return (
        <div className="min-h-screen bg-dark-bg text-white">
            <Sidebar />
            <main className="dashboard-main min-h-screen flex items-center justify-center">
                <p className="text-white/40 font-outfit">⚙️ Cargando ajustes...</p>
            </main>
        </div>
    )

    return (
        <div className="min-h-screen bg-dark-bg text-white">
            <Sidebar />
            <main className="dashboard-main pb-12">
                <div className="max-w-4xl">
                    <PageHeader
                        title="Ajustes"
                        emoji="⚙️"
                        subtitle={userEmail || 'Gestiona tu cuenta y preferencias'}
                    />

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1 mb-6 bg-dark-card border border-white/5 rounded-2xl p-1 w-fit backdrop-blur-md">
                        {[
                            { key: 'profile', label: '👤 Perfil' },
                            { key: 'notifications', label: '🔔 Notificaciones' },
                            { key: 'security', label: '🔒 Seguridad' },
                            { key: 'danger', label: '☠️ Cuenta' },
                        ].map(t => (
                            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={tabClass(tab === t.key)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── PERFIL ─────────────────────────────────────────────────────── */}
                    {tab === 'profile' && (
                        <Section title="Información de perfil" icon="👤">
                            {/* Email (readonly) */}
                            <div className="mb-5">
                                <label className={labelClass}>EMAIL</label>
                                <div className={`${inputClass} text-white/40 cursor-not-allowed flex items-center gap-2`}>
                                    <span>🔒</span> {userEmail}
                                </div>
                                <p className="text-xs text-white/30 mt-1.5">El email no se puede cambiar</p>
                            </div>

                            {/* PetCoins (readonly) */}
                            <div className="mb-5">
                                <label className={labelClass}>TU SALDO</label>
                                <div className={`${inputClass} !bg-gradient-to-r from-[rgba(255,215,0,0.1)] to-transparent !border-[#FFD700]/30 text-[#FFD700] font-bold flex items-center justify-between`}>
                                    <span className="flex items-center gap-2">
                                        <span className="text-xl">🪙</span>
                                        {profile?.pet_coins?.toLocaleString() || '0'} PetCoins
                                    </span>
                                    <button onClick={() => router.push('/dashboard/premium')} className="bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] text-xs px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer font-bold">
                                        Conseguir más
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className={labelClass}>NOMBRE VISIBLE</label>
                                    <input className={inputClass} value={pName} onChange={e => setPName(e.target.value)} placeholder="Cómo te llamamos..." maxLength={60} />
                                </div>
                                <div>
                                    <label className={labelClass}>CIUDAD</label>
                                    <input className={inputClass} value={pCity} onChange={e => setPCity(e.target.value)} placeholder="Barcelona, Madrid..." maxLength={60} />
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className={labelClass}>BIO <span className="font-normal text-white/30">({pBio.length}/200)</span></label>
                                <textarea className={`${inputClass} resize-y min-h-[80px]`}
                                    value={pBio} onChange={e => setPBio(e.target.value)} maxLength={200}
                                    placeholder="Cuéntanos algo sobre ti y tus mascotas..." />
                            </div>

                            <Toggle checked={pPublic} onChange={() => setPPublic(!pPublic)}
                                label="Perfil público" desc="Otros usuarios pueden ver tu perfil y mascotas en el feed social" />

                            {pMsg && (
                                <div className={`mt-4 px-4 py-3 rounded-xl text-sm border ${pMsg.type === 'ok' ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20 text-[#00E5A0]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                    {pMsg.text}
                                </div>
                            )}

                            <button onClick={saveProfile} disabled={pSaving} className={`mt-6 px-8 py-3 rounded-xl font-outfit font-bold text-sm text-white transition-all border-none ${pSaving ? 'cursor-wait bg-primary/50' : 'cursor-pointer bg-gradient-to-br from-primary to-secondary hover:shadow-lg hover:shadow-primary/30'}`}>
                                {pSaving ? '⏳ Guardando...' : '💾 Guardar perfil'}
                            </button>
                        </Section>
                    )}

                    {/* ── NOTIFICACIONES ──────────────────────────────────────────────── */}
                    {tab === 'notifications' && (
                        <Section title="Notificaciones" icon="🔔">
                            <Toggle checked={nEmail} onChange={() => setNEmail(!nEmail)}
                                label="Actualizaciones por email"
                                desc="Recibe resúmenes semanales y novedades de PetNexa" />
                            <Toggle checked={nAlerts} onChange={() => setNAlerts(!nAlerts)}
                                label="Alertas de mascotas perdidas"
                                desc="Notificaciones cuando aparezcan alertas cerca de tu ciudad" />
                            <Toggle checked={nSocial} onChange={() => setNSocial(!nSocial)}
                                label="Actividad social"
                                desc="Likes y comentarios en tus publicaciones" />

                            <button onClick={saveNotifications} disabled={nSaving} className={`mt-6 px-8 py-3 rounded-xl font-outfit font-bold text-sm text-white transition-all border-none ${nSaving ? 'cursor-wait bg-primary/50' : 'cursor-pointer bg-gradient-to-br from-primary to-secondary hover:shadow-lg hover:shadow-primary/30'}`}>
                                {nSaving ? '⏳ Guardando...' : '💾 Guardar preferencias'}
                            </button>
                        </Section>
                    )}

                    {/* ── SEGURIDAD ──────────────────────────────────────────────────── */}
                    {tab === 'security' && (
                        <>
                            <Section title="Cambiar contraseña" icon="🔒">
                                <form onSubmit={changePassword} className="flex flex-col gap-4">
                                    <p className="text-sm text-white/40 mb-1 leading-relaxed">
                                        Elige una contraseña segura de al menos 6 caracteres con letras y números.
                                    </p>
                                    <div>
                                        <label className={labelClass}>NUEVA CONTRASEÑA</label>
                                        <input className={inputClass} type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="Min. 6 caracteres" required minLength={6} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>CONFIRMAR CONTRASEÑA</label>
                                        <input className={`${inputClass} ${pwConfirm && pwNew !== pwConfirm ? 'border-red-500/50' : ''}`} type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repite la contraseña" required />
                                        {pwConfirm && pwNew !== pwConfirm && <p className="text-xs text-red-500 mt-1.5">Las contraseñas no coinciden</p>}
                                    </div>

                                    {pwMsg && (
                                        <div className={`px-4 py-3 rounded-xl text-sm border ${pwMsg.type === 'ok' ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20 text-[#00E5A0]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                            {pwMsg.text}
                                        </div>
                                    )}

                                    <button type="submit" disabled={pwSaving || !pwNew || pwNew !== pwConfirm} className={`w-fit px-8 py-3 rounded-xl font-outfit font-bold text-sm transition-all border-none ${(pwSaving || !pwNew || pwNew !== pwConfirm) ? 'cursor-not-allowed bg-white/10 text-white/50' : 'cursor-pointer bg-gradient-to-br from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30'}`}>
                                        {pwSaving ? '⏳ Actualizando...' : '🔒 Cambiar contraseña'}
                                    </button>
                                </form>
                            </Section>

                            <Section title="Sesión" icon="🚪">
                                <p className="text-sm text-white/40 mb-4 leading-relaxed">
                                    Al cerrar sesión tendrás que volver a iniciarla con tu email y contraseña.
                                </p>
                                <button onClick={signOut} className="px-7 py-3 rounded-xl font-outfit font-bold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                                    🚪 Cerrar sesión
                                </button>
                            </Section>
                        </>
                    )}

                    {/* ── ZONA DE PELIGRO ────────────────────────────────────────────── */}
                    {tab === 'danger' && (
                        <Section title="Zona de peligro" icon="☠️">
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                                <h3 className="font-outfit font-extrabold text-red-500 text-base mb-2">
                                    Eliminar cuenta permanentemente
                                </h3>
                                <p className="text-sm text-white/40 leading-relaxed mb-5">
                                    Esta acción eliminará tu cuenta, todas tus mascotas, registros veterinarios, publicaciones y fotos. Es <strong className="text-white/70">irreversible</strong>.
                                </p>
                                <button onClick={deleteAccount} className="px-6 py-2.5 rounded-xl font-outfit font-bold text-sm bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer">
                                    🗑️ Eliminar mi cuenta
                                </button>
                            </div>
                        </Section>
                    )}
                </div>
            </main>
        </div>
    )
}
