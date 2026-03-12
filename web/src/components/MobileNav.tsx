'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, PawPrint, Activity, Briefcase, Settings } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { icon: <Home size={20} />, label: 'Inicio', href: '/dashboard' },
    { icon: <PawPrint size={20} />, label: 'Mascotas', href: '/dashboard/pets' },
    { icon: <Activity size={20} />, label: 'Salud', href: '/dashboard/health' },
    { icon: <Briefcase size={20} />, label: 'Servicios', href: '/dashboard/services' },
    { icon: <Settings size={20} />, label: 'Ajustes', href: '/dashboard/settings' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center max-w-md mx-auto relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 group py-1 px-3 rounded-2xl transition-all duration-300 ${
                isActive ? 'text-violet-400 scale-110' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-violet-600/10 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
              
              <div className={`transition-all duration-300 ${isActive ? 'translate-y-[-2px]' : ''}`}>
                {item.icon}
              </div>
              
              <span className={`text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-300 ${
                isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute -bottom-1 w-1 h-1 bg-violet-400 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.8)]"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
