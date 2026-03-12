'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

interface Message {
    id: string
    content: string
    sender_id: string
    created_at: string
    profile: { display_name: string | null; avatar_url: string | null } | null
}

interface FriendInfo {
    id: string
    display_name: string | null
    avatar_url: string | null
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export default function FriendChatPage() {
    const { friendshipId } = useParams<{ friendshipId: string }>()
    const [userId, setUserId] = useState<string | null>(null)
    const [friend, setFriend] = useState<FriendInfo | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (friendshipId) init()
    }, [friendshipId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const init = async () => {
        setLoading(true)
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        const uid = auth.user.id
        setUserId(uid)

        // Load friendship to get the other person
        const { data: fs } = await supabase
            .from('friendships')
            .select('requester_id, addressee_id, requester:requester_id(id, display_name, avatar_url), addressee:addressee_id(id, display_name, avatar_url)')
            .eq('id', friendshipId)
            .single()

        if (fs) {
            const other = (fs.requester_id === uid ? fs.addressee : fs.requester) as unknown as FriendInfo
            setFriend(other)
        }

        // Load messages
        const { data: msgs } = await supabase
            .from('friend_messages')
            .select('id, content, sender_id, created_at, profile:sender_id(display_name, avatar_url)')
            .eq('friendship_id', friendshipId)
            .order('created_at', { ascending: true })

        setMessages((msgs as unknown as Message[]) || [])
        setLoading(false)

        // Realtime subscription
        const channel = supabase
            .channel(`friend_chat:${friendshipId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'friend_messages',
                filter: `friendship_id=eq.${friendshipId}`,
            }, async (payload) => {
                const { data: newMsg } = await supabase
                    .from('friend_messages')
                    .select('id, content, sender_id, created_at, profile:sender_id(display_name, avatar_url)')
                    .eq('id', payload.new.id)
                    .single()

                if (newMsg) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === (newMsg as unknown as Message).id)) return prev
                        return [...prev, newMsg as unknown as Message]
                    })
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed || sending || !userId) return
        setSending(true)
        setText('')

        const { error } = await supabase.from('friend_messages').insert({
            friendship_id: friendshipId,
            sender_id: userId,
            content: trimmed,
        })

        if (error) { console.error(error); setText(trimmed) }
        setSending(false)
        inputRef.current?.focus()
    }

    // Group by date
    const grouped = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
        const date = formatDate(msg.created_at)
        const last = acc[acc.length - 1]
        if (last && last.date === date) { last.msgs.push(msg) } else { acc.push({ date, msgs: [msg] }) }
        return acc
    }, [])

    const initials = friend?.display_name?.slice(0, 2).toUpperCase() || '?'

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#07070F', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: '2.5rem', animation: 'pulse 1s infinite' }}>💬</div>
            <p style={{ color: 'rgba(248,248,255,0.5)' }}>Cargando chat...</p>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#07070F', color: '#F8F8FF', fontFamily: "'Inter', sans-serif", maxWidth: 720, margin: '0 auto' }}>

            {/* ── Header ── */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(108,63,245,0.15)', background: 'rgba(8,8,18,0.97)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
                <Link href="/dashboard/friends" style={{ color: 'rgba(248,248,255,0.5)', textDecoration: 'none', fontSize: '1.4rem', lineHeight: 1, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,248,255,0.5)'}
                >←</Link>

                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: friend?.avatar_url ? `url(${friend.avatar_url}) center/cover` : 'linear-gradient(135deg, #6C3FF5, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', border: '1px solid rgba(108,63,245,0.25)' }}>
                    {!friend?.avatar_url && initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {friend?.display_name || 'Amigo'}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'rgba(248,248,255,0.38)', marginTop: 1 }}>
                        👥 Amigo · Chat privado
                    </div>
                </div>
            </div>

            {/* ── Messages ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: 80, color: 'rgba(248,248,255,0.3)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 14 }}>💬</div>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                            ¡Sois amigos! Envía un mensaje para empezar a chatear.
                        </p>
                    </div>
                )}

                {grouped.map(group => (
                    <div key={group.date}>
                        {/* Date separator */}
                        <div style={{ textAlign: 'center', margin: '18px 0 12px' }}>
                            <span style={{ background: '#0D0D19', padding: '3px 14px', borderRadius: 20, fontSize: '0.72rem', color: 'rgba(248,248,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                {group.date}
                            </span>
                        </div>

                        {group.msgs.map((msg, i) => {
                            const isMe = msg.sender_id === userId
                            const prevMsg = group.msgs[i - 1]
                            const showName = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id)

                            return (
                                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                                    {!isMe && (
                                        <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, background: showName ? (msg.profile?.avatar_url ? `url(${msg.profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #6C3FF5, #00D4FF)') : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                                            {showName && !msg.profile?.avatar_url && (msg.profile?.display_name?.slice(0, 1).toUpperCase() || '?')}
                                        </div>
                                    )}
                                    <div style={{ maxWidth: '72%' }}>
                                        {showName && (
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(248,248,255,0.38)', marginBottom: 3, marginLeft: 4 }}>
                                                {msg.profile?.display_name || 'Usuario'}
                                            </div>
                                        )}
                                        <div style={{ padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? 'linear-gradient(135deg, #6C3FF5, #00D4FF)' : 'rgba(255,255,255,0.07)', color: '#F8F8FF', fontSize: '0.92rem', lineHeight: 1.5, wordBreak: 'break-word', boxShadow: isMe ? '0 4px 14px rgba(108,63,245,0.3)' : 'none' }}>
                                            {msg.content}
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'rgba(248,248,255,0.25)', marginTop: 3, textAlign: isMe ? 'right' : 'left', paddingInline: 4 }}>
                                            {formatTime(msg.created_at)}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <form onSubmit={sendMessage} style={{ padding: '12px 18px', borderTop: '1px solid rgba(108,63,245,0.1)', background: 'rgba(8,8,18,0.97)', backdropFilter: 'blur(16px)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    maxLength={2000}
                    style={{ flex: 1, padding: '12px 18px', borderRadius: 22, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(108,63,245,0.2)', color: '#F8F8FF', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'Inter, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(108,63,245,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(108,63,245,0.2)'}
                />
                <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    style={{ width: 46, height: 46, borderRadius: '50%', background: text.trim() ? 'linear-gradient(135deg, #6C3FF5, #00D4FF)' : 'rgba(255,255,255,0.07)', border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', boxShadow: text.trim() ? '0 4px 14px rgba(108,63,245,0.35)' : 'none', transform: text.trim() ? 'scale(1)' : 'scale(0.9)' }}
                >
                    {sending ? '⏳' : '➤'}
                </button>
            </form>
        </div>
    )
}
