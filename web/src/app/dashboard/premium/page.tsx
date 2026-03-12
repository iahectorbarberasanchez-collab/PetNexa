'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function PremiumPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubscribe = async () => {
        setLoading(true)
        // Mocking Stripe Checkout redirect
        setTimeout(() => {
            alert('En el futuro, esto redirigirá a la pasarela de pago de Stripe.')
            setLoading(false)
        }, 1500)
    }

    return (
        <div className="min-h-screen bg-dark-bg text-white">
            <Sidebar />

            <main className="dashboard-main">
                <PageHeader
                    title="PetNexa Premium"
                    emoji="⭐"
                    subtitle="Desbloquea todo el potencial de PetNexa y dale la mejor vida a tu mascota conectando con nuestra IA experta y acceso exclusivo."
                    action={
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1 flex">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 md:px-8 py-2 md:py-2.5 rounded-full font-inter font-semibold text-xs md:text-sm transition-all border-none cursor-pointer ${billingCycle === 'monthly' ? 'bg-[#6C3FF5] text-white shadow-[0_0_15px_rgba(108,63,245,0.4)]' : 'bg-transparent text-white/50 hover:text-white/80'}`}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 md:px-8 py-2 md:py-2.5 rounded-full font-inter font-semibold text-xs md:text-sm transition-all border-none cursor-pointer flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-[#6C3FF5] text-white shadow-[0_0_15px_rgba(108,63,245,0.4)]' : 'bg-transparent text-white/50 hover:text-white/80'}`}
                            >
                                Anual <span className="bg-[#00E5A0]/20 text-[#00E5A0] text-[0.6rem] md:text-[0.65rem] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider hidden sm:inline">Ahorra 20%</span>
                            </button>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto pb-12">
                    {/* Free Tier */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0D0D19]/60 border border-white/5 rounded-3xl p-8 backdrop-blur-xl relative flex flex-col transition-all hover:bg-[#0D0D19]/80 hover:border-white/10"
                    >
                        <div className="mb-8">
                            <h3 className="font-outfit font-bold text-2xl text-white mb-2 underline decoration-white/10 underline-offset-8">Básico</h3>
                            <p className="text-white/40 text-sm">Todo lo esencial para empezar a cuidar mejor de tu mascota.</p>
                        </div>
                        <div className="mb-8">
                            <div className="flex items-baseline gap-1">
                                <span className="font-outfit font-extrabold text-5xl">€0</span>
                                <span className="text-white/30 text-sm font-inter">/ mes</span>
                            </div>
                        </div>

                        <ul className="flex flex-col gap-4 mb-10 flex-1">
                            {['Hasta 2 mascotas', 'Cartilla de vacunación básica', 'Alertas de mascotas perdidas', 'PetBot IA (5 consultas/mes)', 'Comunidad Pet-stagram'].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="text-[#6C3FF5] mt-0.5 text-lg">✓</span>
                                    <span className="text-white/70 font-inter text-[0.95rem] leading-snug">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button className="w-full py-4 rounded-2xl bg-white/5 text-white/40 font-outfit font-bold text-[0.95rem] border border-white/5 cursor-not-allowed">
                            Plan Actual
                        </button>
                    </motion.div>

                    {/* Premium Tier */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-[#121220] to-[#1A1A32] border-[1.5px] border-[#6C3FF5]/50 shadow-[0_0_40px_rgba(108,63,245,0.15)] rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden flex flex-col group hover:shadow-[0_0_50px_rgba(108,63,245,0.25)] transition-all duration-500"
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#6C3FF5]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-[#6C3FF5]/20 transition-colors duration-500" />

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="font-outfit font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] mb-2 flex items-center gap-2 drop-shadow-sm">
                                    PetNexa Pro 👑
                                </h3>
                                <p className="text-white/60 text-sm">La experiencia definitiva.</p>
                            </div>
                            <div className="bg-gradient-to-r from-[#6C3FF5] to-[#00D4FF] text-white text-[0.6rem] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shrink-0">
                                Recomendado
                            </div>
                        </div>

                        <div className="mb-8 relative z-10">
                            <div className="flex items-baseline gap-1">
                                <span className="font-outfit font-extrabold text-5xl text-white">{billingCycle === 'yearly' ? '€4.99' : '€5.99'}</span>
                                <span className="text-white/40 text-sm font-inter">/ mes</span>
                            </div>
                            <div className="h-4 mt-2">
                                {billingCycle === 'yearly' && <span className="text-[#00E5A0] text-xs font-inter font-medium opacity-80">Facturado anualmente (€59.88/año)</span>}
                            </div>
                        </div>

                        <ul className="flex flex-col gap-4 mb-10 flex-1 relative z-10">
                            {[
                                'Mascotas ilimitadas',
                                'Consultas ilimitadas con PetBot IA',
                                'Historial médico avanzado y predicciones',
                                '500 PetCoins 🪙 mensuales',
                                'Prioridad máxima en alertas de extravío',
                                'Descuentos exclusivos en servicios'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="text-[#00D4FF] mt-0.5 text-lg drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]">★</span>
                                    <span className="text-white/95 font-inter text-[0.95rem] leading-snug font-medium">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={handleSubscribe}
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-outfit font-bold text-[1rem] transition-all border-none relative z-10 shadow-[0_4px_20px_rgba(108,63,245,0.4)] ${loading ? 'bg-[#6C3FF5]/50 text-white/50 cursor-wait' : 'bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white cursor-pointer hover:shadow-[0_6px_25px_rgba(108,63,245,0.6)] hover:-translate-y-1'}`}
                        >
                            {loading ? 'Procesando...' : 'Mejorar a Pro'}
                        </button>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}
