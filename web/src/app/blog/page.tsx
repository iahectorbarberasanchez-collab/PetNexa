import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Blog – PetNexa | Consejos para tu Mascota',
    description: 'Artículos semanales sobre salud, cuidados, nutrición y más para tu mascota. Redactados por expertos.',
}

interface BlogPost {
    id: string
    title: string
    slug: string
    excerpt: string | null
    cover_image_url: string | null
    author: string
    category: string
    tags: string[]
    read_time_minutes: number
    created_at: string
}

const CATEGORY_COLORS: Record<string, string> = {
    'Consejos': '#8B5CF6',
    'Salud': '#00D4FF',
    'Nutrición': '#00E5A0',
    'Comportamiento': '#F59E0B',
    'Adopción': '#FF6B9D',
    'Noticias': '#6C3FF5',
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function getPosts(): Promise<BlogPost[]> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, author, category, tags, read_time_minutes, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
    return data || []
}

export default async function BlogPage() {
    const posts = await getPosts()
    const featured = posts[0] ?? null
    const rest = posts.slice(1)

    return (
        <main className="min-h-screen bg-[#07070F] relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute w-[700px] h-[700px] rounded-full top-[-200px] right-[-200px]" style={{ background: 'radial-gradient(circle, rgba(108,63,245,0.12) 0%, transparent 70%)' }} />
                <div className="absolute w-[500px] h-[500px] rounded-full bottom-0 left-[-100px]" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)' }} />
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b border-[rgba(108,63,245,0.12)] bg-[rgba(7,7,15,0.85)] px-6 md:px-[52px] h-[68px] flex items-center justify-between">
                <Link href="/" className="flex items-center gap-[10px] no-underline">
                    <div className="w-[38px] h-[38px] rounded-[11px] bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] flex items-center justify-center text-[20px]">🐾</div>
                    <span className="font-['Outfit',_sans-serif] font-extrabold text-[1.25rem] bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">
                        PetNexa
                    </span>
                </Link>
                <div className="flex gap-[12px] items-center">
                    <Link href="/" className="px-[22px] py-[9px] rounded-[11px] border border-[rgba(108,63,245,0.25)] text-[rgba(248,248,255,0.8)] font-['Outfit',_sans-serif] font-semibold text-[0.88rem] no-underline transition-all duration-200 hover:bg-white/5">
                        ← Inicio
                    </Link>
                    <Link href="/auth" className="px-[22px] py-[9px] rounded-[11px] bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white font-['Outfit',_sans-serif] font-bold text-[0.88rem] no-underline transition-all duration-200 hover:scale-105 shadow-[0_4px_16px_rgba(108,63,245,0.4)]">
                        Entrar →
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <div className="relative z-10 max-w-[1200px] mx-auto pt-[108px] px-6 pb-[80px]">

                {/* Header */}
                <div className="text-center mb-[72px]">
                    <div className="inline-flex items-center gap-2 bg-[rgba(108,63,245,0.1)] border border-[rgba(108,63,245,0.25)] rounded-full px-[18px] py-[7px] mb-[28px]">
                        <span className="w-[7px] h-[7px] rounded-full bg-[#00E5A0] inline-block shadow-[0_0_10px_#00E5A0]" />
                        <span className="text-[0.82rem] font-['Outfit',_sans-serif] font-semibold text-[rgba(248,248,255,0.8)]">Artículos nuevos cada semana</span>
                    </div>
                    <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] font-black mb-4 font-['Outfit',_sans-serif] tracking-tight">
                        Blog{' '}
                        <span className="bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">PetNexa</span>
                    </h1>
                    <p className="text-[rgba(248,248,255,0.6)] text-[1.05rem] max-w-[560px] mx-auto leading-relaxed">
                        Todo lo que necesitas saber para cuidar a tu mascota. Consejos de expertos, salud, nutrición y mucho más.
                    </p>
                </div>

                {/* No posts state */}
                {posts.length === 0 ? (
                    <div className="text-center py-[80px] px-6 bg-[rgba(15,15,28,0.6)] rounded-[24px] border border-[rgba(108,63,245,0.12)]">
                        <div className="text-[64px] mb-5">✍️</div>
                        <h2 className="font-['Outfit',_sans-serif] font-bold text-[1.4rem] mb-3">El blog está en camino</h2>
                        <p className="text-[rgba(248,248,255,0.5)] leading-relaxed">Pronto publicaremos artículos semanales sobre el cuidado de tus mascotas.</p>
                    </div>
                ) : (
                    <>
                        {/* Featured post */}
                        {featured && (
                            <Link href={`/blog/${featured.slug}`} className="block no-underline">
                                <div className={`grid ${featured.cover_image_url ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} bg-[rgba(15,15,28,0.7)] border border-[rgba(108,63,245,0.18)] rounded-[24px] overflow-hidden mb-[48px] backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(108,63,245,0.15)]`}>
                                    {featured.cover_image_url && (
                                        <div className="overflow-hidden max-h-[380px]">
                                            <img src={featured.cover_image_url} alt={featured.title} className="w-full h-full object-cover block" />
                                        </div>
                                    )}
                                    <div className="py-[48px] px-6 md:px-[44px] flex flex-col justify-center">
                                        <div className="flex gap-2 mb-5 flex-wrap items-center">
                                            <span className="text-[0.72rem] font-bold font-['Outfit',_sans-serif] px-3 py-1 rounded-full uppercase tracking-wider"
                                                style={{
                                                    color: CATEGORY_COLORS[featured.category] || '#8B5CF6',
                                                    background: `${CATEGORY_COLORS[featured.category] || '#8B5CF6'}18`,
                                                    border: `1px solid ${CATEGORY_COLORS[featured.category] || '#8B5CF6'}30`,
                                                }}>{featured.category}</span>
                                            <span className="text-[0.72rem] text-[rgba(248,248,255,0.5)]">⭐ Destacado</span>
                                        </div>
                                        <h2 className="text-[clamp(1.4rem,2.8vw,2rem)] font-extrabold font-['Outfit',_sans-serif] mb-4 leading-snug">{featured.title}</h2>
                                        {featured.excerpt && <p className="text-[rgba(248,248,255,0.6)] text-[0.95rem] leading-relaxed mb-7">{featured.excerpt}</p>}
                                        <div className="flex items-center gap-4 text-[rgba(248,248,255,0.5)] text-[0.8rem]">
                                            <span>✍️ {featured.author}</span>
                                            <span className="hidden sm:inline">·</span>
                                            <span>📅 {fmtDate(featured.created_at)}</span>
                                            <span className="hidden sm:inline">·</span>
                                            <span>⏱️ {featured.read_time_minutes} min</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Grid of posts */}
                        {rest.length > 0 && (
                            <>
                                <h2 className="font-['Outfit',_sans-serif] font-bold text-[0.75rem] text-[rgba(248,248,255,0.4)] tracking-widest uppercase mb-6">
                                    Más Artículos
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {rest.map((post: BlogPost) => {
                                        const catColor = CATEGORY_COLORS[post.category] || '#8B5CF6'
                                        return (
                                            <Link key={post.id} href={`/blog/${post.slug}`} className="no-underline">
                                                <div className="bg-[rgba(15,15,28,0.7)] border border-[rgba(108,63,245,0.14)] rounded-[20px] overflow-hidden flex flex-col h-full transition-transform duration-300 hover:-translate-y-1 hover:border-[rgba(108,63,245,0.3)]">
                                                    {post.cover_image_url && (
                                                        <div className="overflow-hidden h-[200px]">
                                                            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="p-6 flex-1 flex flex-col">
                                                        <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-3.5 w-fit"
                                                            style={{
                                                                color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30`,
                                                            }}>{post.category}</span>
                                                        <h3 className="text-[1.05rem] font-bold font-['Outfit',_sans-serif] mb-2.5 leading-snug flex-1">{post.title}</h3>
                                                        {post.excerpt && (
                                                            <p className="text-[rgba(248,248,255,0.5)] text-[0.85rem] leading-relaxed mb-[18px]">
                                                                {post.excerpt.length > 120 ? post.excerpt.slice(0, 120) + '...' : post.excerpt}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 text-[rgba(248,248,255,0.4)] text-[0.76rem] border-t border-[rgba(255,255,255,0.05)] pt-3.5 mt-auto">
                                                            <span>{fmtDate(post.created_at)}</span>
                                                            <span>·</span>
                                                            <span>⏱️ {post.read_time_minutes} min</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-[rgba(108,63,245,0.1)] py-7 px-6 md:px-[52px] flex flex-col sm:flex-row justify-between items-center flex-wrap gap-3">
                <span className="font-['Outfit',_sans-serif] font-bold bg-gradient-to-br from-[#A78BFA] to-[#00D4FF] bg-clip-text text-transparent">🐾 PetNexa</span>
                <p className="text-[rgba(248,248,255,0.4)] text-[0.82rem] text-center">© 2026 PetNexa. Todos los derechos reservados.</p>
            </footer>
        </main>
    )
}
