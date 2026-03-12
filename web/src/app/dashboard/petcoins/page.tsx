'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Gift, Users, ShoppingBag, ShieldCheck, Heart, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface Shelter {
    id: string
    name: string
    city: string
    description: string
    image_url: string | null
    website: string | null
}
interface Vote {
    shelter_id: string
    coins_donated: number
    month_year: string
}

// ─── Helpers ──────────────────────────────────────────────────
function getMonthYear() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel() {
    return new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────
export default function PetCoinsPage() {
    const supabase = createClient()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [petCoins, setPetCoins] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    // Donation fund state
    const [shelters, setShelters] = useState<Shelter[]>([])
    const [allVotes, setAllVotes] = useState<Vote[]>([])
    const [myVote, setMyVote] = useState<Vote | null>(null)
    const [selectedShelter, setSelectedShelter] = useState<string | null>(null)
    const [coinsToVote, setCoinsToVote] = useState<number>(100)
    const [voting, setVoting] = useState(false)
    const [voteError, setVoteError] = useState<string | null>(null)
    const [showExplainer, setShowExplainer] = useState(false)

    const MONTHLY_POT = 200 // EUR

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUser(user)

            const [profileRes, sheltersRes, votesRes, myVoteRes] = await Promise.all([
                supabase.from('profiles').select('pet_coins').eq('id', user.id).single(),
                supabase.from('donation_shelters').select('*').order('created_at'),
                supabase.from('donation_votes').select('shelter_id, coins_donated, month_year').eq('month_year', getMonthYear()),
                supabase.from('donation_votes').select('shelter_id, coins_donated, month_year').eq('user_id', user.id).eq('month_year', getMonthYear()).maybeSingle(),
            ])

            if (profileRes.data) setPetCoins(profileRes.data.pet_coins ?? 0)
            setShelters((sheltersRes.data ?? []) as Shelter[])
            setAllVotes((votesRes.data ?? []) as Vote[])
            if (myVoteRes.data) setMyVote(myVoteRes.data as Vote)
            setLoading(false)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ─── Derived state ────────────────────────────────────────
    const totalVotesByShelter = (shelterId: string) =>
        allVotes.filter(v => v.shelter_id === shelterId).reduce((s, v) => s + v.coins_donated, 0)

    const grandTotal = allVotes.reduce((s, v) => s + v.coins_donated, 0) || 1

    const votedShelter = myVote ? shelters.find(s => s.id === myVote.shelter_id) : null

    // ─── Vote handler ─────────────────────────────────────────
    const handleVote = async () => {
        if (!selectedShelter || !user) return
        if (coinsToVote < 50) { setVoteError('El mínimo son 50 PetCoins.'); return }
        if (coinsToVote > petCoins) { setVoteError('No tienes suficientes PetCoins.'); return }
        setVoting(true)
        setVoteError(null)

        // Insert vote
        const { error: voteErr } = await supabase.from('donation_votes').insert({
            user_id: user.id,
            shelter_id: selectedShelter,
            coins_donated: coinsToVote,
            month_year: getMonthYear(),
        })

        if (voteErr) {
            if (voteErr.code === '23505') {
                setVoteError('Ya has votado este mes. ¡Vuelve el próximo mes!')
            } else {
                setVoteError('Hubo un error, inténtalo de nuevo.')
            }
            setVoting(false)
            return
        }

        // Deduct coins from profile
        await supabase.from('profiles').update({ pet_coins: petCoins - coinsToVote }).eq('id', user.id)

        // Update local state
        const newVote: Vote = { shelter_id: selectedShelter, coins_donated: coinsToVote, month_year: getMonthYear() }
        setMyVote(newVote)
        setAllVotes(prev => [...prev, newVote])
        setPetCoins(prev => prev - coinsToVote)
        setVoting(false)
    }

    // Loading
    if (loading) return (
        <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6C3FF5]"></div>
        </div>
    )

    // ─── Earn / Spend data ────────────────────────────────────
    const waysToEarn = [
        { icon: <TrendingUp className="text-[#00D4FF]" size={22} />, title: 'Paseos Activos', description: 'Cuanto más camines con tu peludo, más monedas ganarás por distancia y duración.', color: '#00D4FF' },
        { icon: <Users className="text-[#00E5A0]" size={22} />, title: 'Comunidad', description: 'Participa en Pet-stagram, comenta, y ayuda reportando alertas de extravío.', color: '#00E5A0' },
        { icon: <ShieldCheck className="text-[#8B5CF6]" size={22} />, title: 'Desafíos Semanales', description: 'Completa retos de salud y bienestar que proponemos en la app para ti y tu mascota.', color: '#8B5CF6' },
        { icon: <Gift className="text-[#F59E0B]" size={22} />, title: 'Plan Premium', description: 'Recibe 500 PetCoins gratis cada mes con PetNexa Pro, además de multiplicadores.', color: '#F59E0B' },
    ]

    const waysToSpend = [
        { title: 'Votar al Fondo de Donaciones', description: 'Elige qué refugio recibe el bote mensual de €200 de PetNexa. ¡Tu voto importa!', gradient: 'from-[#00E5A0] to-[#00D4FF]' },
        { title: 'Descuentos en Pet Shops', description: 'Canjea por códigos de descuento de hasta un 30% en tiendas afiliadas.', gradient: 'from-[#6C3FF5] to-[#00D4FF]' },
        { title: 'Servicios Veterinarios', description: 'Paga parcial o totalmente consultas con nuestra red de veterinarios.', gradient: 'from-[#F59E0B] to-[#EF4444]' },
        { title: 'Funciones Exclusivas', description: 'Desbloquea insignias especiales, avatares premium y opciones de personalización.', gradient: 'from-[#8B5CF6] to-[#EC4899]' },
    ]

    return (
        <div className="dashboard-container min-h-screen bg-dark-bg text-white">
            <Sidebar />
            <main className="dashboard-main lg:lg:ml-[260px] pb-16 relative overflow-hidden">
                <div className="noise-overlay" />
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,215,0,0.09)_0%,transparent_60%)] pointer-events-none blur-3xl" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,229,160,0.07)_0%,transparent_60%)] pointer-events-none blur-3xl" />

                <div className="relative z-10">
                    <PageHeader
                        title="Tu Monedero PetCoin"
                        emoji="🪙"
                        subtitle="Gana monedas siendo un dueño responsable y úsalas para lo que más te importa."
                    />

                    {/* ── BALANCE CARD ── */}
                    <div className="max-w-4xl mx-auto mb-12">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <GlassCard className="p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[200px] text-center" hover={false}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.09)_0%,transparent_70%)]" />
                                <h2 className="text-white/50 font-inter font-medium text-base mb-2 relative z-10 uppercase tracking-widest">Balance Actual</h2>
                                <div className="flex items-center gap-4 relative z-10">
                                    <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">🪙</span>
                                    <span className="font-outfit font-extrabold text-7xl text-transparent bg-clip-text bg-gradient-to-br from-[#FFD700] to-[#F59E0B]">
                                        {petCoins.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-white/35 font-inter text-sm mt-4 relative z-10 flex items-center gap-1.5">
                                    <ShoppingBag size={13} /> Listas para gastar en el ecosistema PetNexa
                                </p>
                            </GlassCard>
                        </motion.div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════ */}
                    {/* ── FONDO MENSUAL DE DONACIONES ──                      */}
                    {/* ═══════════════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="max-w-4xl mx-auto mb-14"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-outfit font-extrabold text-2xl flex items-center gap-2">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5A0] to-[#00D4FF]">🏡 Fondo Mensual de Donaciones</span>
                                </h3>
                                <p className="text-white/50 font-inter text-sm mt-1">
                                    Vota con tus PetCoins · El refugio más votado recibe el bote de <span className="text-[#00E5A0] font-bold">€{MONTHLY_POT}</span> en {monthLabel()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowExplainer(p => !p)}
                                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-inter transition-colors"
                            >
                                ¿Cómo funciona? {showExplainer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>

                        {/* Explainer */}
                        <AnimatePresence>
                            {showExplainer && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden mb-6"
                                >
                                    <div className="p-5 rounded-2xl bg-[#00E5A0]/5 border border-[#00E5A0]/20 font-inter text-sm text-white/70 leading-relaxed grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><span className="text-[#00E5A0] font-bold block mb-1">① Vota</span>Elige un refugio y dona mínimo 50 PetCoins. Las monedas se descuentan de tu saldo.</div>
                                        <div><span className="text-[#00D4FF] font-bold block mb-1">② Acumula</span>El refugio más votado del mes gana. Las barras muestran el porcentaje de votos acumulados.</div>
                                        <div><span className="text-[#F59E0B] font-bold block mb-1">③ Dona</span>PetNexa transfiere €{MONTHLY_POT} al refugio ganador el 1 de cada mes.</div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Already voted banner */}
                        {myVote && votedShelter && (
                            <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-[#00E5A0]/10 border border-[#00E5A0]/30">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="text-[#00E5A0] font-outfit font-bold text-sm">¡Ya has votado este mes!</p>
                                    <p className="text-white/60 text-xs font-inter mt-0.5">
                                        Donaste <span className="text-[#FFD700] font-semibold">{myVote.coins_donated} PetCoins</span> a <span className="text-white font-semibold">{votedShelter.name}</span>. ¡Gracias! Vuelve el próximo mes para votar de nuevo.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Shelters grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {shelters.map((shelter, i) => {
                                const votes = totalVotesByShelter(shelter.id)
                                const pct = Math.round((votes / grandTotal) * 100)
                                const isSelected = selectedShelter === shelter.id
                                const isWinning = votes === Math.max(...shelters.map(s => totalVotesByShelter(s.id))) && votes > 0

                                return (
                                    <motion.button
                                        key={shelter.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 + i * 0.07 }}
                                        onClick={() => !myVote && setSelectedShelter(shelter.id)}
                                        disabled={!!myVote}
                                        className={`text-left p-5 rounded-2xl border transition-all group relative overflow-hidden ${myVote
                                                ? myVote.shelter_id === shelter.id
                                                    ? 'border-[#00E5A0]/40 bg-[#00E5A0]/8'
                                                    : 'border-white/5 bg-white/3 opacity-60'
                                                : isSelected
                                                    ? 'border-[#00D4FF]/60 bg-[#00D4FF]/8 shadow-[0_0_25px_rgba(0,212,255,0.12)]'
                                                    : 'border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/7'
                                            }`}
                                    >
                                        {/* Winning badge */}
                                        {isWinning && (
                                            <div className="absolute top-3 right-3 bg-[#FFD700] text-black text-[0.6rem] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                🏆 Líder
                                            </div>
                                        )}

                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/10">
                                                {shelter.image_url && (
                                                    <img src={shelter.image_url} alt={shelter.name} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-outfit font-bold text-[0.97rem] text-white leading-tight">{shelter.name}</h4>
                                                <p className="text-white/45 text-[0.75rem] font-inter mt-0.5">📍 {shelter.city}</p>
                                            </div>
                                        </div>

                                        <p className="text-white/55 text-xs font-inter leading-relaxed mb-4 line-clamp-2">{shelter.description}</p>

                                        {/* Progress bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/40 text-[0.7rem] font-inter">Votos acumulados</span>
                                                <span className="text-[#00E5A0] font-outfit font-bold text-[0.75rem]">
                                                    🪙 {votes.toLocaleString()} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                                                    className="h-full rounded-full"
                                                    style={{ background: 'linear-gradient(to right, #00E5A0, #00D4FF)' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Web link */}
                                        {shelter.website && (
                                            <a
                                                href={shelter.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="mt-3 inline-flex items-center gap-1 text-[0.7rem] text-[#00D4FF] hover:underline opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                Ver web oficial <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </motion.button>
                                )
                            })}
                        </div>

                        {/* Vote controls — only if not yet voted */}
                        {!myVote && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="p-6 rounded-2xl bg-white/4 border border-white/8"
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
                                    <div className="flex-1">
                                        <label className="block text-white/60 font-inter text-sm mb-2">
                                            PetCoins a donar <span className="text-white/30 text-xs">(mín. 50 · disponibles: {petCoins.toLocaleString()})</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFD700] text-lg">🪙</span>
                                            <input
                                                type="number"
                                                min={50}
                                                max={petCoins}
                                                value={coinsToVote}
                                                onChange={e => { setCoinsToVote(Number(e.target.value)); setVoteError(null) }}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/8 border border-white/12 text-white font-outfit font-bold text-lg focus:outline-none focus:border-[#00D4FF]/50 focus:bg-white/12 transition-all"
                                            />
                                        </div>
                                        {/* Quick amounts */}
                                        <div className="flex gap-2 mt-2">
                                            {[50, 100, 250, 500].map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => { setCoinsToVote(amt); setVoteError(null) }}
                                                    className={`text-xs px-3 py-1 rounded-lg font-inter font-semibold transition-all ${coinsToVote === amt ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/40' : 'bg-white/6 text-white/50 border border-white/8 hover:text-white/80'}`}
                                                >
                                                    {amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleVote}
                                        disabled={voting || !selectedShelter || coinsToVote < 50}
                                        className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl font-outfit font-bold text-[0.95rem] transition-all border-none shrink-0 ${voting || !selectedShelter || coinsToVote < 50
                                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-[#00E5A0] to-[#00D4FF] text-black cursor-pointer hover:shadow-[0_0_25px_rgba(0,229,160,0.35)] hover:-translate-y-0.5'
                                            }`}
                                    >
                                        <Heart size={18} />
                                        {voting ? 'Donando…' : selectedShelter ? 'Donar y Votar' : 'Elige un refugio'}
                                    </button>
                                </div>

                                {!selectedShelter && (
                                    <p className="mt-3 text-white/35 text-xs font-inter">← Selecciona un refugio de la lista de arriba para activar el voto.</p>
                                )}
                                {voteError && (
                                    <p className="mt-3 text-[#EF4444] text-sm font-inter">{voteError}</p>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                    {/* ═══════════════════════════════════════════════════════ */}

                    {/* ── EXPLAINER SECTIONS ── */}
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">

                        {/* What are PetCoins */}
                        <div className="md:col-span-2">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <h3 className="font-outfit font-bold text-2xl mb-4 text-[#00D4FF]">¿Qué son las PetCoins?</h3>
                                <p className="text-white/70 font-inter leading-relaxed text-[1.02rem]">
                                    Las PetCoins son la moneda virtual oficial del ecosistema PetNexa. Las hemos diseñado para recompensar a los dueños responsables e incentivar las buenas prácticas en el cuidado animal.
                                    Cada vez que interactúas positivamente en la plataforma, PetNexa te lo agradece con PetCoins.
                                </p>
                            </motion.div>
                        </div>

                        {/* How to earn */}
                        <div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                                <h3 className="font-outfit font-bold text-xl mb-5 text-white">¿Cómo conseguirlas?</h3>
                                <div className="flex flex-col gap-3">
                                    {waysToEarn.map((way, i) => (
                                        <div key={i} className="flex gap-3.5 p-4 rounded-2xl bg-white/4 border border-white/6 hover:bg-white/7 transition-colors">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${way.color}15` }}>
                                                {way.icon}
                                            </div>
                                            <div>
                                                <h4 className="font-outfit font-bold text-sm mb-0.5" style={{ color: way.color }}>{way.title}</h4>
                                                <p className="text-white/55 font-inter text-xs leading-relaxed">{way.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* How to spend */}
                        <div>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                <h3 className="font-outfit font-bold text-xl mb-5 text-white">¿Para qué sirven?</h3>
                                <div className="flex flex-col gap-3">
                                    {waysToSpend.map((spend, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/4 border border-white/6 hover:border-white/12 transition-all relative overflow-hidden group">
                                            <div className={`absolute inset-0 bg-gradient-to-r ${spend.gradient} opacity-4 group-hover:opacity-8 transition-opacity`} />
                                            <div className="relative z-10">
                                                <h4 className="font-outfit font-bold text-sm mb-1 text-white flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${spend.gradient}`} />
                                                    {spend.title}
                                                </h4>
                                                <p className="text-white/55 font-inter text-xs leading-relaxed">{spend.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <button
                            onClick={() => router.push('/dashboard/walks')}
                            className="bg-gradient-to-r from-[#6C3FF5] to-[#00D4FF] hover:shadow-[0_0_30px_rgba(108,63,245,0.4)] hover:-translate-y-1 transition-all px-8 py-4 rounded-full font-outfit font-bold text-lg text-white border-none cursor-pointer"
                        >
                            🦮 Empieza a ganar PetCoins paseando hoy
                        </button>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}
