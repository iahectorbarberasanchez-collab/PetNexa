'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Breadcrumbs from '@/components/Breadcrumbs'
import {
    Plus,
    Trash2,
    Calendar,
    Clock,
    Stethoscope,
    Syringe,
    Bug,
    CheckCircle2,
    AlertCircle,
    Pill,
    Activity,
    Scissors,
    ClipboardList,
    Filter,
    X,
    ChevronRight,
    Search,
    PawPrint
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'

// ── Types ────────────────────────────────────────────────────────────────────
interface Pet { id: string; name: string; species: string }

interface HealthRecord {
    id: string
    pet_id: string
    record_type: string
    title: string
    date_administered: string
    next_due_date: string | null
    notes: string | null
    created_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const RECORD_TYPES = [
    { value: 'vaccine', label: 'Vacuna', icon: Syringe, color: '#6C3FF5' },
    { value: 'deworming', label: 'Desparasitación', icon: Bug, color: '#F97316' },
    { value: 'checkup', label: 'Revisión', icon: Stethoscope, color: '#00D4FF' },
    { value: 'medication', label: 'Medicación', icon: Pill, color: '#EC4899' },
    { value: 'surgery', label: 'Cirugía / Prueba', icon: Activity, color: '#EF4444' },
    { value: 'grooming', label: 'Peluquería', icon: Scissors, color: '#10B981' },
    { value: 'other', label: 'Otro', icon: ClipboardList, color: '#A78BFA' },
]

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
    vaccine: { label: 'Vacuna', color: '#6C3FF5', icon: Syringe },
    deworming: { label: 'Desparasitación', color: '#F97316', icon: Bug },
    checkup: { label: 'Revisión', color: '#00D4FF', icon: Stethoscope },
    medication: { label: 'Medicación', color: '#EC4899', icon: Pill },
    surgery: { label: 'Cirugía / Prueba', color: '#EF4444', icon: Activity },
    grooming: { label: 'Peluquería', color: '#10B981', icon: Scissors },
    other: { label: 'Otro', color: '#A78BFA', icon: ClipboardList },
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(d: string) {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
    return diff
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HealthPage() {
    const supabase = createClient()
    const router = useRouter()

    const [pets, setPets] = useState<Pet[]>([])
    const [records, setRecords] = useState<HealthRecord[]>([])
    const [selectedPetId, setSelectedPetId] = useState<string>('all')
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [petbotTip, setPetbotTip] = useState<string | null>(null)
    const [tipLoading, setTipLoading] = useState(false)

    // Form state
    const [fPetId, setFPetId] = useState('')
    const [fType, setFType] = useState('vaccine')
    const [fTitle, setFTitle] = useState('')
    const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0])
    const [fNextDate, setFNextDate] = useState('')
    const [fNotes, setFNotes] = useState('')
    const [fSaving, setFSaving] = useState(false)
    const [fError, setFError] = useState<string | null>(null)

    // ── Load ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            loadAll(user.id)
        })
    }, [])

    const loadAll = async (userId: string) => {
        setLoading(true)
        // Fetch user's pets with correct column names from schema
        const { data: petsData } = await supabase
            .from('pets')
            .select('id, name, species, breed, birth_date, weight_kg')
            .eq('owner_id', userId)
            .order('created_at')

        if (petsData) {
            setPets(petsData)
            if (petsData.length > 0 && !fPetId) setFPetId(petsData[0].id)
            // Load PetBot IQ tip for first pet
            if (petsData.length > 0) loadPetbotTip(petsData[0])
        }

        // health_records has no owner_id: filter by pet_ids belonging to user
        if (petsData && petsData.length > 0) {
            const petIds = petsData.map(p => p.id)
            const { data: recData } = await supabase
                .from('health_records')
                .select('*')
                .in('pet_id', petIds)
                .order('date_administered', { ascending: false })
            if (recData) setRecords(recData)
        }
        setLoading(false)
    }

    const loadPetbotTip = async (pet: any) => {
        setTipLoading(true)
        try {
            const res = await fetch('/api/petbot/tip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ petContext: pet })
            })
            const data = await res.json()
            if (data.tip) setPetbotTip(data.tip)
        } catch {
            // silently fail – show static tip
        } finally {
            setTipLoading(false)
        }
    }

    // ── Filtered records ────────────────────────────────────────────────────────
    const filtered = selectedPetId === 'all'
        ? records
        : records.filter(r => r.pet_id === selectedPetId)

    // Upcoming reminders: next_due_date in the future
    const upcoming = records
        .filter(r => r.next_due_date && daysUntil(r.next_due_date) > 0)
        .sort((a, b) => new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime())
        .slice(0, 4)

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`¿Eliminar "${title}"?`)) return
        setDeleting(id)
        await supabase.from('health_records').delete().eq('id', id)
        setRecords(prev => prev.filter(r => r.id !== id))
        setDeleting(null)
    }

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fPetId) { setFError('Selecciona una mascota.'); return }
        setFSaving(true); setFError(null)
        const { data, error } = await supabase.from('health_records').insert({
            pet_id: fPetId,
            record_type: fType,
            title: fTitle.trim(),
            date_administered: fDate,
            next_due_date: fNextDate || null,
            notes: fNotes.trim() || null,
        }).select().single()
        if (error) { setFError(error.message); setFSaving(false); return }
        setRecords(prev => [data, ...prev])
        setShowModal(false)
        setFTitle(''); setFType('vaccine'); setFNextDate(''); setFNotes('')
        setFSaving(false)
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="dashboard-main lg:lg:ml-[260px]">
                <div className="[&>nav]:mb-4"><Breadcrumbs items={[{ label: 'Salud' }]} /></div>
                <PageHeader
                    title="Cartilla Veterinaria"
                    subtitle="Historial médico completo de tus compañeros"
                    emoji="💉"
                    action={
                        <div className="flex gap-3">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <select
                                    value={selectedPetId}
                                    onChange={e => setSelectedPetId(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none"
                                >
                                    <option value="all">Todas las mascotas</option>
                                    {pets.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <PremiumButton onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
                                Nuevo Registro
                            </PremiumButton>
                        </div>
                    }
                />

                {/* Empty state – no pets */}
                {!loading && pets.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="flex flex-col items-center justify-center p-12 text-center"
                    >
                        <GlassCard className="max-w-xl p-12 flex flex-col items-center border-dashed border-white/10">
                            <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-8 relative"
                            >
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                <Stethoscope size={48} className="text-primary relative z-10" />
                            </motion.div>
                            <h2 className="text-2xl font-bold mb-4 font-outfit">Primero añade una mascota</h2>
                            <p className="text-white/50 mb-8 max-w-md leading-relaxed">
                                Para llevar el control de la cartilla veterinaria y recibir consejos inteligentes, primero necesitamos conocer a tu compañero.
                            </p>
                            <PremiumButton href="/dashboard/pets/new" icon={<Plus size={18} />}>
                                Añadir mi primera mascota
                            </PremiumButton>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Main Content Grid */}
                {!loading && pets.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Timeline Column */}
                        <div className="lg:col-span-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} /> HISTORIAL — {filtered.length} REGISTROS
                                </h3>
                            </div>

                            {filtered.length === 0 && (
                                <GlassCard className="p-12 text-center border-dashed border-white/10 flex flex-col items-center">
                                    <ClipboardList size={40} className="text-white/20 mb-4" />
                                    <h4 className="text-lg font-bold mb-2">Sin registros aún</h4>
                                    <p className="text-white/40 text-sm max-w-xs mx-auto">
                                        Empieza a registrar las vacunas, revisiones y desparasitaciones de tu mascota.
                                    </p>
                                </GlassCard>
                            )}

                            <div className="relative space-y-4">
                                {filtered.length > 0 && (
                                    <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-transparent opacity-20 hidden md:block" />
                                )}
                                <AnimatePresence mode="popLayout">
                                    {filtered.map((rec, idx) => {
                                        const meta = TYPE_META[rec.record_type] || TYPE_META.other
                                        const pet = pets.find(p => p.id === rec.pet_id)
                                        const isDel = deleting === rec.id
                                        const Icon = meta.icon

                                        return (
                                            <motion.div
                                                key={rec.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`flex gap-4 md:gap-6 relative ${isDel ? 'opacity-50 grayscale' : ''}`}
                                            >
                                                {/* Icon Dot */}
                                                <div className="hidden md:flex w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 items-center justify-center shrink-0 z-10 backdrop-blur-xl transition-all hover:scale-110 shadow-lg" style={{ borderColor: `${meta.color}30`, boxShadow: `0 8px 16px ${meta.color}10` }}>
                                                    <Icon size={24} style={{ color: meta.color }} />
                                                </div>

                                                <GlassCard className="flex-1 p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-colors border-white/5">
                                                    {/* Type Indicator Line */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-40 group-hover:opacity-100 transition-opacity" style={{ background: meta.color }} />

                                                    <div className="flex justify-between items-start gap-4 mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <h4 className="font-bold text-lg text-white group-hover:text-primary-light transition-colors">{rec.title}</h4>
                                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}25` }}>
                                                                    {meta.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-white/40">
                                                                <div className="flex items-center gap-1.5 font-bold text-white/60">
                                                                    <PawPrint size={13} className="text-primary/70" /> {pet?.name}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 font-medium">
                                                                    <Calendar size={13} className="opacity-70" /> {fmtDate(rec.date_administered)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <PremiumButton
                                                            onClick={() => handleDelete(rec.id, rec.title)}
                                                            variant="ghost"
                                                            className="!w-10 !h-10 !p-0 opacity-0 group-hover:opacity-100 transition-all hover:!bg-red-500/10"
                                                            disabled={isDel}
                                                            icon={<Trash2 size={18} className="text-red-400" />}
                                                        >
                                                            {''}
                                                        </PremiumButton>
                                                    </div>

                                                    {rec.notes && (
                                                        <div className="relative mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                            <p className="text-sm text-white/50 leading-relaxed italic">
                                                                {rec.notes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {rec.next_due_date && (
                                                        <motion.div 
                                                            whileHover={{ scale: 1.01 }}
                                                            className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 mt-2"
                                                        >
                                                            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-sm">
                                                                <AlertCircle size={18} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-[10px] uppercase tracking-[0.1em] text-white/30 font-black mb-0.5">Próxima cita planificada</div>
                                                                <div className="text-sm font-bold flex items-center justify-between">
                                                                    <span className="text-white/90">{fmtDate(rec.next_due_date)}</span>
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${daysUntil(rec.next_due_date) < 30 ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                                        {daysUntil(rec.next_due_date) > 0
                                                                            ? `en ${daysUntil(rec.next_due_date)} días`
                                                                            : '¡Vencido!'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </GlassCard>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Reminders Column */}
                        <div className="lg:col-span-4 space-y-6">
                            <div>
                                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 mb-6">
                                    <AlertCircle size={14} /> RECORDATORIOS PRÓXIMOS
                                </h3>

                                {upcoming.length === 0 ? (
                                    <GlassCard className="p-8 text-center border-dashed border-white/10">
                                        <CheckCircle2 size={32} className="text-emerald-500/30 mb-3 mx-auto" />
                                        <p className="text-white/40 text-sm italic">Todo al día. No hay citas próximas.</p>
                                    </GlassCard>
                                ) : (
                                    <div className="space-y-4">
                                        {upcoming.map((r, idx) => {
                                            const meta = TYPE_META[r.record_type] || TYPE_META.other
                                            const days = daysUntil(r.next_due_date!)
                                            const isUrgent = days < 7
                                            const progress = Math.max(10, 100 - (days / 30) * 100)

                                            return (
                                                <motion.div
                                                    key={r.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                >
                                                    <GlassCard className="p-4 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1"
                                                            style={{ background: isUrgent ? '#EF4444' : meta.color }}
                                                        />

                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-bold text-sm text-white/90">{r.title}</div>
                                                            {isUrgent && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                                                        </div>

                                                        <div className="text-xs text-white/40 mb-3 flex items-center justify-between">
                                                            <span>{fmtDate(r.next_due_date!)}</span>
                                                            <span className={isUrgent ? 'text-red-500 font-bold' : 'text-white/60 font-medium'}>
                                                                {isUrgent ? '¡Urgente!' : `en ${days} días`}
                                                            </span>
                                                        </div>

                                                        {/* Simple progress bar */}
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                className="h-full rounded-full"
                                                                style={{ background: isUrgent ? '#EF4444' : meta.color }}
                                                            />
                                                        </div>
                                                    </GlassCard>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Proactive Tip Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <GlassCard className="p-7 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-primary/30 relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                                    <h4 className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] mb-4 text-primary-light">
                                        <Activity size={16} className="animate-pulse" /> PetBot IQ Advise
                                    </h4>
                                    {tipLoading ? (
                                        <div className="flex items-center gap-3 text-white/40">
                                            <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                            <span className="text-sm font-medium tracking-wide">Analizando datos biométricos...</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <p className="text-sm text-white/80 leading-relaxed font-medium">
                                                {petbotTip || '🐾 Mantener al día la desparasitación previene enfermedades graves en el corazón y pulmones. ¡Un pequeño gesto hoy es mucha salud mañana!'}
                                            </p>
                                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                                                <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Powered by PetNexa AI</div>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            </motion.div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Modal (Glassmorphism) ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setShowModal(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-xl z-5 relative"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary-light/50 rounded-[2.5rem] blur-2xl opacity-20" />
                            <GlassCard className="p-8 border-primary/30 shadow-2xl overflow-visible relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-light">
                                            <Syringe size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold font-outfit">Nuevo Registro</h2>
                                            <p className="text-white/40 text-sm">Añade información médica importante</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/30 hover:text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Mascota *</label>
                                            <div className="relative">
                                                <select
                                                    value={fPetId}
                                                    onChange={e => setFPetId(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                                                >
                                                    <option value="">Selecciona...</option>
                                                    {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 rotate-90" size={16} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Tipo *</label>
                                            <div className="relative">
                                                <select
                                                    value={fType}
                                                    onChange={e => setFType(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                                                >
                                                    {RECORD_TYPES.map(rt => (
                                                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 rotate-90" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Título del Registro *</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Vacuna Rabia 2025"
                                            value={fTitle}
                                            onChange={e => setFTitle(e.target.value)}
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Fecha Realizado *</label>
                                            <input
                                                type="date"
                                                value={fDate}
                                                onChange={e => setFDate(e.target.value)}
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Próxima Cita (Opcional)</label>
                                            <input
                                                type="date"
                                                value={fNextDate}
                                                onChange={e => setFNextDate(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Notas u Observaciones</label>
                                        <textarea
                                            placeholder="Añade detalles sobre la dosis, centro veterinario o recomendaciones..."
                                            value={fNotes}
                                            onChange={e => setFNotes(e.target.value)}
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none placeholder:text-white/10"
                                        />
                                    </div>

                                    {fError && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            <AlertCircle size={16} /> {fError}
                                        </div>
                                    )}

                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <PremiumButton
                                            className="flex-1 py-4 text-base font-bold shadow-[0_10px_20px_-5px_rgba(108,63,245,0.3)] group"
                                            disabled={fSaving || !fTitle || !fPetId}
                                            icon={<CheckCircle2 size={20} className={fSaving ? 'animate-spin' : 'group-hover:scale-110 transition-transform'} />}
                                            type="submit"
                                        >
                                            {fSaving ? 'Guardando...' : 'Guardar en la Cartilla'}
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
