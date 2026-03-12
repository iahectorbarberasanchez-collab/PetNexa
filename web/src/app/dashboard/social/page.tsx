'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Post {
    id: string
    user_id: string
    pet_id: string | null
    caption: string | null
    image_url: string | null
    likes_count: number
    comments_count: number
    created_at: string
    pet?: { name: string; species: string; avatar_url: string | null } | null
    profile?: { display_name: string | null } | null
    liked_by_me?: boolean
}

interface Pet { id: string; name: string; species: string }
interface Comment { id: string; user_id: string; content: string; created_at: string; profile?: { display_name: string | null } | null }

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🐦', Fish: '🐠', Rabbit: '🐇', Hamster: '🐹', Reptile: '🦎', Other: '🐾',
}

function timeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'ahora mismo'
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
    return `hace ${Math.floor(diff / 86400)}d`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SocialPage() {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [userId, setUserId] = useState<string | null>(null)
    const [displayName, setDisplayName] = useState<string>('Usuario')
    const [pets, setPets] = useState<Pet[]>([])
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [posting, setPosting] = useState(false)

    // New post form
    const [showForm, setShowForm] = useState(false)
    const [caption, setCaption] = useState('')
    const [selectedPetId, setSelectedPetId] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    // Comments panel
    const [openComments, setOpenComments] = useState<string | null>(null)
    const [comments, setComments] = useState<Record<string, Comment[]>>({})
    const [commentText, setCommentText] = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)

    // ── Load ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)
            const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
            if (prof?.display_name) setDisplayName(prof.display_name)
            await loadAll(user.id)
        })
    }, [])

    const loadAll = async (uid: string) => {
        setLoading(true)
        const [petsRes, postsRes] = await Promise.all([
            supabase.from('pets').select('id, name, species').order('created_at'),
            supabase.from('social_posts')
                .select(`*, pet:pets(name, species, avatar_url), profile:profiles(display_name)`)
                .order('created_at', { ascending: false })
                .limit(50),
        ])

        setPets(petsRes.data || [])

        if (postsRes.data) {
            const postIds = postsRes.data.map(p => p.id)
            const { data: myLikes } = await supabase
                .from('post_likes')
                .select('post_id')
                .eq('user_id', uid)
                .in('post_id', postIds)

            const likedSet = new Set((myLikes || []).map(l => l.post_id))
            setPosts(postsRes.data.map(p => ({ ...p, liked_by_me: likedSet.has(p.id) })))
        }
        setLoading(false)
    }

    // ── Image picker ────────────────────────────────────────────────────────────
    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImageFile(file)
        const reader = new FileReader()
        reader.onload = ev => setImagePreview(ev.target?.result as string)
        reader.readAsDataURL(file)
    }

    // ── Create post ─────────────────────────────────────────────────────────────
    const handlePost = async () => {
        if (!userId || (!caption.trim() && !imageFile)) return
        if (imageFile && imageFile.size > 10 * 1024 * 1024) { alert('La imagen debe ser menor a 10 MB'); return }
        setPosting(true)

        let imageUrl: string | null = null
        if (imageFile) {
            const ext = imageFile.name.split('.').pop() || 'jpg'
            const path = `${userId}/${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage.from('post-images').upload(path, imageFile, { contentType: imageFile.type })
            if (upErr) { alert('Error subiendo imagen: ' + upErr.message); setPosting(false); return }
            const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
            imageUrl = publicUrl
        }

        const { data: newPost, error } = await supabase.from('social_posts').insert({
            user_id: userId,
            pet_id: selectedPetId || null,
            caption: caption.trim() || null,
            image_url: imageUrl,
        }).select('*, pet:pets(name, species, avatar_url)').single()

        if (error) { alert('Error publicando: ' + error.message); setPosting(false); return }

        const selectedPet = pets.find(p => p.id === selectedPetId) || null
        const builtPost: Post = {
            ...newPost,
            profile: { display_name: displayName },
            pet: newPost.pet ?? (selectedPet ? { name: selectedPet.name, species: selectedPet.species, avatar_url: null } : null),
            liked_by_me: false,
        }
        setPosts(prev => [builtPost, ...prev])
        setCaption(''); setImageFile(null); setImagePreview(null); setSelectedPetId(''); setShowForm(false)
        setPosting(false)
    }

    // ── Like / Unlike ───────────────────────────────────────────────────────────
    const handleLike = async (post: Post) => {
        if (!userId) return
        if (post.liked_by_me) {
            await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', userId)
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: false, likes_count: p.likes_count - 1 } : p))
        } else {
            await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId })
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: true, likes_count: p.likes_count + 1 } : p))
        }
    }

    // ── Delete post ─────────────────────────────────────────────────────────────
    const handleDeletePost = async (post: Post) => {
        if (!confirm('¿Eliminar esta publicación?')) return
        if (post.image_url) {
            const path = post.image_url.split('/post-images/')[1]
            if (path) await supabase.storage.from('post-images').remove([path])
        }
        await supabase.from('social_posts').delete().eq('id', post.id)
        setPosts(prev => prev.filter(p => p.id !== post.id))
    }

    // ── Comments ────────────────────────────────────────────────────────────────
    const loadComments = async (postId: string) => {
        if (comments[postId]) { setOpenComments(postId); return }
        const { data } = await supabase.from('post_comments')
            .select(`*, profile:profiles(display_name)`)
            .eq('post_id', postId)
            .order('created_at')
        setComments(prev => ({ ...prev, [postId]: data || [] }))
        setOpenComments(postId)
    }

    const submitComment = async (postId: string) => {
        if (!userId || !commentText.trim()) return
        setSubmittingComment(true)
        const { data, error: cErr } = await supabase.from('post_comments').insert({
            post_id: postId, user_id: userId, content: commentText.trim(),
        }).select('id, post_id, user_id, content, created_at').single()
        if (!cErr && data) {
            const builtComment: Comment = { ...data, profile: { display_name: displayName } }
            setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), builtComment] }))
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
            setCommentText('')
        }
        setSubmittingComment(false)
    }

    // ── Render ────────────────────────────────────────────────────────────────//
    return (
        <div className="min-h-screen bg-[#07070F] text-white">
            <Sidebar />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

            <main className="dashboard-main pb-20 px-6 sm:px-12 relative overflow-hidden">
                {/* Ambient glows */}
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,63,245,0.08) 0%, transparent 70%)', top: '-100px', right: '-100px', pointerEvents: 'none', zIndex: 0 }} />
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', bottom: '100px', left: '-100px', pointerEvents: 'none', zIndex: 0 }} />

                <div className="max-w-[720px] mx-auto pt-6 relative z-10">
                    <Breadcrumbs items={[{ label: 'Social' }]} />
                    <PageHeader
                        title="Social"
                        emoji="📸"
                        subtitle="Comparte los mejores momentos de tu mascota"
                        action={
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowForm(!showForm)}
                                className={`px-6 py-3 rounded-2xl border-none cursor-pointer font-outfit font-bold text-[0.88rem] transition-all flex items-center gap-2.5 ${showForm ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gradient-to-br from-[#6C3FF5] to-[#00D4FF] text-white shadow-[0_8px_24px_rgba(108,63,245,0.4)] hover:shadow-[0_12px_32px_rgba(108,63,245,0.55)] shadow-[#6C3FF5]/40'}`}
                            >
                                {showForm ? '✕ Cancelar' : '✨ Nueva Publicación'}
                            </motion.button>
                        }
                    />

                    {/* New post form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, scale: 0.95, marginBottom: 0 }}
                                animate={{ height: 'auto', opacity: 1, scale: 1, marginBottom: 32 }}
                                exit={{ height: 0, opacity: 0, scale: 0.95, marginBottom: 0 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                style={{ overflow: 'hidden' }}
                                className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[28px] p-7 shadow-2xl"
                            >
                                <h3 className="font-outfit font-extrabold text-[1.1rem] mb-5 text-white flex items-center gap-2">
                                    <span style={{ transform: 'rotate(10deg)', display: 'inline-block' }}>✍️</span> Crear publicación
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                                    <div className="flex flex-col gap-4">
                                        <textarea
                                            value={caption} onChange={e => setCaption(e.target.value)} maxLength={500}
                                            placeholder="¿Qué está pasando hoy? 🐾"
                                            className="w-full box-border bg-black/40 border border-white/10 rounded-2xl px-4 py-4 font-inter text-[0.95rem] text-[#F8F8FF] outline-none resize-none min-h-[140px] focus:border-[#6C3FF5] focus:ring-[4px] focus:ring-[#6C3FF5]/10 transition-all placeholder:text-white/20"
                                        />
                                        
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 relative">
                                                <select value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 font-inter text-[0.9rem] text-[#F8F8FF] outline-none cursor-pointer focus:border-[#6C3FF5] transition-all appearance-none">
                                                    <option value="">¿Quién es el protagonista?</option>
                                                    {pets.map(p => <option key={p.id} value={p.id}>{SPECIES_EMOJI[p.species]} {p.name}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-xs">▼</div>
                                            </div>

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handlePost}
                                                disabled={posting || (!caption.trim() && !imageFile)}
                                                className={`px-8 py-3.5 rounded-xl border-none font-outfit font-bold text-[0.95rem] transition-all flex items-center justify-center gap-2 shrin-0 ${posting || (!caption.trim() && !imageFile) ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-[#6C3FF5] to-[#00D4FF] text-white shadow-xl shadow-[#6C3FF5]/30 cursor-pointer hover:shadow-[#6C3FF5]/50'}`}
                                            >
                                                {posting ? '⏳ Publicando...' : '🚀 Publicar'}
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <motion.div
                                            whileHover={{ scale: 1.02, borderColor: 'rgba(108,63,245,0.4)' }}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square bg-black/40 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer overflow-hidden flex flex-col items-center justify-center transition-all group"
                                        >
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="text-3xl mb-2 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">📸</div>
                                                    <span className="text-[0.7rem] text-white/40 font-bold group-hover:text-white/60">SUBIR FOTO</span>
                                                </>
                                            )}
                                        </motion.div>
                                        {imagePreview && (
                                            <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="text-[0.75rem] text-red-400 bg-transparent border-none cursor-pointer font-bold hover:text-red-300 transition-colors">
                                                ✕ Eliminar foto
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Feed */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="text-4xl"
                            >🐾</motion.div>
                            <p className="text-white/30 font-medium tracking-wide">BUSCANDO AVENTURAS...</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 px-8 bg-white/[0.02] border border-white/5 rounded-[32px] backdrop-blur-sm"
                        >
                            <div className="text-7xl mb-6">📸</div>
                            <h2 className="font-outfit font-extrabold text-[1.8rem] mb-3 text-white">¡El muro está esperando!</h2>
                            <p className="text-white/40 mb-8 max-w-sm mx-auto leading-relaxed">Aún no hay publicaciones. Sé el primero en compartir un momento con tu mascota.</p>
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowForm(true)} 
                                className="px-10 py-4 rounded-2xl border-none cursor-pointer bg-gradient-to-r from-[#6C3FF5] to-[#8B5CF6] text-white font-outfit font-bold text-[1rem] shadow-2xl shadow-[#6C3FF5]/40"
                            >
                                ✨ Hacer mi primera publicación
                            </motion.button>
                        </motion.div>
                    ) : (
                        <LayoutGroup>
                            <div className="flex flex-col gap-6">
                                <AnimatePresence initial={false}>
                                    {posts.map((post, index) => (
                                        <motion.div
                                            key={post.id}
                                            layout
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                            transition={{ 
                                                duration: 0.5, 
                                                delay: index < 10 ? index * 0.1 : 0,
                                                ease: [0.16, 1, 0.3, 1] 
                                            }}
                                            className="bg-white/[0.04] backdrop-blur-xl border border-white/5 rounded-[24px] overflow-hidden shadow-xl"
                                        >
                                            {/* Post header */}
                                            <div className="px-5 py-4 flex justify-between items-center border-b border-white/5">
                                                <div className="flex items-center gap-3.5">
                                                    <motion.div 
                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                        className="w-[48px] h-[48px] rounded-2xl bg-gradient-to-br from-[#6C3FF5]/20 to-[#00D4FF]/20 border border-white/10 flex items-center justify-center text-xl shrink-0"
                                                    >
                                                        {post.pet ? SPECIES_EMOJI[post.pet.species] || '🐾' : '🐾'}
                                                    </motion.div>
                                                    <div>
                                                        <div className="font-bold text-[0.98rem] font-outfit text-white flex items-center gap-1.5">
                                                            {post.profile?.display_name || 'Usuario'}
                                                            {post.pet && (
                                                                <span className="font-medium text-white/40 text-[0.85rem] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                                                    con {post.pet.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[0.75rem] text-white/20 font-medium">{timeAgo(post.created_at)}</div>
                                                    </div>
                                                </div>
                                                {post.user_id === userId && (
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,100,100,0.1)', color: '#FF7070' }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleDeletePost(post)} 
                                                        className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer text-[0.95rem] text-white/10 rounded-xl transition-all"
                                                    >
                                                        🗑️
                                                    </motion.button>
                                                )}
                                            </div>

                                            {/* Image */}
                                            {post.image_url && (
                                                <div className="relative group overflow-hidden bg-black/20">
                                                    <img src={post.image_url} alt="post" className="w-full max-h-[500px] object-cover block transition-transform duration-500 group-hover:scale-[1.02]" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            {(post.caption) && (
                                                <div className="px-6 py-5">
                                                    {post.caption && (
                                                        <p className="text-[1.02rem] leading-relaxed text-white/85 font-inter">
                                                            {post.caption}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="px-6 pb-5 flex gap-6 items-center">
                                                <motion.button 
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleLike(post)} 
                                                    className={`bg-transparent border-none flex items-center gap-2 text-[0.95rem] font-bold transition-all cursor-pointer p-0 ${post.liked_by_me ? 'text-[#6C3FF5]' : 'text-white/30 hover:text-white/50'}`}
                                                >
                                                    <span className={`text-2xl transition-all ${post.liked_by_me ? 'filter drop-shadow-[0_0_10px_rgba(108,63,245,0.8)]' : 'filter grayscale opacity-60'}`}>
                                                        🐾
                                                    </span>
                                                    <span className={post.liked_by_me ? 'text-[#A78BFA]' : ''}>
                                                        {post.likes_count > 0 ? post.likes_count : 'Me gusta'}
                                                    </span>
                                                </motion.button>

                                                <motion.button 
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => openComments === post.id ? setOpenComments(null) : loadComments(post.id)} 
                                                    className={`bg-transparent border-none flex items-center gap-2 text-[0.95rem] font-bold p-0 cursor-pointer transition-all ${openComments === post.id ? 'text-[#00D4FF]' : 'text-white/30 hover:text-white/50'}`}
                                                >
                                                    <span className="text-2xl">💬</span>
                                                    <span>{post.comments_count > 0 ? post.comments_count : 'Comentar'}</span>
                                                </motion.button>
                                            </div>

                                            {/* Comments panel */}
                                            <AnimatePresence>
                                                {openComments === post.id && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-white/5 bg-black/20 overflow-hidden"
                                                    >
                                                        <div className="p-6">
                                                            {(comments[post.id] || []).length === 0 ? (
                                                                <p className="text-[0.88rem] text-white/30 mb-5 text-center italic">No hay comentarios aún. Dale un poco de amor. ❤️</p>
                                                            ) : (
                                                                <div className="flex flex-col gap-4 mb-6">
                                                                    {(comments[post.id] || []).map((c, i) => (
                                                                        <motion.div 
                                                                            initial={{ x: -10, opacity: 0 }}
                                                                            animate={{ x: 0, opacity: 1 }}
                                                                            transition={{ delay: i * 0.05 }}
                                                                            key={c.id} 
                                                                            className="flex gap-3 items-start"
                                                                        >
                                                                            <div className="w-[34px] h-[34px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">🐾</div>
                                                                            <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex-1">
                                                                                <div className="text-[0.78rem] font-bold text-[#A78BFA] mb-1">{c.profile?.display_name || 'Usuario'}</div>
                                                                                <div className="text-[0.92rem] text-white/80 leading-snug font-inter">{c.content}</div>
                                                                            </div>
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex gap-3 items-center">
                                                                <input
                                                                    value={commentText} onChange={e => setCommentText(e.target.value)} maxLength={300}
                                                                    placeholder="Añadir un comentario..."
                                                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment(post.id)}
                                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-inter text-[0.9rem] text-[#F8F8FF] outline-none focus:border-[#6C3FF5] focus:ring-1 focus:ring-[#6C3FF5]/30 transition-all placeholder:text-white/20" />
                                                                <motion.button 
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => submitComment(post.id)} 
                                                                    disabled={!commentText.trim() || submittingComment} 
                                                                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-none font-bold text-xl transition-all cursor-pointer ${(!commentText.trim() || submittingComment) ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-[#6C3FF5] text-white hover:bg-[#8B5CF6]'}`}
                                                                >
                                                                    {submittingComment ? '⏳' : '→'}
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </LayoutGroup>
                    )}
                </div>
            </main>
        </div>
    )
}
