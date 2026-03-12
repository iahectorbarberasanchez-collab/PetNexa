'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function MobileHeader() {
  const supabase = createClient()
  const [petCoins, setPetCoins] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('pet_coins').eq('id', user.id).single()
        if (data) setPetCoins(data.pet_coins)
      }
    })
  }, [])

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 pt-[env(safe-area-inset-top,1rem)] pb-4 bg-[rgba(8,8,18,0.7)] backdrop-blur-xl border-b border-[rgba(108,63,245,0.15)] flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] flex items-center justify-center text-lg shadow-lg shadow-[#6C3FF5]/40">
          🐾
        </div>
        <span className="font-outfit font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
          PetNexa
        </span>
      </Link>

      {petCoins !== null && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] px-3 py-1.5 rounded-full"
        >
          <span className="text-sm">🪙</span>
          <span className="text-xs font-bold text-[#FFD700] font-outfit">{petCoins.toLocaleString()}</span>
        </motion.div>
      )}
    </header>
  )
}
