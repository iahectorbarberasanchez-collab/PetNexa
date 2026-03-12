'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const supabase = createClient()

interface Profile {
    id: string
    display_name: string | null
    avatar_url: string | null
    city: string | null
}

interface Pet {
    id: string
    name: string
    species: string
}

interface Friendship {
    id: string
    requester_id: string
    addressee_id: string
    status: 'pending' | 'accepted' | 'rejected'
    created_at: string
    requester: Profile | null
    addressee: Profile | null
}

interface FriendWithPets extends Profile {
    friendshipId: string
    pets: Pet[]
}

const SPECIES_EMOJI: Record<string, string> = {
    Dog: '🐶', Cat: '🐱', Bird: '🐦', Fish: '🐠', Rabbit: '🐇', Hamster: '🐹', Reptile: '🦎', Other: '🐾',
}

type Tab = 'friends' | 'requests' | 'search'

function Avatar({ profile, size = 48 }: { profile: Profile | null; size?: number }) {
    const initials = profile?.display_name?.slice(0, 2).toUpperCase() || '?'
    return (
        <div style={{
            width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #6C3FF5 0%, #00D4FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.35, fontWeight: 700, color: 'white',
            border: '1px solid rgba(108,63,245,0.25)',
        }}>
            {!profile?.avatar_url && initials}
        </div>
    )
}

