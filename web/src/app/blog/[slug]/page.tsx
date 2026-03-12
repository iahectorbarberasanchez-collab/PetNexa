import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

interface Props {
    params: { slug: string }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CATEGORY_COLORS: Record<string, string> = {
    'Consejos': '#8B5CF6',
    'Salud': '#00D4FF',
    'Nutrición': '#00E5A0',
    'Comportamiento': '#F59E0B',
    'Adopción': '#FF6B9D',
    'Noticias': '#6C3FF5',
}

interface RelatedPost {
    id: string
    title: string
    slug: string
    cover_image_url: string | null
    category: string
    read_time_minutes: number
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { data: post } = await supabase
        .from('blog_posts')
        .select('title, excerpt, cover_image_url')
        .eq('slug', params.slug)
        .eq('published', true)
        .single()

    if (!post) return { title: 'Artículo no encontrado – PetNexa' }

    return {
        title: `${post.title} – Blog PetNexa`,
        description: post.excerpt || 'Lee este artículo en el blog de PetNexa.',
        openGraph: {
            title: post.title,
            description: post.excerpt ?? undefined,
            images: post.cover_image_url ? [post.cover_image_url] : undefined,
        },
    }
}

export default async function BlogPostPage({ params }: Props) {
    const { data: post } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('published', true)
        .single()

    if (!post) notFound()

    const catColor = CATEGORY_COLORS[post.category] || '#8B5CF6'

    const { data: related } = await supabase
        .from('blog_posts')
        .select('id, title, slug, cover_image_url, category, read_time_minutes')
        .eq('published', true)
        .neq('slug', params.slug)
        .order('created_at', { ascending: false })
        .limit(3)

    return (
        <main style={{ minHeight: '100vh', background: '#07070F', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient orbs */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,63,245,0.1) 0%, transparent 70%)', top: '-100px', right: '-200px' }} />
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', bottom: 0, left: '-100px' }} />
            </div>

            {/* Navbar */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(108,63,245,0.12)',
                background: 'rgba(7,7,15,0.85)',
                padding: '0 52px', height: 68,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐾</div>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.25rem', background: 'linear-gradient(135deg, #A78BFA, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PetNexa</span>
                </Link>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link href="/blog" style={{ padding: '9px 22px', borderRadius: 11, border: '1px solid rgba(108,63,245,0.25)', color: 'rgba(248,248,255,0.7)', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
                        ← Blog
                    </Link>
                    <Link href="/auth" style={{ padding: '9px 22px', borderRadius: 11, background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
                        Entrar →
                    </Link>
                </div>
            </nav>

            {/* Article */}
            <article style={{ position: 'relative', zIndex: 1, maxWidth: 780, margin: '0 auto', padding: '108px 24px 80px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, color: 'rgba(248,248,255,0.3)', fontSize: '0.8rem' }}>
                    <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>PetNexa</Link>
                    <span>/</span>
                    <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</Link>
                    <span>/</span>
                    <span style={{ color: 'rgba(248,248,255,0.55)' }}>{post.title}</span>
                </div>

                {/* Category + tags */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                        padding: '4px 14px', borderRadius: 100, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                        color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30`,
                    }}>{post.category}</span>
                    {(post.tags as string[])?.map((tag: string) => (
                        <span key={tag} style={{ fontSize: '0.72rem', color: 'rgba(248,248,255,0.35)', padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.08)' }}>
                            #{tag}
                        </span>
                    ))}
                </div>

                {/* Title */}
                <h1 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 900, fontFamily: 'Outfit, sans-serif', lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.03em' }}>
                    {post.title}
                </h1>

                {/* Author / Date / Read time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'rgba(248,248,255,0.4)', fontSize: '0.85rem', marginBottom: 40, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐾</div>
                        <span style={{ fontWeight: 600 }}>{post.author}</span>
                    </div>
                    <span>·</span>
                    <span>📅 {fmtDate(post.created_at)}</span>
                    <span>·</span>
                    <span>⏱️ {post.read_time_minutes} min de lectura</span>
                </div>

                {/* Cover image */}
                {post.cover_image_url && (
                    <div style={{ overflow: 'hidden', borderRadius: 20, marginBottom: 48, border: '1px solid rgba(108,63,245,0.15)' }}>
                        <img src={post.cover_image_url} alt={post.title} style={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'cover' }} />
                    </div>
                )}

                {/* Excerpt blockquote */}
                {post.excerpt && (
                    <div style={{
                        background: `${catColor}0F`, border: `1px solid ${catColor}25`,
                        borderLeft: `4px solid ${catColor}`,
                        borderRadius: '0 16px 16px 0', padding: '20px 24px', marginBottom: 40,
                        color: 'rgba(248,248,255,0.7)', fontSize: '1.05rem', lineHeight: 1.75, fontStyle: 'italic',
                    }}>
                        {post.excerpt}
                    </div>
                )}

                {/* Main content */}
                <div
                    style={{ color: 'rgba(248,248,255,0.75)', fontSize: '1.02rem', lineHeight: 1.9, fontFamily: 'Inter, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: (post.content as string).replace(/\n/g, '<br />') }}
                />

                {/* CTA */}
                <div style={{
                    marginTop: 64, padding: '40px', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(108,63,245,0.12) 0%, rgba(0,212,255,0.06) 100%)',
                    border: '1px solid rgba(108,63,245,0.2)', borderRadius: 24, backdropFilter: 'blur(16px)',
                }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>🐾</div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.4rem', marginBottom: 12 }}>¿Te ha sido útil este artículo?</h3>
                    <p style={{ color: 'rgba(248,248,255,0.5)', marginBottom: 28, lineHeight: 1.7 }}>Únete a PetNexa y accede a más consejos personalizados para tu mascota.</p>
                    <Link href="/auth" style={{
                        padding: '14px 40px', borderRadius: 12,
                        background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)',
                        color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                        fontSize: '1rem', textDecoration: 'none', display: 'inline-block',
                        boxShadow: '0 8px 30px rgba(108,63,245,0.4)',
                    }}>
                        Registrarse Gratis →
                    </Link>
                </div>
            </article>

            {/* Related Posts */}
            {related && related.length > 0 && (
                <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
                    <div style={{ borderTop: '1px solid rgba(108,63,245,0.1)', paddingTop: 60 }}>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: 'rgba(248,248,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase' as const, marginBottom: 28 }}>
                            También te puede interesar
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                            {(related as RelatedPost[]).map((p) => {
                                const c = CATEGORY_COLORS[p.category] || '#8B5CF6'
                                return (
                                    <Link key={p.id} href={`/blog/${p.slug}`} style={{ textDecoration: 'none' }}>
                                        <div style={{
                                            background: 'rgba(15,15,28,0.7)', border: '1px solid rgba(108,63,245,0.14)',
                                            borderRadius: 18, overflow: 'hidden', transition: 'transform 0.3s ease',
                                        }}>
                                            {p.cover_image_url && (
                                                <div style={{ height: 160, overflow: 'hidden' }}>
                                                    <img src={p.cover_image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                            <div style={{ padding: 20 }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100, color: c, background: `${c}18`, border: `1px solid ${c}30`, display: 'inline-block', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{p.category}</span>
                                                <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4, marginBottom: 8 }}>{p.title}</h4>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(248,248,255,0.3)' }}>⏱️ {p.read_time_minutes} min</span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(108,63,245,0.1)', padding: '28px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, background: 'linear-gradient(135deg, #A78BFA, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>🐾 PetNexa</span>
                <p style={{ color: 'rgba(248,248,255,0.25)', fontSize: '0.82rem' }}>© 2026 PetNexa. Todos los derechos reservados.</p>
            </footer>
        </main>
    )
}
