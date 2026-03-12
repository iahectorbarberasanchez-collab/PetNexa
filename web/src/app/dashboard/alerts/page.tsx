'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus,
    Trash2,
    Search,
    MapPin,
    Calendar,
    Phone,
    Mail,
    AlertCircle,
    CheckCircle2,
    Clock,
    Camera,
    X,
    Filter,
    Dog,
    Cat,
    Bird,
    Rabbit,
    PawPrint
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Alert {
    id: string
    user_id: string
    type: 'lost' | 'found'
    pet_name: string
    species: string
    breed: string | null
    color: string | null
    description: string | null
    last_seen_location: string | null
    last_seen_date: string | null
    contact_phone: string | null
    contact_email: string | null
    image_url: string | null
    status: 'active' | 'resolved'
    created_at: string
    profile?: { display_name: string | null } | null
}

const SPECIES_OPTIONS = [
    { value: 'Dog', label: 'Perro', icon: <Dog size={16} /> },
    { value: 'Cat', label: 'Gato', icon: <Cat size={16} /> },
    { value: 'Bird', label: 'Ave', icon: <Bird size={16} /> },
    { value: 'Rabbit', label: 'Conejo', icon: <Rabbit size={16} /> },
    { value: 'Other', label: 'Otro', icon: <PawPrint size={16} /> },
]

const SPECIES_ICONS: Record<string, React.ReactNode> = {
    Dog: <Dog size={24} />,
    Cat: <Cat size={24} />,
    Bird: <Bird size={24} />,
    Rabbit: <Rabbit size={24} />,
    Other: <PawPrint size={24} />,
}

