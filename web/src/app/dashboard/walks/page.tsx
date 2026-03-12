'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Walk {
    id: string
    user_id: string
    pet_id: string | null
    title: string
    route: { lat: number, lng: number, timestamp: number }[]
    distance_km: number
    duration_seconds: number
    start_time: string
    end_time: string | null
    image_url: string | null
    earned_coins: number
    created_at: string
    pet?: { name: string; species: string; avatar_url: string | null } | null
    profile?: { display_name: string | null } | null
}

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🐦', Fish: '🐠', Rabbit: '🐇', Hamster: '🐹', Reptile: '🦎', Other: '🐾',
}

function timeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'hace un momento'
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
    return `hace ${Math.floor(diff / 86400)}d`
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

export default function WalksFeedPage() {
    const supabase = createClient()
    const router = useRouter()

    const [userId, setUserId] = useState<string | null>(null)
    const [walks, setWalks] = useState<Walk[]>([])
    const [loading, setLoading] = useState(true)

    // ── Load ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)
            await loadWalks()
        })
    }, [])

    const loadWalks = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('walks')
            .select(`*, pet:pets(name, species, avatar_url), profile:profiles(display_name)`)
            .order('created_at', { ascending: false })
            .limit(50)

        if (data && !error) {
            setWalks(data)
        }
        setLoading(false)
    }

    // ── Delete Walk ─────────────────────────────────────────────────────────────
    const handleDeleteWalk = async (walk: Walk) => {
        if (!confirm('¿Eliminar este paseo?')) return
        if (walk.image_url) {
            const path = walk.image_url.split('/walk-images/')[1]
            if (path) await supabase.storage.from('walk-images').remove([path])
        }
        await supabase.from('walks').delete().eq('id', walk.id)
        setWalks(prev => prev.filter(w => w.id !== walk.id))
    }

    // ── Render ────────────────────────────────────────────────────────────────//
    return (
        <div className="min-h-screen bg-dark-bg text-white">
            <Sidebar />

            <main className="dashboard-main pb-20 px-6 sm:px-12">
                <div className="max-w-[720px] mx-auto pt-6">
                    <Breadcrumbs items={[{ label: 'Paseos' }]} />
                    <PageHeader
                        title="Paseos"
                        emoji="🦮"
                        subtitle="Descubre las rutas de la comunidad PetNexa"
                        action={
                            <Link href="/dashboard/walks/record"
                                className="px-6 py-3 rounded-xl border-none cursor-pointer font-outfit font-bold text-[0.85rem] transition-all flex items-center gap-2 bg-gradient-to-br from-[#00E5A0] to-[#00B37E] text-[#07070F] shadow-lg shadow-[#00E5A0]/20 hover:shadow-[#00E5A0]/40 hover:-translate-y-0.5"
                                style={{ textDecoration: 'none' }}
                            >
                                📍 Empezar Paseo
                            </Link>
                        }
                    />

                    {/* Feed */}
                    {loading ? (
                        <div className="text-center py-[60px]">
                            <div className="text-[40px] mb-3 text-[#00E5A0] animate-pulse">🦮</div>
                            <p className="text-white/40 font-outfit">Cargando rutas de la comunidad...</p>
                        </div>
                    ) : walks.length === 0 ? (
                        <div className="text-center py-[72px] px-6 bg-[#0D0D19]/70 border border-[#00E5A0]/20 rounded-[22px] shadow-[0_4px_30px_rgba(0,229,160,0.05)]">
                            <div className="text-[64px] mb-[20px] grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">🦮</div>
                            <h2 className="font-outfit font-extrabold text-[1.4rem] mb-2.5 text-white">¡No hay paseos registrados!</h2>
                            <p className="text-white/50 mb-[26px]">Sé pionero y graba la primera ruta con tu mascota para inaugurar la tabla de líderes.</p>
                            <Link href="/dashboard/walks/record" className="inline-block px-8 py-[12px] rounded-[13px] border-none cursor-pointer bg-gradient-to-br from-[#00E5A0] to-[#00B37E] text-[#07070F] font-outfit font-bold text-[0.9rem] shadow-[0_4px_20px_rgba(0,229,160,0.4)] hover:shadow-[0_6px_24px_rgba(0,229,160,0.5)] hover:-translate-y-0.5 transition-all" style={{ textDecoration: 'none' }}>
                                🏕️ Grabar Primer Paseo
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 relative">
                            {/* Line connecting posts visually */}
                            <div className="absolute left-[39px] top-4 bottom-10 w-px bg-gradient-to-b from-[#00E5A0]/40 via-primary/20 to-transparent z-0 hidden sm:block pointer-events-none"></div>

                            {walks.map((walk, index) => (
                                <div key={walk.id} className="relative z-10 sm:ml-[14px] bg-[#0D0D19]/90 backdrop-blur-xl border border-primary/20 rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#00E5A0]/40 transition-colors duration-300 group">

                                    {/* Connection dot */}
                                    <div className="absolute -left-[30px] top-[40px] w-3 h-3 rounded-full bg-[#0D0D19] border-[2px] border-[#00E5A0] shadow-[0_0_10px_#00E5A0] z-20 hidden sm:block group-hover:scale-150 transition-transform duration-300"></div>

                                    {/* Header */}
                                    <div className="px-5 pt-5 pb-3 flex justify-between items-start">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-[46px] h-[46px] rounded-[14px] bg-gradient-to-br from-[#00E5A0]/20 to-primary/20 border border-[#00E5A0]/30 flex items-center justify-center text-[22px] shrink-0 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                                                {walk.pet ? SPECIES_EMOJI[walk.pet.species] || '🐾' : '🧑'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[0.95rem] font-outfit text-white leading-tight">
                                                    {walk.title || 'Paseo'}
                                                </div>
                                                <div className="text-[0.8rem] text-white/60 mt-0.5 flex items-center gap-1.5">
                                                    <span className="text-[#00E5A0] font-semibold">{walk.profile?.display_name || 'Usuario'}</span>
                                                    <span className="text-white/30">•</span>
                                                    <span>{timeAgo(walk.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {walk.user_id === userId && (
                                            <button onClick={() => handleDeleteWalk(walk)} className="bg-white/5 border border-white/10 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-[0.85rem] text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all">
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Stats Bar */}
                                    <div className="px-5 py-3 mx-5 mb-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-around">
                                        <div className="text-center">
                                            <div className="text-[0.65rem] text-white/50 uppercase tracking-wider font-bold mb-1">Distancia</div>
                                            <div className="font-outfit font-bold text-[#00E5A0] text-[1.1rem]">
                                                {walk.distance_km ? walk.distance_km.toFixed(2) : '0.00'} <span className="text-[0.75rem] text-white/50 font-normal">km</span>
                                            </div>
                                        </div>
                                        <div className="w-px h-8 bg-white/10"></div>
                                        <div className="text-center">
                                            <div className="text-[0.65rem] text-white/50 uppercase tracking-wider font-bold mb-1">Duración</div>
                                            <div className="font-outfit font-bold text-[#F59E0B] text-[1.1rem]">
                                                {formatDuration(walk.duration_seconds)}
                                            </div>
                                        </div>
                                        <div className="w-px h-8 bg-white/10"></div>
                                        <div className="text-center">
                                            <div className="text-[0.65rem] text-white/50 uppercase tracking-wider font-bold mb-1">Ritmo</div>
                                            <div className="font-outfit font-bold text-[#FF6B9D] text-[1.1rem]">
                                                {walk.distance_km > 0 ? Math.floor((walk.duration_seconds / 60) / walk.distance_km) : '--'}<span className="text-[0.75rem] text-white/50 font-normal">m/km</span>
                                            </div>
                                        </div>
                                        {walk.earned_coins > 0 && (
                                            <>
                                                <div className="w-px h-8 bg-white/10"></div>
                                                <div className="text-center">
                                                    <div className="text-[0.65rem] text-[#F59E0B]/80 uppercase tracking-wider font-bold mb-1">Recompensa</div>
                                                    <div className="font-outfit font-bold text-[#F59E0B] text-[1.1rem] flex items-center justify-center gap-1">
                                                        +{walk.earned_coins} <span className="text-[0.9rem]">🪙</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Image */}
                                    {walk.image_url ? (
                                        <div className="relative mx-5 mb-5 rounded-[16px] overflow-hidden border border-white/10 shadow-lg">
                                            <img src={walk.image_url} alt="Walk snapshot" className="w-full h-[240px] sm:h-[320px] object-cover block group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                                        </div>
                                    ) : (
                                        <div className="relative mx-5 mb-5 rounded-[16px] overflow-hidden border border-white/10 shadow-lg bg-[#121220] h-[240px] sm:h-[320px] flex items-center justify-center">
                                            {/* Aquí iría el mini componente de mapa para el feed */}
                                            <div className="text-white/20 flex flex-col items-center">
                                                <div className="text-4xl mb-2">🗺️</div>
                                                <div className="text-sm font-outfit">Recorrido del Paseo</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
