'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Plus,
    Activity,
    Bell,
    PawPrint,
    Heart,
    AlertTriangle,
    Map as MapIcon,
    ChevronRight,
    Calendar,
    Zap
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { ProactiveTip } from '@/components/ui/ProactiveTip'

interface Pet {
    id: string; name: string; species: string; avatar_url: string | null; breed?: string; birth_date?: string; weight?: number; conditions?: string[]
}
interface HealthRecord {
    id: string; title: string; next_due_date: string | null; pet_id: string; record_type: string
}

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🐦', Fish: '🐠', Rabbit: '🐇', Hamster: '🐹', Reptile: '🦎', Other: '🐾',
}
const SPECIES_COLOR: Record<string, string> = {
    Dog: '#F59E0B', Cat: '#8B5CF6', Bird: '#00D4FF', Fish: '#06B6D4',
    Rabbit: '#EC4899', Hamster: '#F97316', Reptile: '#10B981', Other: '#6C3FF5',
}

function daysUntil(dateStr: string): number {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
    const supabase = createClient()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [pets, setPets] = useState<Pet[]>([])
    const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(true)
    const [today, setToday] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        setToday(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))

        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUser(user)

            const [petsRes, recsRes, profileRes] = await Promise.all([
                supabase.from('pets').select('*').order('created_at'),
                supabase.from('health_records').select('id, title, next_due_date, pet_id, record_type').not('next_due_date', 'is', null),
                supabase.from('profiles').select('display_name').eq('id', user.id).single(),
            ])

            setPets(petsRes.data || [])
            setHealthRecords(recsRes.data || [])

            const name = profileRes.data?.display_name
                || user.user_metadata?.full_name
                || user.email?.split('@')[0]
                || 'Usuario'
            setDisplayName(name)
            setLoading(false)
        })
    }, [])

    if (!mounted || loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#07070F]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-5xl mb-4"
                >
                    🐾
                </motion.div>
                <p className="text-[#F8F8FF66] font-['Outfit'] tracking-wide">Cargando tu ecosistema PetNexa...</p>
            </motion.div>
        </div>
    )


    const upcoming = healthRecords
        .filter(r => r.next_due_date && daysUntil(r.next_due_date) >= 0)
        .sort((a, b) => new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime())

    const nextDue = upcoming[0]
    const nextDueDays = nextDue && nextDue.next_due_date ? daysUntil(nextDue.next_due_date) : null
    const nextDueLabel = nextDueDays === null ? '—' : nextDueDays === 0 ? '¡Hoy!' : `${nextDueDays}d`

    const metrics = [
        { icon: <PawPrint size={20} />, label: 'Mis Mascotas', value: String(pets.length), color: '#8B5CF6', href: '/dashboard/pets' },
        { icon: <Activity size={20} />, label: 'Próxima cita', value: nextDueLabel, color: '#00D4FF', href: '/dashboard/health' },
        { icon: <Heart size={20} />, label: 'Salud (Registros)', value: String(healthRecords.length), color: '#10B981', href: '/dashboard/health' },
        { icon: <Bell size={20} />, label: 'Alertas activas', value: String(upcoming.length), color: '#F59E0B', href: '/dashboard/alerts' },
    ]

    const quickActions = [
        { icon: <Plus size={20} />, title: 'Nuevo Registro', desc: 'Vacuna o revisión', href: '/dashboard/health', color: '#00D4FF' },
        { icon: <Calendar size={20} />, title: 'Calendario', desc: 'Control de citas', href: '/dashboard/health', color: '#8B5CF6' },
        { icon: <AlertTriangle size={20} />, title: 'Mascota Perdida', desc: 'Alerta SOS real-time', href: '/dashboard/alerts', color: '#EF4444' },
        { icon: <MapIcon size={20} />, title: 'Mapa Pet-Friendly', desc: 'Lugares cercanos', href: '/dashboard/map', color: '#00E5A0' },
    ]

    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="dashboard-main lg:lg:ml-[260px]">
                <div className="noise-overlay" />

                {/* Visual Background Orbs */}
                <div className="orb w-[600px] h-[600px] -top-32 -right-32 bg-[radial-gradient(circle,rgba(108,63,245,0.07)_0%,transparent_70%)]" />
                <div className="orb w-[500px] h-[500px] bottom-0 -left-32 bg-[radial-gradient(circle,rgba(0,212,255,0.05)_0%,transparent_70%)]" />

                <div className="relative z-10">
                    {/* Header */}
                    <PageHeader
                        title={`Hola, ${displayName}`}
                        subtitle={today}
                        emoji="👋"
                        action={
                            <PremiumButton
                                href="/dashboard/pets/new"
                                icon={<Plus size={18} />}
                            >
                                Añadir Mascota
                            </PremiumButton>
                        }
                    />

                    {/* ── STAT CARDS ROW ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                        {metrics.map((m, i) => (
                            <StatCard
                                key={i}
                                icon={m.icon}
                                label={m.label}
                                value={m.value}
                                color={m.color}
                                href={m.href}
                                delay={i * 0.1}
                            />
                        ))}
                    </div>

                    {/* ── BENTO MAIN GRID ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

                        {/* LEFT COLUMN — 2/3 */}
                        <div className="lg:col-span-2 flex flex-col gap-6">

                            {/* PETS WIDGET */}
                            <GlassCard className="!p-7" hover={false}>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-[#F8F8FF] font-['Outfit'] font-bold text-base flex items-center gap-2">
                                        <PawPrint size={18} className="text-[#8B5CF6]" />
                                        Tus Mascotas
                                    </h2>
                                    <Link href="/dashboard/pets" className="text-[#A78BFA] text-xs font-semibold hover:underline flex items-center gap-1">
                                        Ver todas <ChevronRight size={13} />
                                    </Link>
                                </div>

                                {pets.length > 0 ? (
                                    <div className="flex gap-4 flex-wrap">
                                        {pets.map((pet, i) => {
                                            const color = SPECIES_COLOR[pet.species] || '#6C3FF5'
                                            return (
                                                <motion.div
                                                    key={pet.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.2 + (i * 0.05) }}
                                                >
                                                    <Link href={`/dashboard/pets/${pet.id}`}>
                                                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer group transition-all hover:bg-[#ffffff08]"
                                                            style={{ border: `1px solid ${color}22`, background: `${color}08` }}>
                                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                                {pet.avatar_url ? (
                                                                    <img
                                                                        src={pet.avatar_url}
                                                                        alt={pet.name}
                                                                        className="w-12 h-12 rounded-full object-cover"
                                                                        style={{ border: `2px solid ${color}44` }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-full bg-[#111120] flex items-center justify-center text-2xl"
                                                                        style={{ border: `2px solid ${color}33` }}>
                                                                        {SPECIES_EMOJI[pet.species] || '🐾'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-['Outfit'] font-bold text-sm text-[#F8F8FF]">{pet.name}</div>
                                                                <div className="text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color }}>{pet.species}</div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            )
                                        })}
                                        <Link href="/dashboard/pets/new">
                                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer group transition-all hover:bg-[#6C3FF511] border border-dashed border-[#6C3FF533]">
                                                <div className="w-12 h-12 rounded-full bg-[#6C3FF515] flex items-center justify-center text-[#8B5CF6] group-hover:scale-110 transition-transform">
                                                    <Plus size={22} />
                                                </div>
                                                <span className="text-[#A78BFA] font-['Outfit'] font-bold text-sm">Añadir</span>
                                            </div>
                                        </Link>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex flex-col items-center justify-center py-8 text-center"
                                    >
                                        <div className="text-5xl mb-4 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">🐾</div>
                                        <h3 className="font-['Outfit'] text-base font-bold mb-2">Empieza tu aventura</h3>
                                        <p className="text-[#F8F8FF55] mb-6 text-sm leading-relaxed max-w-xs">
                                            Registra a tu primera mascota para desbloquear todas las funciones.
                                        </p>
                                        <PremiumButton href="/dashboard/pets/new" icon={<Plus size={16} />}>
                                            Registrar mascota
                                        </PremiumButton>
                                    </motion.div>
                                )}
                            </GlassCard>

                            {/* QUICK ACTIONS 2×2 */}
                            <div>
                                <h2 className="text-[#F8F8FF33] font-['Outfit'] font-bold text-[10px] tracking-[0.2em] uppercase mb-3">
                                    Accesos Directos
                                </h2>
                                <div className="grid grid-cols-2 gap-5">
                                    {quickActions.map((action, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 + (i * 0.08) }}
                                        >
                                            <Link href={action.href}>
                                                <GlassCard className="!p-5 group">
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                                            style={{
                                                                backgroundColor: `${action.color}15`,
                                                                color: action.color,
                                                                border: `1px solid ${action.color}25`,
                                                                boxShadow: `0 4px 12px ${action.color}15`,
                                                            }}
                                                        >
                                                            {action.icon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-['Outfit'] font-bold text-sm text-[#F8F8FF] truncate">{action.title}</div>
                                                            <p className="text-[11px] text-[#F8F8FF44] mt-0.5 leading-tight">{action.desc}</p>
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN — 1/3 */}
                        <div className="flex flex-col gap-6">

                            {/* UPCOMING APPOINTMENTS */}
                            <GlassCard className="!p-7 flex-1" hover={false}>
                                <h2 className="text-[#F8F8FF] font-['Outfit'] font-bold text-base mb-6 flex items-center gap-2">
                                    <Activity size={18} className="text-[#00D4FF]" />
                                    Próximas Citas
                                </h2>
                                    {upcoming.length > 0 ? (
                                        <div className="space-y-3">
                                            {upcoming.slice(0, 5).map((rec, i) => {
                                                const days = daysUntil(rec.next_due_date!)
                                                const dotColor = days <= 7 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#00E5A0'
                                                const pet = pets.find(p => p.id === rec.pet_id)
                                                return (
                                                    <motion.div
                                                        key={rec.id}
                                                        initial={{ opacity: 0, x: 12 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 + (i * 0.08) }}
                                                        whileHover={{ x: 4 }}
                                                    >
                                                        <Link href="/dashboard/health">
                                                            <div className="flex items-center gap-3 p-3 rounded-xl group hover:bg-[#ffffff05] transition-all cursor-pointer bg-white/[0.02]"
                                                                style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                                                                <div
                                                                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}88` }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-['Outfit'] font-bold text-xs text-[#F8F8FF] truncate">{rec.title}</div>
                                                                    <div className="text-[10px] text-[#F8F8FF44] mt-0.5 font-medium">
                                                                        {pet?.name || 'Mascota'} · {fmtDate(rec.next_due_date!)}
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="text-[10px] font-black tracking-tight px-2.5 py-1.5 rounded-lg flex-shrink-0"
                                                                    style={{ color: dotColor, background: `${dotColor}20`, border: `1px solid ${dotColor}30` }}
                                                                >
                                                                    {days === 0 ? 'HOY' : `${days}d`}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="w-14 h-14 rounded-full bg-[#F8F8FF0A] flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                                                <Calendar className="text-[#F8F8FF22]" size={24} />
                                            </div>
                                            <p className="text-xs text-[#F8F8FF33] font-medium max-w-[150px] leading-relaxed">No hay citas pendientes próximamente</p>
                                        </div>
                                    )}
                                {upcoming.length > 0 && (
                                    <Link href="/dashboard/health" className="mt-4 flex items-center justify-center gap-1 text-[#A78BFA] text-xs font-semibold hover:underline pt-3 border-t border-[#ffffff08]">
                                        Ver todas <ChevronRight size={12} />
                                    </Link>
                                )}
                            </GlassCard>

                            {/* PETBOT IQ */}
                            {pets.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <ProactiveTip pet={pets[0]} />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