function daysAgo(d: string): string {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return 'hoy'
    if (diff === 1) return 'ayer'
    return `hace ${diff} días`
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AlertsPage() {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [userId, setUserId] = useState<string | null>(null)
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'lost' | 'found'>('lost')
    const [showForm, setShowForm] = useState(false)

    // Form state
    const [fType, setFType] = useState<'lost' | 'found'>('lost')
    const [fName, setFName] = useState('')
    const [fSpecies, setFSpecies] = useState('Dog')
    const [fBreed, setFBreed] = useState('')
    const [fColor, setFColor] = useState('')
    const [fDesc, setFDesc] = useState('')
    const [fLocation, setFLocation] = useState('')
    const [fDate, setFDate] = useState('')
    const [fPhone, setFPhone] = useState('')
    const [fEmail, setFEmail] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // ── Load & Realtime ────────────────────────────────────────────────────────
    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)

            // Initial fetch
            const { data } = await supabase.from('lost_pets')
                .select(`*, profile:profiles(display_name)`)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
            setAlerts(data || [])
            setLoading(false)

            // Realtime subscription
            channel = supabase.channel('alerts-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_pets' }, async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const { data: newRow } = await supabase.from('lost_pets')
                            .select(`*, profile:profiles(display_name)`)
                            .eq('id', payload.new.id)
                            .single()
                        if (newRow && newRow.status === 'active') {
                            setAlerts(prev => {
                                if (prev.some(a => a.id === newRow.id)) return prev
                                return [newRow, ...prev]
                            })
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        if (payload.new.status === 'resolved') {
                            setAlerts(prev => prev.filter(a => a.id !== payload.new.id))
                        } else {
                            const { data: updatedRow } = await supabase.from('lost_pets')
                                .select(`*, profile:profiles(display_name)`)
                                .eq('id', payload.new.id)
                                .single()
                            if (updatedRow) {
                                setAlerts(prev => prev.map(a => a.id === updatedRow.id ? updatedRow : a))
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setAlerts(prev => prev.filter(a => a.id !== payload.old.id))
                    }
                })
                .subscribe()
        }

        init()
        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [])

    const filtered = alerts.filter(a => a.type === tab)
    const lostCount = alerts.filter(a => a.type === 'lost').length
    const foundCount = alerts.filter(a => a.type === 'found').length

    // ── Image pick ──────────────────────────────────────────────────────────────
    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        setImageFile(f)
        const reader = new FileReader()
        reader.onload = ev => setImagePreview(ev.target?.result as string)
        reader.readAsDataURL(f)
    }

    // ── Submit alert ────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId || !fName.trim() || !fLocation.trim()) return
        setSubmitting(true)

        let imageUrl: string | null = null
        if (imageFile) {
            const ext = imageFile.name.split('.').pop() || 'jpg'
            const path = `${userId}/${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage.from('alert-images').upload(path, imageFile, { contentType: imageFile.type })
            if (!upErr) {
                const { data: { publicUrl } } = supabase.storage.from('alert-images').getPublicUrl(path)
                imageUrl = publicUrl
            }
        }

        const { data, error } = await supabase.from('lost_pets').insert({
            user_id: userId,
            type: fType,
            pet_name: fName.trim(),
            species: fSpecies,
            breed: fBreed.trim() || null,
            color: fColor.trim() || null,
            description: fDesc.trim() || null,
            last_seen_location: fLocation.trim(),
            last_seen_date: fDate || null,
            contact_phone: fPhone.trim() || null,
            contact_email: fEmail.trim() || null,
            image_url: imageUrl,
        }).select(`*, profile:profiles(display_name)`).single()

        if (!error && data) {
            setAlerts(prev => [data, ...prev])
            setTab(fType)
            // Reset form
            setFName(''); setFBreed(''); setFColor(''); setFDesc(''); setFLocation('')
            setFDate(''); setFPhone(''); setFEmail(''); setImageFile(null); setImagePreview(null)
            setShowForm(false)
        }
        setSubmitting(false)
    }

    // ── Resolve alert ───────────────────────────────────────────────────────────
    const handleResolve = async (id: string) => {
        if (!confirm('¿Marcar esta alerta como resuelta (mascota encontrada/reunida)?')) return
        await supabase.from('lost_pets').update({ status: 'resolved' }).eq('id', id)
        setAlerts(prev => prev.filter(a => a.id !== id))
    }

    const handleDelete = async (a: Alert) => {
        if (!confirm('¿Eliminar esta alerta?')) return
        if (a.image_url) {
            const path = a.image_url.split('/alert-images/')[1]
            if (path) await supabase.storage.from('alert-images').remove([path])
        }
        await supabase.from('lost_pets').delete().eq('id', a.id)
        setAlerts(prev => prev.filter(al => al.id !== a.id))
    }

    // ── Styles ────────────────────────────────────────────────────────────────//


    return (
        <div className="dashboard-container">
            <Sidebar />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImagePick}
            />

            <main className="dashboard-main">
                <PageHeader
                    title="Alertas Solidarias"
                    subtitle="Ayuda a reunir mascotas con sus familias"
                    emoji="🚨"
                    action={
                        <PremiumButton onClick={() => setShowForm(true)} icon={<Plus size={18} />}>
                            Publicar Alerta
                        </PremiumButton>
                    }
                />

                {/* Stats Summary */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
                >
                    {[
                        { label: 'Perdidas', value: lostCount, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <AlertCircle size={20} /> },
                        { label: 'Encontradas', value: foundCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <CheckCircle2 size={20} /> },
                        { label: 'Total activas', value: alerts.length, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: <Search size={20} /> },
                    ].map((s, idx) => (
                        <motion.div key={idx} variants={itemVariants}>
                            <GlassCard className={`p-5 flex items-center gap-4 ${s.bg} ${s.border}`}>
                                <div className={`p-3 rounded-xl bg-black/20 ${s.color}`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                                    <div className="text-xs text-white/40 uppercase tracking-wider font-bold">{s.label}</div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit border border-white/10 mb-8">
                    {[
                        { key: 'lost', label: 'Perdidas', icon: <AlertCircle size={16} /> },
                        { key: 'found', label: 'Encontradas', icon: <CheckCircle2 size={16} /> },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as typeof tab)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${tab === t.key
                                ? (t.key === 'lost' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')
                                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                                }`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Alerts Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <Clock className="animate-spin mb-4" size={40} />
                        <p>Cargando alertas de la comunidad...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            {tab === 'lost' ? <PawPrint size={40} className="text-white/20" /> : <CheckCircle2 size={40} className="text-white/20" />}
                        </div>
                        <h2 className="text-xl font-bold mb-2">
                            {tab === 'lost' ? 'No hay mascotas perdidas reportadas' : 'No hay mascotas encontradas reportadas'}
                        </h2>
                        <p className="text-white/40 max-w-md mx-auto">
                            {tab === 'lost' ? '¡Qué buena noticia! Todas las mascotas parecen estar seguras en casa.' : 'Si has visto o rescatado a un animal, publica una alerta para ayudarlo.'}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    >
                        {filtered.map(a => (
                            <motion.div key={a.id} variants={itemVariants}>
                                <GlassCard className="overflow-hidden group flex flex-col h-full border-white/5 hover:border-white/20 transition-all duration-500">
                                    {/* Image Section */}
                                    <div className="relative h-48 w-full overflow-hidden">
                                        {a.image_url ? (
                                            <img src={a.image_url} alt={a.pet_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center ${a.type === 'lost' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                                <div className="text-white/20">
                                                    {SPECIES_ICONS[a.species] || <PawPrint size={48} />}
                                                </div>
                                            </div>
                                        )}
                                        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${a.type === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                            }`}>
                                            {a.type === 'lost' ? 'Perdida' : 'Encontrada'}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-black flex items-center gap-2">
                                                    {a.pet_name}
                                                    <span className="text-xs font-normal text-white/40 bg-white/5 px-2 py-0.5 rounded-md">
                                                        {a.breed || a.species}
                                                    </span>
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
                                                    <Clock size={12} />
                                                    {daysAgo(a.created_at)}
                                                </div>
                                            </div>
                                            {a.user_id === userId && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleResolve(a.id)}
                                                        className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                                                        title="Marcar como resuelta"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(a)}
                                                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {a.description && (
                                            <p className="text-sm text-white/60 mb-4 line-clamp-2 italic">
                                                "{a.description}"
                                            </p>
                                        )}

                                        <div className="space-y-2 mt-auto">
                                            <div className="flex items-center gap-3 text-sm text-white/80">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary">
                                                    <MapPin size={14} />
                                                </div>
                                                <span className="flex-1 truncate">{a.last_seen_location}</span>
                                            </div>
                                            {a.last_seen_date && (
                                                <div className="flex items-center gap-3 text-sm text-white/50">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <Calendar size={14} />
                                                    </div>
                                                    <span>{new Date(a.last_seen_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                                                </div>
                                            )}
                                        </div>

                                        {(a.contact_phone || a.contact_email) && (
                                            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3">
                                                {a.contact_phone && (
                                                    <a href={`tel:${a.contact_phone}`} className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
                                                        <Phone size={14} className="text-primary" />
                                                        Llamar
                                                    </a>
                                                )}
                                                {a.contact_email && (
                                                    <a href={`mailto:${a.contact_email}`} className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
                                                        <Mail size={14} className="text-primary" />
                                                        Email
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>

            {/* Modal de Alerta */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setShowForm(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-2xl z-5 relative"
                        >
                            <GlassCard className="p-8 border-primary/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black">Publicar Alerta</h2>
                                        <p className="text-white/40 text-sm">Completa los datos para ayudar a la comunidad</p>
                                    </div>
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Tipo de Alerta Selector */}
                                    <div className="flex gap-4">
                                        {(['lost', 'found'] as const).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setFType(t)}
                                                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-bold ${fType === t
                                                    ? (t === 'lost' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400')
                                                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                                                    }`}
                                            >
                                                {t === 'lost' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                                {t === 'lost' ? 'He perdido a mi mascota' : 'He encontrado una mascota'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Nombre / Descripción Corta</label>
                                            <div className="relative">
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                                    value={fName}
                                                    onChange={e => setFName(e.target.value)}
                                                    placeholder="Ej: Rex, Golden Retriever..."
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Especie</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                                value={fSpecies}
                                                onChange={e => setFSpecies(e.target.value)}
                                            >
                                                {SPECIES_OPTIONS.map(o => (
                                                    <option key={o.value} value={o.value} className="bg-[#121220]">
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Lugar Visto Por Última Vez</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                                    value={fLocation}
                                                    onChange={e => setFLocation(e.target.value)}
                                                    placeholder="Ej: Barrio de Gracia, Barcelona"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Fecha</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                                <input
                                                    type="date"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all color-scheme-dark"
                                                    value={fDate}
                                                    onChange={e => setFDate(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Teléfono (WhatsApp)</label>
                                            <input
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                                value={fPhone}
                                                onChange={e => setFPhone(e.target.value)}
                                                placeholder="+34 600 000 000"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Email</label>
                                            <input
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                                value={fEmail}
                                                onChange={e => setFEmail(e.target.value)}
                                                placeholder="tu@email.com"
                                                type="email"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Más detalles (Color, raza, señas...)</label>
                                        <textarea
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all min-h-[100px] resize-none"
                                            value={fDesc}
                                            onChange={e => setFDesc(e.target.value)}
                                            placeholder="Detalles que ayuden a identificar..."
                                        />
                                    </div>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative group cursor-pointer"
                                    >
                                        {imagePreview ? (
                                            <div className="relative h-48 rounded-2xl overflow-hidden">
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera size={32} className="text-white" />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                                                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all group">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <Camera className="text-primary" size={24} />
                                                </div>
                                                <p className="text-sm font-bold">Subir foto de la mascota</p>
                                                <p className="text-xs text-white/30 mt-1">Opcional, pero muy recomendado</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4">
                                        <PremiumButton
                                            type="submit"
                                            className="w-full"
                                            disabled={submitting || !fName.trim() || !fLocation.trim()}
                                        >
                                            {submitting ? 'Publicando...' : 'Publicar Alerta Ahora'}
                                        </PremiumButton>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
