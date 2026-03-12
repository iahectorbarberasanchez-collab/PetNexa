import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { PremiumButton } from '@/components/ui/PremiumButton'
import { Zap, RefreshCw, AlertCircle } from 'lucide-react'

interface PetContext {
    id: string;
    name: string;
    species: string;
    breed?: string;
    birth_date?: string;
    weight?: number;
    conditions?: string[];
}

interface ProactiveTipProps {
    pet: PetContext;
}

export function ProactiveTip({ pet }: ProactiveTipProps) {
    const [tip, setTip] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const fetchTip = async () => {
        setLoading(true)
        setError(false)
        try {
            const res = await fetch('/api/petbot/tip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ petContext: pet })
            })

            if (!res.ok) throw new Error('Failed to fetch tip')

            const data = await res.json()
            if (data.tip) {
                setTip(data.tip)
            } else {
                throw new Error('No tip received')
            }
        } catch (err) {
            console.error('Error fetching proactive tip:', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (pet) {
            fetchTip()
        }
    }, [pet.id])

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
        >
            <GlassCard className="!p-6 !bg-gradient-to-r from-[#6C3FF522] to-[#00D4FF11] border-[#6C3FF533] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap size={80} className="text-[#00D4FF]" />
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(255,255,255,0.3)] flex-shrink-0 relative">
                        🤖
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00D4FF] rounded-full flex items-center justify-center border-2 border-[#111120]">
                            <Zap size={10} className="text-white fill-white" />
                        </div>
                    </div>

                    <div className="flex-1 min-h-[60px] flex flex-col justify-center">
                        <h3 className="font-['Outfit'] font-extrabold text-[#F8F8FF] text-lg mb-1 flex items-center gap-2">
                            PetBot IQ {loading && <span className="text-xs font-normal text-[#A78BFA] flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Analizando mascota...</span>}
                        </h3>

                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col gap-2 w-full max-w-xl mt-2"
                                >
                                    <div className="h-3 bg-[#F8F8FF11] rounded-full w-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-[#6C3FF5] to-[#00D4FF]"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                        />
                                    </div>
                                    <div className="h-3 bg-[#F8F8FF11] rounded-full w-2/3 overflow-hidden" />
                                </motion.div>
                            ) : error ? (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-red-400 text-sm flex items-center gap-2"
                                >
                                    <AlertCircle size={14} />
                                    No pudimos generar el consejo de PetBot.
                                    <button onClick={fetchTip} className="underline text-red-300 ml-1">Reintentar</button>
                                </motion.div>
                            ) : tip ? (
                                <motion.div
                                    key="content"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-[#F8F8FF99] text-sm max-w-2xl leading-relaxed italic"
                                >
                                    "{tip}"
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>

                    {!loading && !error && (
                        <PremiumButton
                            href="/dashboard/petbot"
                            variant="ghost"
                            className="!px-6 !py-3 !text-xs whitespace-nowrap"
                        >
                            Hablar con PetBot
                        </PremiumButton>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    )
}
