'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus,
    Trash2,
    Search,
    PawPrint,
    ChevronRight,
    Weight,
    Calendar,
    Cat,
    Dog,
    Bird,
    Fish
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Pet {
    id: string
    name: string
    species: string
    breed: string | null
    birth_date: string | null
    weight_kg: number | null
    avatar_url: string | null
    created_at: string
}

const SPECIES_ICONS: Record<string, any> = {
    Dog,
    Cat,
    Bird,
    Fish,
}

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🐦', Fish: '🐠',
    Rabbit: '🐇', Hamster: '🐹', Reptile: '🦎', Other: '🐾',
}

const SPECIES_COLOR: Record<string, string> = {
    Dog: '#F59E0B', Cat: '#8B5CF6', Bird: '#00D4FF', Fish: '#06B6D4',
    Rabbit: '#EC4899', Hamster: '#F97316', Reptile: '#10B981', Other: '#6C3FF5',
}

function calcAge(birthDate: string | null): string {
    if (!birthDate) return 'Edad desconocida'
    const birth = new Date(birthDate)
    const now = new Date()
    const total = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (total < 1) return 'Recién nacido'
    if (total < 12) return `${total} ${total === 1 ? 'mes' : 'meses'}`
    const y = Math.floor(total / 12)
    const m = total % 12
    return m > 0 ? `${y}a ${m}m` : `${y} ${y === 1 ? 'año' : 'años'}`
}

export default function PetsPage() {
    const supabase = createClient()
    const router = useRouter()
    const [pets, setPets] = useState<Pet[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)
            fetchPets(user.id)
        })
    }, [])

    const fetchPets = async (uid?: string) => {
        const ownerFilter = uid || userId
        if (!ownerFilter) return
        setLoading(true)
        const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('owner_id', ownerFilter)
            .order('created_at', { ascending: true })
        if (!error && data) setPets(data)
        setLoading(false)
    }

    const handleDelete = async (petId: string, petName: string) => {
        if (!confirm(`¿Eliminar a ${petName}? Esta acción no se puede deshacer.`)) return
        setDeletingId(petId)
        const { error } = await supabase.from('pets').delete().eq('id', petId)
        if (!error) setPets(prev => prev.filter(p => p.id !== petId))
        setDeletingId(null)
    }

    const filteredPets = pets.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.breed && p.breed.toLowerCase().includes(searchQuery.toLowerCase()))
    )

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

    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="dashboard-main lg:lg:ml-[260px]">
                <PageHeader
                    title="Mis Mascotas"
                    subtitle={loading ? 'Cargando tus compañeros...' : `${pets.length} ${pets.length === 1 ? 'mascota registrada' : 'mascotas registradas'}`}
                    emoji="🐾"
                    action={
                        <PremiumButton href="/dashboard/pets/new" icon={<Plus size={18} />}>
                            Añadir Mascota
                        </PremiumButton>
                    }
                />

                {/* Filters / Search */}
                {!loading && pets.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar mascota por nombre o raza..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '12px',
                                    padding: '10px 14px 10px 38px',
                                    color: '#F8F8FF',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(108,63,245,0.45)')}
                                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="h-36 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                <div className="p-4 flex flex-col gap-3">
                                    <div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: '60%' }} />
                                    <div className="h-3 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', width: '40%' }} />
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                        <div className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && pets.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div
                            className="rounded-[22px] max-w-md w-full p-10 flex flex-col items-center"
                            style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <div className="w-18 h-18 rounded-full flex items-center justify-center mb-5 text-4xl"
                                style={{ background: 'rgba(108,63,245,0.12)', width: 72, height: 72 }}>
                                🐾
                            </div>
                            <h2 className="text-xl font-bold mb-3">¡Tu familia peludita te espera!</h2>
                            <p className="text-white/40 mb-7 text-sm leading-relaxed max-w-xs">
                                Registra a tu compañero y empieza a llevar su cartilla médica, subir fotos y mucho más.
                            </p>
                            <PremiumButton href="/dashboard/pets/new" icon={<Plus size={16} />}>
                                Registrar mi primera mascota
                            </PremiumButton>
                        </div>
                    </motion.div>
                )}

                {/* Pet Grid */}
                {!loading && pets.length > 0 && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredPets.map(pet => {
                                const Icon = SPECIES_ICONS[pet.species] || PawPrint
                                const color = SPECIES_COLOR[pet.species] || '#6C3FF5'
                                const isDeleting = deletingId === pet.id

                                return (
                                    <motion.div
                                        key={pet.id}
                                        variants={itemVariants}
                                        layout
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    >
                                        <div
                                            className={`rounded-[18px] overflow-hidden transition-all duration-300 group ${isDeleting ? 'opacity-40 grayscale' : ''}`}
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            {/* Card Hero – full-width image or colour placeholder */}
                                            <div className="relative overflow-hidden" style={{ height: 144 }}>
                                                {pet.avatar_url ? (
                                                    <img
                                                        src={pet.avatar_url}
                                                        alt={pet.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
                                                        className="group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex items-center justify-center"
                                                        style={{ background: `linear-gradient(135deg, ${color}20, ${color}08)` }}
                                                    >
                                                        <Icon size={48} style={{ color, opacity: 0.4 }} />
                                                    </div>
                                                )}
                                                {/* Bottom gradient fade */}
                                                <div
                                                    className="absolute inset-0"
                                                    style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(14,14,28,0.9) 100%)' }}
                                                />
                                                {/* Species badge */}
                                                <div className="absolute top-2.5 right-2.5">
                                                    <span
                                                        className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold"
                                                        style={{
                                                            color,
                                                            background: 'rgba(0,0,0,0.5)',
                                                            border: `1px solid ${color}40`,
                                                            backdropFilter: 'blur(8px)',
                                                        }}
                                                    >
                                                        {pet.species}
                                                    </span>
                                                </div>
                                                {/* Name / breed overlay */}
                                                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                                                    <h3 className="text-base font-bold text-white leading-tight">{pet.name}</h3>
                                                    {pet.breed && (
                                                        <p className="text-white/45 text-xs mt-0.5 truncate">{pet.breed}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-4 pt-3">
                                                {/* Stats row */}
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div
                                                        className="rounded-xl p-3"
                                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                                    >
                                                        <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-wider mb-1 font-semibold">
                                                            <Calendar size={10} /> Edad
                                                        </div>
                                                        <div className="font-bold text-sm text-white/85">{calcAge(pet.birth_date)}</div>
                                                    </div>
                                                    <div
                                                        className="rounded-xl p-3"
                                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                                    >
                                                        <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-wider mb-1 font-semibold">
                                                            <Weight size={10} /> Peso
                                                        </div>
                                                        <div className="font-bold text-sm text-white/85">{pet.weight_kg ? `${pet.weight_kg} kg` : '—'}</div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <a
                                                        href={`/dashboard/pets/${pet.id}`}
                                                        className="btn-ghost flex-1 flex items-center justify-center gap-1.5 !py-2 !text-xs"
                                                        style={{ borderRadius: '10px', fontSize: '0.8rem', padding: '8px 12px' }}
                                                    >
                                                        <ChevronRight size={13} /> Ver Perfil
                                                    </a>
                                                    <button
                                                        onClick={() => handleDelete(pet.id, pet.name)}
                                                        disabled={isDeleting}
                                                        className="btn-danger flex items-center justify-center"
                                                        style={{ borderRadius: '10px', padding: '8px 12px', minWidth: 40 }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    )
}
