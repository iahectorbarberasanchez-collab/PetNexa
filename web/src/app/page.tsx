import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'PetNexa | Todo para tu Mascota en un Solo Lugar',
  description: 'La app definitiva para dueños de mascotas. Cartilla médica digital, red social, servicios de paseo, cuidado, adiestramiento y más. ¡Únete gratis!',
  keywords: ['mascotas', 'cuidado animal', 'red social mascotas', 'servicios para mascotas', 'cartilla veterinaria digital', 'adiestramiento', 'paseador de perros'],
}

const features = [
  {
    icon: '💉',
    title: 'Cartilla Veterinaria Digital',
    desc: 'Vacunas, desparasitaciones y visitas en un solo lugar. Recordatorios automáticos para no olvidar nada.',
    color: '#6C3FF5',
    glow: 'rgba(108,63,245,0.25)',
  },
  {
    icon: '📸',
    title: 'Red Social para Mascotas',
    desc: 'Crea el perfil de tu mascota, sube fotos y conecta con otros animales de tu ciudad.',
    color: '#00D4FF',
    glow: 'rgba(0,212,255,0.25)',
  },
  {
    icon: '🚨',
    title: 'Alertas de Mascotas Perdidas',
    desc: 'Si tu mascota se pierde, alertamos a todos los usuarios cercanos en segundos.',
    color: '#FF6B9D',
    glow: 'rgba(255,107,157,0.25)',
  },
  {
    icon: '🗺️',
    title: 'Mapa Pet-Friendly',
    desc: 'Encuentra parques, restaurantes y veterinarios que admiten mascotas cerca de ti.',
    color: '#00E5A0',
    glow: 'rgba(0,229,160,0.25)',
  },
  {
    icon: '🤖',
    title: 'Asistente IA (PetBot)',
    desc: '¿Ese alimento es tóxico para tu perro? PetBot responde en segundos con asesoramiento experto.',
    color: '#FFB347',
    glow: 'rgba(255,179,71,0.25)',
  },
  {
    icon: '🪙',
    title: 'PetCoins',
    desc: 'Gana monedas por cuidar bien a tu mascota y canjéalas por descuentos reales en pienso y más.',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.25)',
  },
]

const stats = [
  { value: '1M+', label: 'Mascotas registradas', icon: '🐾' },
  { value: '98%', label: 'Dueños satisfechos', icon: '⭐' },
  { value: '24/7', label: 'Soporte veterinario', icon: '💊' },
  { value: '50+', label: 'Tipos de mascotas', icon: '🦜' },
]

