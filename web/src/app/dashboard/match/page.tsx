'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, X as XIcon, RotateCcw } from 'lucide-react'

interface Pet {
    id: string
    name: string
    species: string
    breed: string | null
    birth_date: string | null
    avatar_url: string | null
    profiles: { display_name: string }
}

interface Match {
    id: string
    matched_at: string
    other_pet: Pet
}

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🦜', Rabbit: '🐰', Fish: '🐠', Other: '🐾'
}

function getAge(birthDate: string | null): string {
    if (!birthDate) return 'Edad desconocida'
    const diff = Date.now() - new Date(birthDate).getTime()
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
    if (years === 0) return 'Cachorro'
    return `${years} ${years === 1 ? 'año' : 'años'}`
}

export default function MatchPage() {
    const supabase = createClient()
    const [myPet, setMyPet] = useState<Pet | null>(null)
    const [allMyPets, setAllMyPets] = useState<Pet[]>([])
    const [candidates, setCandidates] = useState<Pet[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [matches, setMatches] = useState<Match[]>([])
    const [view, setView] = useState<'swipe' | 'matches'>('swipe')
    const [loading, setLoading] = useState(true)
    const [loadingCandidates, setLoadingCandidates] = useState(false)
    const [swipeAnim, setSwipeAnim] = useState<'like' | 'pass' | null>(null)
    const [showMatch, setShowMatch] = useState<Pet | null>(null)

    useEffect(() => {
        initData()
    }, [])

    const initData = async () => {
        setLoading(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) return

            // Get all user's pets
            const { data: userPets } = await supabase
                .from('pets')
                .select('id, name, species, breed, birth_date, avatar_url, profiles:owner_id(display_name)')
                .eq('owner_id', userData.user.id)

            if (!userPets || userPets.length === 0) {
                setLoading(false)
                return
            }

            setAllMyPets(userPets as any)
            const firstPet = userPets[0] as any
            setMyPet(firstPet)

            await loadPetData(firstPet.id, userData.user.id)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const loadPetData = async (petId: string, userId: string) => {
        setLoadingCandidates(true)
        try {
            setCurrentIndex(0)
            // Get already swiped pet IDs for THIS pet
            const { data: swiped } = await supabase
                .from('pet_swipes')
                .select('swiped_pet_id')
                .eq('swiper_pet_id', petId)

            const swipedIds = swiped?.map(s => s.swiped_pet_id) || []

            // Get candidates (other pets, excluding already swiped and own)
            let query = supabase
                .from('pets')
                .select('id, name, species, breed, birth_date, avatar_url, profiles:owner_id(display_name)')
                .neq('owner_id', userId)
                .limit(20)

            if (swipedIds.length > 0) {
                query = query.not('id', 'in', `(${swipedIds.join(',')})`)
            }

            const { data: candidatesData } = await query
            setCandidates((candidatesData as any) || [])

            // Get matches for THIS pet
            await loadMatches(petId)
        } finally {
            setLoadingCandidates(false)
        }
    }

    const handlePetChange = async (pet: Pet) => {
        setMyPet(pet)
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
            await loadPetData(pet.id, userData.user.id)
        }
    }

    const loadMatches = async (petId: string) => {
        const { data } = await supabase
            .from('pet_matches')
            .select('id, matched_at, pet_a_id, pet_b_id')
            .or(`pet_a_id.eq.${petId},pet_b_id.eq.${petId}`)

        if (!data) return

        const matchList: Match[] = []
        for (const m of data) {
            const otherId = m.pet_a_id === petId ? m.pet_b_id : m.pet_a_id
            const { data: otherPet } = await supabase
                .from('pets')
                .select('id, name, species, breed, birth_date, avatar_url, profiles:owner_id(display_name)')
                .eq('id', otherId)
                .single()
            if (otherPet) {
                matchList.push({ id: m.id, matched_at: m.matched_at, other_pet: otherPet as any })
            }
        }
        setMatches(matchList)
    }

    const handleSwipe = async (action: 'like' | 'pass') => {
        if (!myPet || currentIndex >= candidates.length) return
        const target = candidates[currentIndex]

        // Animate
        setSwipeAnim(action)
        await new Promise(r => setTimeout(r, 350))
        setSwipeAnim(null)
        setCurrentIndex(i => i + 1)

        // Insert swipe
        await supabase.from('pet_swipes').insert({
            swiper_pet_id: myPet.id,
            swiped_pet_id: target.id,
            action
        })

        // Check for mutual like (match)
        if (action === 'like') {
            const { data: mutual } = await supabase
                .from('pet_swipes')
                .select('id')
                .eq('swiper_pet_id', target.id)
                .eq('swiped_pet_id', myPet.id)
                .eq('action', 'like')
                .single()

            if (mutual) {
                // Create match (ensure order to avoid duplicates)
                const [a, b] = [myPet.id, target.id].sort()
                await supabase.from('pet_matches').upsert({ pet_a_id: a, pet_b_id: b })
                setShowMatch(target)
                await loadMatches(myPet.id)
            }
        }
    }

    if (loading) return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="dashboard-main flex flex-col items-center justify-center min-h-screen">
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-6xl"
                >
                    💞
                </motion.div>
                <p className="mt-4 text-white/50 animate-pulse">Buscando peludos cerca...</p>
            </main>
        </div>
    )

    if (!myPet) return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="dashboard-main flex flex-col items-center justify-center min-h-screen">
                <div className="text-6xl mb-6">🐾</div>
                <h2 className="text-2xl font-bold mb-2">Necesitas una mascota</h2>
                <p className="text-white/50 mb-8 max-w-sm text-center">
                    Añade tu primera mascota para poder hacer match y encontrar amigos a tu alrededor.
                </p>
                <Link href="/dashboard/pets/new">
                    <PremiumButton variant="primary">
                        + Añadir Mascota
                    </PremiumButton>
                </Link>
            </main>
        </div>
    )

    const currentPet = candidates[currentIndex]
    const hasMore = currentIndex < candidates.length

    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="dashboard-main">
                <div className="max-w-md mx-auto w-full pb-20">

                    {/* Header */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center justify-between">
                            <PageHeader
                                title="Peludos"
                                subtitle="Conecta con otras mascotas"
                                emoji="💞"
                            />
                        </div>

                        {/* Pet Selector */}
                        {allMyPets.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {allMyPets.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePetChange(p)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all text-sm ${p.id === myPet?.id
                                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-[0_0_15px_rgba(255,107,157,0.15)]'
                                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-dark-bg/50"
                                            style={p.avatar_url ? { background: `url(${p.avatar_url}) center/cover` } : {}}
                                        >
                                            {!p.avatar_url && SPECIES_EMOJI[p.species]}
                                        </div>
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex bg-dark-card border border-white/5 rounded-full p-1 mt-2">
                            <button
                                onClick={() => setView('swipe')}
                                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${view === 'swipe'
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                Descubrir
                            </button>
                            <button
                                onClick={() => setView('matches')}
                                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all relative flex items-center justify-center gap-2 ${view === 'matches'
                                    ? 'bg-white/10 text-white border border-white/10'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                <Heart className="w-4 h-4" />
                                Matches
                                {matches.length > 0 && (
                                    <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-md shadow-primary/50">
                                        {matches.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {view === 'swipe' ? (
                            <motion.div
                                key="swipe-view"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center"
                            >
                                {/* Swipe Card Container */}
                                <div className="w-full relative h-[520px]">
                                    {loadingCandidates ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center border border-white/5 rounded-[32px] bg-white/5 backdrop-blur-md">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                className="text-4xl"
                                            >
                                                🔍
                                            </motion.div>
                                            <p className="mt-4 text-white/40 text-sm">Buscando amigos para {myPet?.name}...</p>
                                        </div>
                                    ) : hasMore ? (
                                        <motion.div
                                            className="absolute w-full h-full rounded-[32px] overflow-hidden bg-dark-card border border-primary/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing backdrop-blur-xl flex flex-col"
                                            animate={
                                                swipeAnim === 'like' ? { x: 400, rotate: 20, opacity: 0 } :
                                                    swipeAnim === 'pass' ? { x: -400, rotate: -20, opacity: 0 } :
                                                        { x: 0, rotate: 0, opacity: 1 }
                                            }
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            {/* Pet Photo */}
                                            <div
                                                className="flex-1 w-full flex items-center justify-center text-[100px] relative border-b border-white/5"
                                                style={{
                                                    background: currentPet.avatar_url
                                                        ? `url(${currentPet.avatar_url}) center/cover`
                                                        : 'linear-gradient(135deg, #FF6B9D 0%, #C939D0 50%, #6C3FF5 100%)'
                                                }}
                                            >
                                                {!currentPet.avatar_url && (SPECIES_EMOJI[currentPet.species] || '🐾')}

                                                {/* Swipe Indicators */}
                                                <AnimatePresence>
                                                    {swipeAnim === 'like' && (
                                                        <motion.div
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="absolute top-6 left-6 bg-[#10b981] text-white px-6 py-2 rounded-xl text-3xl font-black border-4 border-white -rotate-12 shadow-2xl tracking-wider"
                                                        >
                                                            LIKE
                                                        </motion.div>
                                                    )}
                                                    {swipeAnim === 'pass' && (
                                                        <motion.div
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="absolute top-6 right-6 bg-[#ef4444] text-white px-6 py-2 rounded-xl text-3xl font-black border-4 border-white rotate-12 shadow-2xl tracking-wider"
                                                        >
                                                            NOPE
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Gradient Overlay for better text readability */}
                                                <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-dark-card to-transparent" />
                                            </div>

                                            {/* Pet Info */}
                                            <div className="p-6 shrink-0 relative z-10">
                                                <div className="flex justify-between items-end mb-2">
                                                    <h2 className="text-3xl font-black">{currentPet.name} <span className="text-xl font-normal text-white/60 ml-1">{getAge(currentPet.birth_date)}</span></h2>
                                                    <span className="text-2xl">{SPECIES_EMOJI[currentPet.species] || '🐾'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-white/70 border border-white/10 font-medium">
                                                        {currentPet.breed || currentPet.species}
                                                    </span>
                                                </div>
                                                <p className="text-white/40 text-sm flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    Dueño: {(currentPet.profiles as any)?.display_name || 'Usuario'}
                                                </p>

                                                {/* Progress Line */}
                                                <div className="mt-5">
                                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-primary to-secondary"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.max(0, ((candidates.length - currentIndex) / candidates.length) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="w-full h-full rounded-[32px] border border-dashed border-primary/30 flex flex-col items-center justify-center gap-4 bg-primary/5 backdrop-blur-sm">
                                            <div className="text-6xl mb-2">🔭</div>
                                            <h3 className="text-xl font-bold">¡Has visto a todos!</h3>
                                            <p className="text-white/50 text-center text-sm px-6">
                                                No hay más peludos nuevos en tu zona. Vuelve pronto.
                                            </p>
                                            <PremiumButton onClick={initData} variant="ghost" className="mt-4">
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Volver a buscar
                                            </PremiumButton>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {hasMore && !loadingCandidates && (
                                    <div className="flex items-center gap-8 mt-8">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleSwipe('pass')}
                                            className="w-16 h-16 rounded-full bg-dark-card border border-white/10 text-white/50 flex items-center justify-center shadow-lg hover:shadow-red-500/20 hover:border-red-500/50 hover:text-red-500 transition-all"
                                        >
                                            <XIcon className="w-8 h-8" strokeWidth={3} />
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleSwipe('like')}
                                            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary border-none text-white flex items-center justify-center shadow-[0_10px_30px_rgba(255,107,157,0.4)] hover:shadow-[0_15px_40px_rgba(255,107,157,0.6)] transition-all"
                                        >
                                            <Heart className="w-10 h-10 fill-white" strokeWidth={0} />
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>

                        ) : (
                            <motion.div
                                key="matches-view"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="w-full flex flex-col gap-3"
                            >
                                {matches.length === 0 ? (
                                    <GlassCard className="text-center py-16 flex flex-col items-center justify-center border-dashed border-primary/20 bg-primary/5">
                                        <div className="text-5xl mb-4 opacity-50">💔</div>
                                        <h3 className="font-bold mb-2">Sin matches todavía</h3>
                                        <p className="text-white/40 text-sm max-w-[200px]">
                                            Sigue explorando y encontrarás a tu compañero ideal.
                                        </p>
                                        <PremiumButton onClick={() => setView('swipe')} variant="primary" className="mt-6">
                                            Volver a Descubrir
                                        </PremiumButton>
                                    </GlassCard>
                                ) : (
                                    matches.map(m => (
                                        <GlassCard key={m.id} className="flex items-center gap-4 p-4 hover:border-primary/40 transition-all group overflow-hidden relative">
                                            {/* Subtle glow border hover effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div
                                                className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl bg-gradient-to-br from-primary to-secondary relative z-10 shadow-lg shadow-black/20"
                                                style={m.other_pet.avatar_url ? { background: `url(${m.other_pet.avatar_url}) center/cover` } : {}}
                                            >
                                                {!m.other_pet.avatar_url && SPECIES_EMOJI[m.other_pet.species]}
                                            </div>
                                            <div className="flex-1 min-w-0 relative z-10">
                                                <div className="font-bold text-base truncate flex items-center gap-2">
                                                    {m.other_pet.name}
                                                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/70 font-medium">
                                                        {SPECIES_EMOJI[m.other_pet.species]}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-white/50 truncate mt-1">
                                                    De {(m.other_pet.profiles as any)?.display_name}
                                                </div>
                                            </div>
                                            <Link href={`/dashboard/match/chat/${m.id}`} className="relative z-10 shrink-0">
                                                <button className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 text-white/80 hover:text-white text-sm font-semibold transition-all flex items-center gap-2 group-hover:shadow-[0_0_15px_rgba(255,107,157,0.2)]">
                                                    Chatear
                                                </button>
                                            </Link>
                                        </GlassCard>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </main>

            {/* Match Popup Modal */}
            <AnimatePresence>
                {showMatch && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        {/* Sparkles background effect could go here */}
                        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent pointer-events-none" />

                        <motion.div
                            initial={{ scale: 0.8, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.8, y: 50, opacity: 0 }}
                            className="bg-dark-card border border-primary/40 rounded-[32px] p-10 max-w-sm w-full text-center shadow-[0_30px_100px_rgba(255,107,157,0.2)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-primary to-secondary" />

                            <motion.div
                                animate={{ y: [0, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-7xl mb-6 drop-shadow-[0_10px_20px_rgba(255,107,157,0.4)]"
                            >
                                💞
                            </motion.div>
                            <h2 className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4 tracking-tight drop-shadow-sm">
                                ¡It's a Match!
                            </h2>
                            <p className="text-white/90 text-lg mb-4">
                                <strong className="text-white">{myPet.name}</strong> y <strong className="text-white">{showMatch.name}</strong> se han gustado 🐾
                            </p>
                            <p className="text-white/40 text-sm mb-8 px-4">
                                Puedes empezar una conversación en la pestaña de matches.
                            </p>
                            <div className="flex flex-col gap-3">
                                <PremiumButton
                                    onClick={() => { setShowMatch(null); setView('matches'); }}
                                    className="w-full text-base shadow-[0_10px_30px_rgba(255,107,157,0.4)]"
                                >
                                    Ver Match Ahora
                                </PremiumButton>
                                <button
                                    onClick={() => setShowMatch(null)}
                                    className="w-full py-3 text-sm text-white/50 hover:text-white font-medium transition-colors"
                                >
                                    Seguir descubriendo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
