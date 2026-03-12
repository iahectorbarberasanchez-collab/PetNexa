'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, Download, Share2 } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    // Handle Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      
      // Only show if not already installed and not dismissed recently
      const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at')
      const now = Date.now()
      
      if (!window.matchMedia('(display-mode: standalone)').matches && 
          (!dismissedAt || now - parseInt(dismissedAt) > 48 * 60 * 60 * 1000)) {
        setIsVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS, show a manual hint if not standalone
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      const lastPrompt = localStorage.getItem('pwa_ios_prompt_last')
      const now = Date.now()
      // Show every 48 hours for iOS
      if (!lastPrompt || now - parseInt(lastPrompt) > 48 * 60 * 60 * 1000) {
        setIsVisible(true)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    console.log('PWA: Prompt dismissed manually')
    setIsVisible(false)
    localStorage.setItem(isIOS ? 'pwa_ios_prompt_last' : 'pwa_prompt_dismissed_at', Date.now().toString())
  }

  const handleIOSClick = () => {
    alert('Toca el botón "Compartir" de tu navegador (el cuadrado con la flecha hacia arriba) y luego selecciona "Añadir a la pantalla de inicio".')
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ 
            y: 0, 
            opacity: 1, 
            scale: 1,
            transition: {
              type: "spring",
              damping: 20,
              stiffness: 300
            }
          }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-48px)] max-w-md"
        >
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden group tap-bounce">
            {/* Animated Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* App Icon Mockup */}
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-violet-500/20 shrink-0 relative z-10"
            >
              🐾
            </motion.div>

            <div className="flex-1 min-w-0 relative z-10">
              <h3 className="text-white font-bold text-sm tracking-tight">Instalar PetNexa</h3>
              <p className="text-white/60 text-xs leading-relaxed truncate">
                {isIOS 
                  ? 'Toca Compartir > "Añadir a pantalla de inicio"' 
                  : 'Usa PetNexa como una App nativa en tu móvil.'}
              </p>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              {isIOS ? (
                <button
                  onClick={handleIOSClick}
                  className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors cursor-pointer p-2"
                >
                  <Share2 size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Share</span>
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-violet-600/30"
                >
                  Instalar
                </button>
              )}
              
              <button
                onClick={handleDismiss}
                className="text-white/30 hover:text-white/60 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