const pets = ['🐶', '🐱', '🐦', '🐟', '🐇', '🦎', '🐹', '🦜', '🐢', '🐍', '🐴', '🐓', '🦀', '🐸', '🕷️']

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#07070F]">
      {/* Ambient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[800px] h-[800px] rounded-full top-[-200px] right-[-200px]" style={{ background: 'radial-gradient(circle, rgba(108,63,245,0.15) 0%, transparent 70%)' }} />
        <div className="absolute w-[600px] h-[600px] rounded-full bottom-0 left-[-150px]" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full top-[40%] left-[30%]" style={{ background: 'radial-gradient(circle, rgba(108,63,245,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b border-[rgba(108,63,245,0.12)] bg-[rgba(7,7,15,0.8)] px-6 md:px-[52px] h-[68px] flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] flex items-center justify-center text-[20px] shadow-[0_4px_16px_rgba(108,63,245,0.4)]">🐾</div>
          <span className="font-['Outfit',_sans-serif] font-extrabold text-[1.25rem] tracking-tight bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">
            PetNexa
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/blog" className="px-4 py-2 md:px-[22px] md:py-[9px] rounded-[11px] border border-[rgba(108,63,245,0.25)] text-[rgba(248,248,255,0.8)] font-['Outfit',_sans-serif] font-semibold text-[0.88rem] no-underline transition-all duration-200 bg-transparent hover:bg-white/5 hover:text-white">
            📝 <span className="hidden sm:inline">Blog</span>
          </Link>
          <Link href="/auth" className="px-4 py-2 md:px-[22px] md:py-[9px] rounded-[11px] border border-[rgba(108,63,245,0.25)] text-[rgba(248,248,255,0.8)] font-['Outfit',_sans-serif] font-semibold text-[0.88rem] no-underline transition-all duration-200 bg-transparent hover:bg-white/5 hover:text-white">
            Entrar
          </Link>
          <Link href="/auth" className="px-4 py-2 md:px-[22px] md:py-[9px] rounded-[11px] bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white font-['Outfit',_sans-serif] font-bold text-[0.88rem] no-underline shadow-[0_4px_20px_rgba(108,63,245,0.4)] transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_25px_rgba(108,63,245,0.5)]">
            <span className="hidden sm:inline">Empezar Gratis</span> →
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 pt-[140px] pb-[80px] text-center max-w-[920px] mx-auto px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[rgba(108,63,245,0.1)] border border-[rgba(108,63,245,0.25)] rounded-full px-[18px] py-[7px] mb-9">
          <span className="w-[7px] h-[7px] rounded-full bg-[#00E5A0] inline-block shadow-[0_0_10px_#00E5A0]" />
          <span className="text-[0.82rem] font-['Outfit',_sans-serif] font-semibold text-[rgba(248,248,255,0.8)]">La app que cambiará el mundo animal 🌍</span>
        </div>

        <h1 className="text-[clamp(2.6rem,6.5vw,4.8rem)] font-black leading-[1.08] mb-6 tracking-tight font-['Outfit',_sans-serif]">
          Todo lo que tu{' '}
          <span className="bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">mascota necesita</span>
          <br />en un solo lugar
        </h1>

        <p className="text-[clamp(1rem,2.2vw,1.2rem)] text-[rgba(248,248,255,0.7)] max-w-[660px] mx-auto mb-12 leading-relaxed">
          Cartilla médica digital, red social para mascotas, alertas de pérdida en tiempo real y mucho más. Gratis para siempre.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-[14px] justify-center mb-[72px]">
          <Link href="/auth" className="px-[42px] py-[16px] rounded-[14px] bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white font-['Outfit',_sans-serif] font-bold text-[1.05rem] shadow-[0_8px_36px_rgba(108,63,245,0.45)] inline-flex items-center gap-2 transition-transform hover:scale-105">
            🐾 Registrarse Gratis
          </Link>
          <a href="#features" className="px-[42px] py-[16px] rounded-[14px] bg-transparent border border-[rgba(108,63,245,0.25)] text-[rgba(248,248,255,0.9)] font-['Outfit',_sans-serif] font-semibold text-[1.05rem] inline-flex items-center gap-2 transition-colors hover:bg-white/5">
            Ver Funciones ↓
          </a>
        </div>

        {/* Floating pet emojis */}
        <div className="flex flex-wrap gap-[14px] justify-center mb-[80px]">
          {pets.map((p, i) => (
            <div key={i}
              className="w-[58px] h-[58px] rounded-[16px] flex items-center justify-center text-[26px] bg-[rgba(255,255,255,0.03)] border border-[rgba(108,63,245,0.18)] backdrop-blur-md shadow-[0_4px_20px_rgba(108,63,245,0.1)]"
              style={{
                animation: `float ${3.2 + (i * 0.35)}s ease-in-out infinite`,
                animationDelay: `${i * 0.18}s`,
              }}>
              {p}
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 max-w-[680px] mx-auto bg-[rgba(17,17,32,0.6)] backdrop-blur-xl border border-[rgba(108,63,245,0.15)] rounded-[20px] overflow-hidden">
          {stats.map((s, i) => (
            <div key={i} className={`text-center py-[24px] px-[16px] ${i < stats.length - 1 ? 'sm:border-r border-[rgba(108,63,245,0.1)]' : ''} ${(i === 0 || i === 1) ? 'border-b sm:border-b-0 border-[rgba(108,63,245,0.1)]' : ''} ${(i === 0 || i === 2) ? 'border-r sm:border-r border-[rgba(108,63,245,0.1)]' : ''}`}>
              <div className="text-[20px] mb-[6px]">{s.icon}</div>
              <div className="text-[1.9rem] font-['Outfit',_sans-serif] font-black bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent leading-none">{s.value}</div>
              <div className="text-[0.78rem] text-[rgba(248,248,255,0.6)] mt-[6px] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 max-w-[1220px] mx-auto px-6 py-[80px]">
        <div className="text-center mb-[60px]">
          <h2 className="text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold mb-4 font-['Outfit',_sans-serif]">
            Pensado para{' '}
            <span className="bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">cada momento</span>
          </h2>
          <p className="text-[rgba(248,248,255,0.6)] text-[1.05rem] max-w-[540px] mx-auto leading-relaxed">
            PetNexa acompaña a tu mascota desde cachorro hasta senior, cubriendo todas sus necesidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[22px]">
          {features.map((f, i) => (
            <div key={i} className="bg-[rgba(15,15,28,0.7)] backdrop-blur-xl border border-[rgba(108,63,245,0.14)] rounded-[22px] p-[28px] transition-all duration-300 relative overflow-hidden group hover:-translate-y-1 hover:border-[rgba(108,63,245,0.3)] hover:bg-[rgba(15,15,28,0.9)]">
              <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100" style={{ background: `radial-gradient(circle at top left, ${f.glow} 0%, transparent 60%)` }} />
              <div className="relative z-10">
                <div className="w-[54px] h-[54px] rounded-[15px] flex items-center justify-center text-[26px] mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{
                    background: `${f.color}18`,
                    border: `1px solid ${f.color}30`,
                    boxShadow: `0 4px 16px ${f.glow}`,
                  }}>
                  {f.icon}
                </div>
                <h3 className="text-[1.1rem] font-['Outfit',_sans-serif] font-bold mb-[10px] text-[#F8F8FF]">{f.title}</h3>
                <p className="text-[rgba(248,248,255,0.6)] text-[0.92rem] leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 px-6 pt-[60px] pb-[100px]">
        <div className="max-w-[820px] mx-auto py-[64px] px-6 md:px-[52px] text-center bg-gradient-to-br from-[rgba(108,63,245,0.18)] to-[rgba(0,212,255,0.08)] border border-[rgba(108,63,245,0.25)] rounded-[28px] backdrop-blur-xl shadow-[0_0_80px_rgba(108,63,245,0.12)]">
          <div className="text-[60px] mb-[24px]">🐾</div>
          <h2 className="text-[clamp(1.7rem,4vw,2.7rem)] font-extrabold mb-[16px] font-['Outfit',_sans-serif]">
            ¿Listo para darle lo mejor<br />a tu{' '}
            <span className="bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">mascota</span>?
          </h2>
          <p className="text-[rgba(248,248,255,0.7)] text-[1.05rem] mb-[36px] leading-[1.7]">
            Únete a miles de dueños que ya confían en PetNexa. Gratis para siempre.
          </p>
          <Link href="/auth" className="px-[32px] md:px-[52px] py-[16px] rounded-[14px] bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white font-['Outfit',_sans-serif] font-bold text-[1.05rem] inline-block shadow-[0_8px_40px_rgba(108,63,245,0.5)] transition-transform hover:scale-105">
            Empezar Ahora – Es Gratis 🚀
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[rgba(108,63,245,0.1)] py-[32px] px-6 md:px-[52px] flex flex-col sm:flex-row justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-[8px]">
          <span className="text-[20px]">🐾</span>
          <span className="font-['Outfit',_sans-serif] font-bold bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">PetNexa</span>
        </div>
        <p className="text-[rgba(248,248,255,0.4)] text-[0.82rem] text-center">© 2026 PetNexa. Todos los derechos reservados.</p>
        <div className="flex gap-[24px]">
          {['Privacidad', 'Términos', 'Contacto'].map(l => (
            <a key={l} href="#" className="text-[rgba(248,248,255,0.5)] hover:text-white transition-colors text-[0.82rem] no-underline">{l}</a>
          ))}
        </div>
      </footer>
    </main>
  )
}
