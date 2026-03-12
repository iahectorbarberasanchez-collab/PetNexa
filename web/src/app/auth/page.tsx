'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

type Mode = 'login' | 'signup'

const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(20,20,38,0.9)',
    border: '1px solid rgba(108,63,245,0.2)', borderRadius: 12,
    padding: '13px 16px', fontFamily: 'Inter, sans-serif', fontSize: '0.93rem',
    color: '#F8F8FF', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
}
const focusStyle = { borderColor: '#6C3FF5', boxShadow: '0 0 0 3px rgba(108,63,245,0.15)' }
const blurStyle = { borderColor: 'rgba(108,63,245,0.2)', boxShadow: 'none' }

export default function AuthPage() {
    const supabase = createClient()
    const router = useRouter()
    const [mode, setMode] = useState<Mode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // ── Email/password ──────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError(null); setSuccess(null)

        if (mode === 'signup') {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } },
            })
            if (error) setError(error.message)
            else setSuccess('¡Revisa tu email para confirmar tu cuenta! 🐾')
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) setError(error.message)
            else router.push('/dashboard')
        }
        setLoading(false)
    }

    // ── Google OAuth ────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        setGoogleLoading(true); setError(null)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            },
        })
        if (error) { setError(error.message); setGoogleLoading(false) }
    }

    const switchMode = (m: Mode) => { setMode(m); setError(null); setSuccess(null) }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', padding: '24px',
            background: '#07070F',
        }}>
            {/* Ambient glows */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,63,245,0.18) 0%, transparent 70%)', top: '-200px', right: '-100px', pointerEvents: 'none' }}
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.2 }}
                style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)', bottom: '-100px', left: '-80px', pointerEvents: 'none' }}
            />

            <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ textAlign: 'center', marginBottom: 36 }}
                >
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 76, height: 76, borderRadius: 22,
                        background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                        boxShadow: '0 8px 40px rgba(108,63,245,0.45)',
                        marginBottom: 18, fontSize: 38,
                    }}>🐾</div>
                    <h1 style={{ fontSize: '2.4rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #A78BFA, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em' }}>
                        PetNexa
                    </h1>
                    <p style={{ color: 'rgba(248,248,255,0.5)', fontSize: '1rem', fontWeight: 500 }}>
                        {mode === 'login' ? 'Bienvenido de vuelta 👋' : 'Únete a la comunidad 🐶🐱'}
                    </p>
                </motion.div>

                {/* Card */}
                <motion.div
                    layout
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                    style={{
                        background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(108,63,245,0.22)',
                        borderRadius: 28, padding: '40px 36px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    }}
                >
                    {/* Tab switcher */}
                    <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 6, marginBottom: 28 }}>
                        {(['login', 'signup'] as Mode[]).map(m => (
                            <button key={m} onClick={() => switchMode(m)} style={{
                                flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                                position: 'relative', zIndex: 1,
                                background: 'transparent',
                                color: mode === m ? 'white' : 'rgba(248,248,255,0.45)',
                                transition: 'all 0.3s',
                            }}>
                                {mode === m && (
                                    <motion.div
                                        layoutId="activeTab"
                                        style={{
                                            position: 'absolute', inset: 0, zIndex: -1,
                                            background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                            borderRadius: 12,
                                            boxShadow: '0 4px 24px rgba(108,63,245,0.5)',
                                        }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                                {m === 'login' ? 'Entrar' : 'Registrarse'}
                            </button>
                        ))}
                    </div>

                    {/* ── Botón de Google ── */}
                    <button
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        style={{
                            width: '100%', padding: '14px 16px', borderRadius: 14,
                            border: '1px solid rgba(255,255,255,0.1)', cursor: googleLoading ? 'wait' : 'pointer',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#F8F8FF', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.94rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                            transition: 'all 0.2s', marginBottom: 24,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    >
                        {googleLoading ? (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                style={{ fontSize: '1.1rem' }}
                            >⏳</motion.span>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        {googleLoading
                            ? 'Redirigiendo a Google...'
                            : mode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'
                        }
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(108,63,245,0.2)' }} />
                        <span style={{ fontSize: '0.78rem', color: 'rgba(248,248,255,0.35)', letterSpacing: '0.08em', fontWeight: 600 }}>O CON EMAIL</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(108,63,245,0.2)' }} />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.form
                            key={mode}
                            initial={{ opacity: 0, x: mode === 'login' ? -15 : 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: mode === 'login' ? 15 : -15 }}
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            onSubmit={handleSubmit}
                            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                        >
                            {mode === 'signup' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'rgba(248,248,255,0.55)', marginBottom: 8, letterSpacing: '0.02em' }}>Tu nombre completo</label>
                                    <input style={inputStyle} type="text" placeholder="Tu nombre y apellido" value={name} onChange={e => setName(e.target.value)} required={mode === 'signup'}
                                        onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                                        onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                                </motion.div>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'rgba(248,248,255,0.55)', marginBottom: 8, letterSpacing: '0.02em' }}>Email</label>
                                <input style={inputStyle} type="email" placeholder="hola@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required
                                    onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                                    onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: 'rgba(248,248,255,0.55)', marginBottom: 8, letterSpacing: '0.02em' }}>Contraseña</label>
                                <input style={inputStyle} type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                                    onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                                    onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 12, padding: '12px 16px', color: '#FF7070', fontSize: '0.9rem', display: 'flex', gap: 10, alignItems: 'center' }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>⚠️</span> {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 12, padding: '12px 16px', color: '#00E5A0', fontSize: '0.9rem', display: 'flex', gap: 10, alignItems: 'center' }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>✅</span> {success}
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(108,63,245,0.6)' }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: 8, padding: '16px', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                    background: loading ? 'rgba(108,63,245,0.45)' : 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                                    color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem',
                                    boxShadow: loading ? 'none' : '0 6px 30px rgba(108,63,245,0.45)',
                                    transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                }}
                            >
                                {loading ? (
                                    <>
                                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⏳</motion.span>
                                        Iniciando...
                                    </>
                                ) : mode === 'login' ? '🐾 Entrar' : '🚀 Registrarme'}
                            </motion.button>
                        </motion.form>
                    </AnimatePresence>

                    {mode === 'login' && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            style={{ textAlign: 'center', marginTop: 22, fontSize: '0.88rem', color: 'rgba(248,248,255,0.4)' }}
                        >
                            ¿No tienes cuenta?{' '}
                            <button onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A78BFA', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', padding: '0 4px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#00D4FF'} onMouseLeave={e => e.currentTarget.style.color = '#A78BFA'}>
                                Crea una ahora
                            </button>
                        </motion.p>
                    )}
                </motion.div>

                <p style={{ textAlign: 'center', marginTop: 28, fontSize: '0.8rem', color: 'rgba(248,248,255,0.25)', lineHeight: 1.5 }}>
                    Al continuar, aceptas nuestros{' '}
                    <a href="#" style={{ color: 'rgba(167,139,250,0.8)', textDecoration: 'none', fontWeight: 500 }}>Términos de Servicio</a>{' '}y{' '}
                    <a href="#" style={{ color: 'rgba(167,139,250,0.8)', textDecoration: 'none', fontWeight: 500 }}>Política de Privacidad</a>
                </p>
            </div>
        </div>
    )
}