export default function FriendsPage() {
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [tab, setTab] = useState<Tab>('friends')
    const [loading, setLoading] = useState(true)

    const [friends, setFriends] = useState<FriendWithPets[]>([])
    const [requests, setRequests] = useState<Friendship[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Profile[]>([])
    const [searching, setSearching] = useState(false)
    const [myRelations, setMyRelations] = useState<Friendship[]>([]) // all my friendships for status check

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)
            await loadData(user.id)
        })
    }, [])

    const loadData = async (uid: string) => {
        setLoading(true)

        // Load all friendships where I'm involved
        const { data: all } = await supabase
            .from('friendships')
            .select('*, requester:requester_id(id, display_name, avatar_url, city), addressee:addressee_id(id, display_name, avatar_url, city)')

        const allList = (all || []) as Friendship[]
        setMyRelations(allList)

        // Accepted friends
        const accepted = allList.filter(f => f.status === 'accepted')
        const friendProfiles: FriendWithPets[] = []

        for (const f of accepted) {
            const friendProfile = f.requester_id === uid ? f.addressee : f.requester
            if (!friendProfile) continue

            const { data: pets } = await supabase
                .from('pets')
                .select('id, name, species')
                .eq('user_id', friendProfile.id)

            friendProfiles.push({
                ...friendProfile,
                friendshipId: f.id,
                pets: pets || [],
            })
        }

        setFriends(friendProfiles)

        // Pending requests I received
        const pending = allList.filter(f => f.status === 'pending' && f.addressee_id === uid)
        setRequests(pending)

        setLoading(false)
    }

    const handleAccept = async (friendshipId: string) => {
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
        if (userId) await loadData(userId)
    }

    const handleReject = async (friendshipId: string) => {
        await supabase.from('friendships').delete().eq('id', friendshipId)
        if (userId) await loadData(userId)
    }

    const handleRemoveFriend = async (friendshipId: string) => {
        if (!confirm('¿Eliminar a esta persona de tus amigos?')) return
        await supabase.from('friendships').delete().eq('id', friendshipId)
        if (userId) await loadData(userId)
    }

    const handleSearch = async () => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) return
        setSearching(true)
        const { data } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, city')
            .ilike('display_name', `%${searchQuery.trim()}%`)
            .neq('id', userId!)
            .limit(10)
        setSearchResults(data || [])
        setSearching(false)
    }

    const handleSendRequest = async (targetId: string) => {
        await supabase.from('friendships').insert({ requester_id: userId!, addressee_id: targetId })
        if (userId) {
            const { data: all } = await supabase
                .from('friendships')
                .select('*, requester:requester_id(id, display_name, avatar_url, city), addressee:addressee_id(id, display_name, avatar_url, city)')
            setMyRelations((all || []) as Friendship[])
        }
    }

    const getRelationStatus = (targetId: string): 'none' | 'pending_sent' | 'pending_received' | 'accepted' => {
        const f = myRelations.find(f =>
            (f.requester_id === userId && f.addressee_id === targetId) ||
            (f.addressee_id === userId && f.requester_id === targetId)
        )
        if (!f) return 'none'
        if (f.status === 'accepted') return 'accepted'
        if (f.requester_id === userId) return 'pending_sent'
        return 'pending_received'
    }

    // ── Styles ──────────────────────────────────────────────────────────────────
    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '9px 22px', borderRadius: 100, border: '1px solid',
        borderColor: active ? '#6C3FF5' : 'rgba(108,63,245,0.18)',
        background: active ? 'rgba(108,63,245,0.16)' : 'transparent',
        color: active ? '#A78BFA' : 'rgba(248,248,255,0.45)',
        fontWeight: active ? 700 : 400, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', transition: 'all 0.2s',
    })

    const cardStyle: React.CSSProperties = {
        background: 'rgba(13,13,25,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(108,63,245,0.12)', borderRadius: 18, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.2s',
    }

    const inputStyle: React.CSSProperties = {
        flex: 1, padding: '12px 16px', borderRadius: 12,
        background: 'rgba(18,18,32,0.9)', border: '1px solid rgba(108,63,245,0.2)',
        color: '#F8F8FF', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif',
    }

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#07070F', color: '#F8F8FF' }}>
            <Sidebar />

            <main className="dashboard-main" style={{ overflowY: 'auto', position: 'relative' }}>
                {/* Premium background */}
                <div className="noise-overlay" />
                <div className="orb w-[500px] h-[500px] -top-20 -right-20 bg-[radial-gradient(circle,rgba(108,63,245,0.07)_0%,transparent_70%)]" />
                <div className="orb w-[400px] h-[400px] top-1/2 -left-20 bg-[radial-gradient(circle,rgba(0,212,255,0.04)_0%,transparent_70%)]" />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header */}
                    <div style={{ marginBottom: 28 }}>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.9rem', fontWeight: 800, marginBottom: 6 }}>
                            Amigos 👥
                        </h1>
                        <p style={{ color: 'rgba(248,248,255,0.38)', fontSize: '0.88rem' }}>
                            Conecta con otros dueños de mascotas
                        </p>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
                        <button style={tabStyle(tab === 'friends')} onClick={() => setTab('friends')}>
                            👫 Mis Amigos {friends.length > 0 && `(${friends.length})`}
                        </button>
                        <button style={tabStyle(tab === 'requests')} onClick={() => setTab('requests')}>
                            📬 Solicitudes
                            {requests.length > 0 && (
                                <span style={{ marginLeft: 8, background: '#6C3FF5', borderRadius: 100, padding: '2px 8px', fontSize: '0.72rem', color: 'white', fontWeight: 700 }}>
                                    {requests.length}
                                </span>
                            )}
                        </button>
                        <button style={tabStyle(tab === 'search')} onClick={() => setTab('search')}>
                            🔍 Buscar
                        </button>
                    </div>

                    <div style={{ maxWidth: 680 }}>

                        {/* ── TAB: FRIENDS ── */}
                        {tab === 'friends' && (
                            loading ? (
                                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(108,63,245,0.3)', borderTopColor: '#6C3FF5', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                                    <p style={{ color: 'rgba(248,248,255,0.35)' }}>Cargando amigos...</p>
                                </div>
                            ) : friends.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '72px 24px', background: 'rgba(13,13,25,0.7)', border: '1px dashed rgba(108,63,245,0.2)', borderRadius: 22 }}>
                                    <div style={{ fontSize: 64, marginBottom: 20 }}>👥</div>
                                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.3rem', marginBottom: 10 }}>
                                        Todavía no tienes amigos
                                    </h2>
                                    <p style={{ color: 'rgba(248,248,255,0.4)', marginBottom: 24, lineHeight: 1.7 }}>
                                        Busca a otros dueños de mascotas y envíales una solicitud de amistad.
                                    </p>
                                    <button onClick={() => setTab('search')} style={{
                                        padding: '12px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', color: 'white',
                                        fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                                        boxShadow: '0 4px 20px rgba(108,63,245,0.4)',
                                    }}>🔍 Buscar amigos</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {friends.map(friend => (
                                        <div key={friend.id}
                                            style={cardStyle}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,63,245,0.3)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(108,63,245,0.12)'}
                                        >
                                            <Avatar profile={friend} size={52} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>
                                                    {friend.display_name || 'Usuario'}
                                                </div>
                                                {friend.city && (
                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(248,248,255,0.38)', marginBottom: 6 }}>📍 {friend.city}</div>
                                                )}
                                                {friend.pets.length > 0 && (
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {friend.pets.map(pet => (
                                                            <span key={pet.id} style={{
                                                                fontSize: '0.72rem', padding: '3px 9px', borderRadius: 100,
                                                                background: 'rgba(108,63,245,0.1)', border: '1px solid rgba(108,63,245,0.2)',
                                                                color: '#A78BFA', fontWeight: 600,
                                                            }}>
                                                                {SPECIES_EMOJI[pet.species] || '🐾'} {pet.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                                <Link
                                                    href={`/dashboard/friends/chat/${friend.friendshipId}`}
                                                    style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 4px 14px rgba(108,63,245,0.3)' }}
                                                >💬 Chat</Link>
                                                <button
                                                    onClick={() => handleRemoveFriend(friend.friendshipId)}
                                                    style={{ background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 9, padding: '7px 12px', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; e.currentTarget.style.color = '#FF6B6B' }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,100,100,0.6)' }}
                                                >✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── TAB: REQUESTS ── */}
                        {tab === 'requests' && (
                            requests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '72px 24px', background: 'rgba(13,13,25,0.7)', border: '1px dashed rgba(108,63,245,0.2)', borderRadius: 22 }}>
                                    <div style={{ fontSize: 56, marginBottom: 18 }}>📬</div>
                                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>Sin solicitudes pendientes</h2>
                                    <p style={{ color: 'rgba(248,248,255,0.4)', lineHeight: 1.7 }}>
                                        Cuando alguien te envíe una solicitud de amistad, aparecerá aquí.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {requests.map(req => (
                                        <div key={req.id} style={cardStyle}>
                                            <Avatar profile={req.requester} size={52} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>
                                                    {req.requester?.display_name || 'Usuario'}
                                                </div>
                                                {req.requester?.city && (
                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(248,248,255,0.38)' }}>📍 {req.requester.city}</div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => handleAccept(req.id)}
                                                    style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.82rem', boxShadow: '0 4px 14px rgba(108,63,245,0.3)', transition: 'all 0.2s' }}
                                                >✓ Aceptar</button>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    style={{ padding: '8px 14px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,80,80,0.25)', cursor: 'pointer', color: 'rgba(255,100,100,0.7)', fontSize: '0.82rem', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; e.currentTarget.style.color = '#FF6B6B' }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,100,100,0.7)' }}
                                                >✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── TAB: SEARCH ── */}
                        {tab === 'search' && (
                            <div>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                                    <input
                                        style={inputStyle}
                                        type="text"
                                        placeholder="Busca por nombre de usuario..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={searching || searchQuery.trim().length < 2}
                                        style={{
                                            padding: '12px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                            background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', color: 'white',
                                            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.88rem',
                                            boxShadow: '0 4px 18px rgba(108,63,245,0.35)', opacity: searching ? 0.6 : 1,
                                        }}
                                    >
                                        {searching ? '⏳' : '🔍 Buscar'}
                                    </button>
                                </div>

                                {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(248,248,255,0.35)', fontSize: '0.88rem' }}>
                                        Sin resultados para "{searchQuery}"
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                                    {searchResults.map(profile => {
                                        const status = getRelationStatus(profile.id)
                                        return (
                                            <div key={profile.id} style={cardStyle}>
                                                <Avatar profile={profile} size={50} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.98rem', marginBottom: 2 }}>
                                                        {profile.display_name || 'Usuario'}
                                                    </div>
                                                    {profile.city && (
                                                        <div style={{ fontSize: '0.78rem', color: 'rgba(248,248,255,0.38)' }}>📍 {profile.city}</div>
                                                    )}
                                                </div>
                                                {status === 'none' && (
                                                    <button
                                                        onClick={() => handleSendRequest(profile.id)}
                                                        style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6C3FF5, #00D4FF)', color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.82rem', boxShadow: '0 4px 14px rgba(108,63,245,0.3)' }}
                                                    >+ Añadir</button>
                                                )}
                                                {status === 'pending_sent' && (
                                                    <span style={{ fontSize: '0.78rem', color: 'rgba(248,248,255,0.35)', fontStyle: 'italic' }}>Solicitud enviada</span>
                                                )}
                                                {status === 'pending_received' && (
                                                    <span style={{ fontSize: '0.78rem', color: '#A78BFA', fontWeight: 600 }}>Te ha enviado solicitud</span>
                                                )}
                                                {status === 'accepted' && (
                                                    <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>✓ Ya sois amigos</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>{/* end z-index wrapper */}
            </main>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
