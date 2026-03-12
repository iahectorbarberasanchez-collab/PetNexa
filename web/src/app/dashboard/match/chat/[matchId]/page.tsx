'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Send, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react'

interface Message {
    id: string
    content: string
    sender_id: string
    created_at: string
    profiles: { display_name: string; avatar_url: string | null }
}

interface MatchInfo {
    id: string
    pet_a: { name: string; avatar_url: string | null; species: string; profiles: { display_name: string } }
    pet_b: { name: string; avatar_url: string | null; species: string; profiles: { display_name: string } }
}

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🦜', Rabbit: '🐰', Fish: '🐠', Other: '🐾'
}

function formatTime(isoString: string): string {
    const d = new Date(isoString)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoString: string): string {
    const d = new Date(isoString)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export default function ChatPage() {
    const { matchId } = useParams()
    const supabase = createClient()
    const [messages, setMessages] = useState<Message[]>([])
    const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
    const [myUserId, setMyUserId] = useState<string | null>(null)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (matchId) {
            init()
        }
    }, [matchId])

    // Scroll to bottom whenever messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const init = async () => {
        setLoading(true)
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        setMyUserId(auth.user.id)

        // Load match info
        const { data: match } = await supabase
            .from('pet_matches')
            .select(`
                id,
                pet_a:pet_a_id (name, avatar_url, species, profiles:owner_id(display_name)),
                pet_b:pet_b_id (name, avatar_url, species, profiles:owner_id(display_name))
            `)
            .eq('id', matchId)
            .single()

        setMatchInfo(match as any)

        // Load existing messages
        const { data: msgs } = await supabase
            .from('match_messages')
            .select('id, content, sender_id, created_at, profiles:sender_id(display_name, avatar_url)')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true })

        setMessages((msgs as any) || [])
        setLoading(false)

        // Subscribe to realtime messages
        const channel = supabase
            .channel(`chat:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_messages',
                    filter: `match_id=eq.${matchId}`
                },
                async (payload) => {
                    // Fetch full message with profile data
                    const { data: newMsg } = await supabase
                        .from('match_messages')
                        .select('id, content, sender_id, created_at, profiles:sender_id(display_name, avatar_url)')
                        .eq('id', payload.new.id)
                        .single()

                    if (newMsg) {
                        setMessages(prev => {
                            // Avoid duplicate if we already added optimistically
                            if (prev.some(m => m.id === newMsg.id)) return prev
                            return [...prev, newMsg as any]
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed || sending || !myUserId) return
        setSending(true)
        setText('')

        const { error } = await supabase.from('match_messages').insert({
            match_id: matchId,
            sender_id: myUserId,
            content: trimmed
        })

        if (error) {
            console.error('Error sending message:', error)
            setText(trimmed) // Restore on error
        }

        setSending(false)
        inputRef.current?.focus()
    }

    // Determine the other pet info for the header
    const otherPet = matchInfo
        ? (matchInfo.pet_a.profiles as any)?.display_name === myUserId
            ? matchInfo.pet_b
            : matchInfo.pet_b
        : null

    // Group messages by date for separators
    const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((groups, msg) => {
        const date = formatDate(msg.created_at)
        const last = groups[groups.length - 1]
        if (last && last.date === date) {
            last.msgs.push(msg)
        } else {
            groups.push({ date, msgs: [msg] })
        }
        return groups
    }, [])

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg text-white">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-white/50 text-sm animate-pulse">Cargando chat...</p>
        </div>
    )

    const pet_a = matchInfo?.pet_a as any
    const pet_b = matchInfo?.pet_b as any

    return (
        <div className="flex flex-col h-screen bg-dark-bg text-white font-sans max-w-2xl mx-auto border-x border-white/5 shadow-2xl relative">

            {/* ── Header ── */}
            <div className="px-5 py-4 border-b border-primary/20 bg-dark-bg/95 backdrop-blur-xl sticky top-0 z-20 flex items-center gap-4">
                <Link href="/dashboard/match" className="text-white/50 hover:text-white transition-colors p-1">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                {/* Both pet avatars overlapping */}
                <div className="relative w-16 h-11 shrink-0">
                    {[pet_a, pet_b].map((pet, i) => (
                        <div key={i}
                            className={`absolute top-0 w-11 h-11 rounded-3xl bg-dark-card border-2 border-dark-bg flex items-center justify-center text-xl shadow-lg
                                ${i === 0 ? 'left-0 z-10' : 'left-5 z-20'}
                            `}
                            style={pet?.avatar_url ? { background: `url(${pet.avatar_url}) center/cover` } : {}}
                        >
                            {!pet?.avatar_url && (SPECIES_EMOJI[pet?.species] || '🐾')}
                        </div>
                    ))}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
                        {pet_a?.name} <span className="text-primary text-xs w-4 h-4 flex items-center justify-center">&</span> {pet_b?.name}
                    </div>
                    <div className="text-xs text-secondary mt-0.5 font-medium flex items-center gap-1.5 ">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Match Privado
                    </div>
                </div>
            </div>

            {/* ── Background Pattern ── */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
            />

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1.5 relative z-10 scrollbar-none">
                {messages.length === 0 && (
                    <div className="text-center mt-20 text-white/30 flex flex-col items-center">
                        <div className="text-6xl mb-6">💬</div>
                        <p className="text-sm bg-white/5 px-6 py-3 rounded-2xl border border-white/10">¡Sois el primer match! Envía un mensaje para iniciar la conversación.</p>
                    </div>
                )}

                {groupedMessages.map(group => (
                    <div key={group.date} className="flex flex-col gap-1.5">
                        {/* Date separator */}
                        <div className="text-center my-4 relative flex items-center justify-center">
                            <div className="absolute w-full h-px bg-white/5" />
                            <span className="relative z-10 bg-dark-bg px-4 py-1 rounded-full text-xs text-white/40 border border-white/10 font-medium tracking-wide">
                                {group.date}
                            </span>
                        </div>

                        {group.msgs.map((msg, i) => {
                            const isMe = msg.sender_id === myUserId
                            const profile = msg.profiles as any
                            const prevMsg = group.msgs[i - 1]
                            const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id)

                            // Logic to round corners properly depending on message stack
                            const nextMsg = group.msgs[i + 1]
                            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id
                            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-2.5 w-full ${isMe ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-2' : ''}`}
                                >
                                    {/* Avatar placeholder to keep alignment */}
                                    {!isMe && (
                                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm shadow-md
                                            ${showAvatar ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-transparent'}
                                        `}
                                            style={(showAvatar && profile?.avatar_url) ? { background: `url(${profile.avatar_url}) center/cover` } : {}}
                                        >
                                            {showAvatar && !profile?.avatar_url && '👤'}
                                        </div>
                                    )}

                                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showAvatar && (
                                            <div className="text-[11px] text-white/40 mb-1 ml-1 font-medium">
                                                {profile?.display_name || 'Usuario'}
                                            </div>
                                        )}
                                        <div className={`
                                            px-4 py-2.5 text-[15px] leading-relaxed break-words shadow-sm
                                            ${isMe
                                                ? 'bg-gradient-to-br from-primary to-secondary text-white'
                                                : 'bg-dark-card border border-white/10 text-white/90'
                                            }
                                            ${isMe ?
                                                `${isFirstInGroup ? 'rounded-tl-2xl rounded-tr-2xl' : 'rounded-tl-2xl rounded-tr-md'} ${isLastInGroup ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-bl-2xl rounded-br-md'} `
                                                :
                                                `${isFirstInGroup ? 'rounded-tr-2xl rounded-tl-2xl' : 'rounded-tl-md rounded-tr-2xl'} ${isLastInGroup ? 'rounded-br-2xl rounded-bl-sm' : 'rounded-br-2xl rounded-bl-md'} `
                                            }
                                        `}>
                                            {msg.content}
                                        </div>

                                        {/* Timestamp specifically placed for the group */}
                                        {isLastInGroup && (
                                            <div className={`text-[10px] text-white/30 tracking-wider mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                                {formatTime(msg.created_at)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}

                <div ref={bottomRef} className="h-4" />
            </div>

            {/* ── Input Bar ── */}
            <form
                onSubmit={sendMessage}
                className="px-4 py-4 bg-dark-bg/95 border-t border-primary/20 flex gap-3 items-end relative z-20 backdrop-blur-xl"
            >
                <div className="relative flex-1 group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        maxLength={1000}
                        className="w-full bg-white/5 border border-white/10 rounded-[24px] py-3.5 pl-5 pr-12 text-white placeholder-white/40 text-[15px] focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all shadow-inner"
                    />
                    {/* Optional: Add an image upload button here in the future inside the input right */}
                    <button type="button" className="absolute right-3 bottom-0 h-[52px] flex items-center justify-center text-white/30 hover:text-primary transition-colors">
                        <ImageIcon className="w-5 h-5" />
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className={`
                        w-[52px] h-[52px] rounded-full shrink-0 flex items-center justify-center transition-all duration-300
                        ${text.trim() && !sending
                            ? 'bg-gradient-to-r from-primary flex-secondary shadow-[0_4px_20px_rgba(255,107,157,0.4)] scale-100 hover:scale-105 active:scale-95 text-white cursor-pointer'
                            : 'bg-white/5 text-white/20 border border-white/5 scale-95 cursor-not-allowed'
                        }
                    `}
                >
                    {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                        <Send className="w-5 h-5 ml-0.5" strokeWidth={2.5} />
                    )}
                </button>
            </form>
        </div>
    )
}
