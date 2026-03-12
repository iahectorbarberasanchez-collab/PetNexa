'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'
import { Send, Loader2, Bot, Camera, Image as ImageIcon, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface PetContext {
    name: string
    species: string
    breed: string | null
    birth_date: string | null
    weight_kg: number | null
}

const SUGGESTED_QUESTIONS = [
    '¿Cuántas veces al día debo alimentarlo?',
    '¿Qué vacunas necesita próximamente?',
    '¿Cómo sé si tiene fiebre?',
    '¿Cada cuánto debo bañarlo?',
    '¿Qué alimentos humanos son tóxicos?',
]

export default function PetBotPage() {
    const supabase = createClient()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [petContext, setPetContext] = useState<PetContext | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [activeTab, setActiveTab] = useState<'chat' | 'breed'>('chat')

    useEffect(() => {
        loadUserPet()
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const loadUserPet = async () => {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        const { data: pet } = await supabase
            .from('pets')
            .select('name, species, breed, birth_date, weight_kg')
            .eq('owner_id', auth.user.id)
            .limit(1)
            .single()

        if (pet) setPetContext(pet as PetContext)
    }

    const sendMessage = async (text?: string) => {
        const query = (text || input).trim()
        if (!query || loading) return
        setInput('')

        const userMsg: Message = { role: 'user', content: query }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setLoading(true)

        try {
            const res = await fetch('/api/petbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    petContext // Send full context to the AI
                })
            })
            const data = await res.json()
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.text || data.error || 'Error al obtener respuesta.'
            }])
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ No pude conectarme. Comprueba tu conexión.'
            }])
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="dashboard-main relative max-h-screen overflow-hidden flex flex-col">
                <PageHeader
                    title="PetBot AI"
                    subtitle={petContext ? `Asistente veterinario de ${petContext.name}` : "Tu asistente veterinario inteligente"}
                    action={
                        <div className="flex bg-dark-card p-1 rounded-full border border-white/5 shadow-inner">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                            >
                                <div className="flex items-center gap-2"><Bot className="w-4 h-4" /> Chat</div>
                            </button>
                            <button
                                onClick={() => setActiveTab('breed')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'breed' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
                            >
                                <div className="flex items-center gap-2"><Camera className="w-4 h-4" /> IA Visual</div>
                            </button>
                        </div>
                    }
                />

                <div className="flex-1 relative max-w-4xl mx-auto w-full mt-4 flex flex-col min-h-0 bg-dark-bg/50 rounded-t-3xl border-x border-t border-white/5 backdrop-blur-xl shadow-2xl">
                    {activeTab === 'chat' ? (
                        <>
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-4 scrollbar-none">
                                {/* Welcome Screen */}
                                {messages.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center justify-center h-full text-center mt-8 mb-12"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6 relative group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                            <Bot className="w-10 h-10 text-primary relative z-10" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">¡Hola{petContext ? `, dueño de ${petContext.name}` : ''}!</h2>
                                        <p className="text-white/50 max-w-md mx-auto mb-8 text-sm">
                                            Soy PetBot, tu asistente veterinario virtual. Conozco el perfil de tu mascota y puedo ayudarte con dudas precisas sobre salud, alimentación y cuidados.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                                <motion.button
                                                    key={q}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    onClick={() => sendMessage(q)}
                                                    className="p-4 rounded-2xl bg-dark-card border border-white/5 text-left text-sm hover:border-primary/50 hover:bg-white/5 transition-all text-white/80 group"
                                                >
                                                    <span className="text-primary mr-2 opacity-50 group-hover:opacity-100 transition-opacity">✨</span>
                                                    {q}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Chat History */}
                                {messages.map((m, i) => {
                                    const isUser = m.role === 'user'
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                                        >
                                            {!isUser && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(255,107,157,0.3)]">
                                                    <Bot className="w-4 h-4 text-white" />
                                                </div>
                                            )}

                                            <div className={`
                                                px-5 py-3.5 text-[15px] leading-relaxed break-words shadow-sm
                                                ${isUser
                                                    ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-2xl rounded-tr-sm'
                                                    : 'bg-dark-card border border-white/5 text-white/90 rounded-2xl rounded-tl-sm'
                                                }
                                            `}>
                                                {m.content}
                                            </div>
                                        </motion.div>
                                    )
                                })}

                                {/* Typing Indicator */}
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex gap-3 max-w-[85%] mr-auto"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(255,107,157,0.3)]">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="px-5 py-4 bg-dark-card border border-white/5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce shadow-[0_0_5px_rgba(255,107,157,0.5)]" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce shadow-[0_0_5px_rgba(255,107,157,0.5)]" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce shadow-[0_0_5px_rgba(255,107,157,0.5)]" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={bottomRef} className="h-2" />
                            </div>

                            {/* Input Bar */}
                            <div className="px-4 py-4 md:px-8 border-t border-white/5 bg-dark-bg/80 backdrop-blur-xl shrink-0">
                                <form
                                    onSubmit={e => { e.preventDefault(); sendMessage() }}
                                    className="relative flex items-center gap-3"
                                >
                                    <div className="relative flex-1 group">
                                        <input
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            placeholder="Pregunta algo sobre tu mascota..."
                                            className="w-full bg-white/5 border border-white/10 rounded-[24px] py-4 pl-6 pr-12 text-white placeholder-white/40 text-[15px] focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all shadow-inner"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className={`
                                            w-14 h-14 rounded-full shrink-0 flex items-center justify-center transition-all duration-300
                                            ${input.trim() && !loading
                                                ? 'bg-gradient-to-r from-primary to-secondary shadow-[0_4px_20px_rgba(255,107,157,0.4)] scale-100 hover:scale-105 active:scale-95 text-white cursor-pointer'
                                                : 'bg-white/5 text-white/20 border border-white/5 scale-95 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                                        ) : (
                                            <Send className="w-5 h-5 ml-0.5" strokeWidth={2.5} />
                                        )}
                                    </button>
                                </form>
                                <div className="text-center mt-3 text-[11px] text-white/30 font-medium tracking-wide">
                                    PetBot puede cometer errores. Considera verificar la información importante con un veterinario.
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="overflow-y-auto w-full h-full p-6 md:p-8">
                            <BreedDetector />
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

// ─── BREED DETECTOR COMPONENT ────────────────────────────────────────────────
function BreedDetector() {
    const [image, setImage] = useState<string | null>(null)
    const [mimeType, setMimeType] = useState('image/jpeg')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return
        setMimeType(file.type)
        setResult(null)
        setError(null)
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1]
            setImage(base64)
        }
        reader.readAsDataURL(file)
    }

    const detect = async () => {
        if (!image) return
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const res = await fetch('/api/detect-breed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: image, mimeType })
            })
            const data = await res.json()
            if (data.error) {
                setError(data.error)
            } else {
                setResult(data)
            }
        } catch {
            setError('Error de conexión al analizar la imagen.')
        } finally {
            setLoading(false)
        }
    }

    const confidenceColor = (c: string) =>
        c === 'Alta' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
            c === 'Media' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                'text-red-400 bg-red-400/10 border-red-400/20'

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={image ? 'preview' : 'upload'}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`
                        w-full rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
                        ${image ? 'border-primary/30 bg-transparent' : 'border-white/10 hover:border-primary/50 bg-dark-card hover:bg-white/5 py-16'}
                    `}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onDragOver={e => e.preventDefault()}
                >
                    {image ? (
                        <div className="relative w-full aspect-video group">
                            <img
                                src={`data:${mimeType};base64,${image}`}
                                alt="preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                <ImageIcon className="w-10 h-10 text-white mb-2" />
                                <span className="text-white font-medium">Cambiar foto</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center px-6">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                <Camera className="w-10 h-10 text-white/50" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Sube una foto de tu mascota</h3>
                            <p className="text-white/40 text-sm max-w-sm">
                                Nuestra IA analizará los rasgos físicos para detectar la raza con alta precisión (JPG, PNG o WEBP · Máx. 10MB)
                            </p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                </motion.div>
            </AnimatePresence>

            {image && !result && (
                <PremiumButton
                    onClick={detect}
                    disabled={loading}
                    className="w-full py-4 text-lg"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                    )}
                    {loading ? 'Analizando...' : 'Analizar Fotografía'}
                </PremiumButton>
            )}

            {error && (
                <GlassCard className="border-red-500/30 bg-red-500/10">
                    <p className="text-red-400 text-center font-medium">{error}</p>
                </GlassCard>
            )}

            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GlassCard className="relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-primary/20 transition-colors"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5">{result.species}</div>
                                    <h3 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                        {result.breed}
                                    </h3>
                                </div>
                                {result.confidence && (
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${confidenceColor(result.confidence)}`}>
                                        {result.confidence} Precisión
                                    </span>
                                )}
                            </div>

                            {result.characteristics?.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Rasgos Detectados</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.characteristics.map((c: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white/80">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.tips && (
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 flex gap-4 mt-6">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-sm text-white/80 leading-relaxed m-0 self-center">
                                        {result.tips}
                                    </p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            )}
        </div>
    )
}
