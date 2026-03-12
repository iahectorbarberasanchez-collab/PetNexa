'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { PageHeader } from '@/components/ui/PageHeader'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Pet {
    id: string
    name: string
    avatar_url: string | null
    species: string
}

interface RoutePoint {
    lat: number
    lng: number
    timestamp: number
}

// Distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
    return `${s}s`
}

// Dark map styles
const DARK_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f1a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1c2e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#131325' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030d1a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
]

declare global {
    interface Window {
        initWalkMap: () => void
    }
}

export default function RecordWalkPage() {
    const supabase = createClient()
    const router = useRouter()

    const [userId, setUserId] = useState<string | null>(null)
    const [pets, setPets] = useState<Pet[]>([])
    const [selectedPetId, setSelectedPetId] = useState<string>('')
    const [walkTitle, setWalkTitle] = useState('Paseo matutino')

    // Map & Geolocation State
    const [mapReady, setMapReady] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [route, setRoute] = useState<RoutePoint[]>([])
    const [distanceKm, setDistanceKm] = useState(0)
    const [durationSecs, setDurationSecs] = useState(0)
    const [startTime, setStartTime] = useState<Date | null>(null)
    const [saving, setSaving] = useState(false)
    const [rewardToShow, setRewardToShow] = useState<number | null>(null)

    // Refs
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const polylineRef = useRef<google.maps.Polyline | null>(null)
    const markerRef = useRef<google.maps.Marker | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const latestRouteRef = useRef<RoutePoint[]>([])

    // ── Load User & Pets ────────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.push('/auth'); return }
            setUserId(user.id)
            const { data } = await supabase.from('pets').select('id, name, avatar_url, species').eq('user_id', user.id)
            if (data && data.length > 0) {
                setPets(data)
                setSelectedPetId(data[0].id)
            }
        })
    }, [])

    // ── Load Maps Script ────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.google && window.google.maps) {
            setMapReady(true)
            return
        }
        window.initWalkMap = () => setMapReady(true)
        const script = document.createElement('script')
        const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry&callback=initWalkMap`
        script.async = true
        script.defer = true
        document.head.appendChild(script)
        return () => {
            delete (window as any).initWalkMap
            // cleanup map if unmounted
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    // Initialize map once ready
    useEffect(() => {
        if (!mapReady || !mapContainerRef.current || mapInstanceRef.current) return

        mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
            center: { lat: 40.4168, lng: -3.7038 }, // Madrid default
            zoom: 15,
            styles: DARK_STYLES,
            disableDefaultUI: true,
        })

        polylineRef.current = new google.maps.Polyline({
            path: [],
            geodesic: true,
            strokeColor: '#00E5A0',
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: mapInstanceRef.current
        })

        markerRef.current = new google.maps.Marker({
            map: mapInstanceRef.current,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: '#00D4FF',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
            },
        })

        // Ask for current pos immediately to center the map
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    mapInstanceRef.current?.setCenter(c)
                    markerRef.current?.setPosition(c)
                },
                (err) => console.log('Geolocation base error', err),
                { enableHighAccuracy: true }
            )
        }
    }, [mapReady])

    // Update refs whenever state changes so async callbacks get latest
    useEffect(() => {
        latestRouteRef.current = route
    }, [route])

    // ── Recording Logic ─────────────────────────────────────────────────────────

    const startRecording = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser')
            return
        }

        setIsRecording(true)
        setIsPaused(false)
        setStartTime(new Date())

        // Start timer
        timerRef.current = setInterval(() => {
            setDurationSecs(prev => prev + 1)
        }, 1000)

        // Start tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                // If paused, just update marker but do not add to route
                const point: RoutePoint = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: position.timestamp
                }

                markerRef.current?.setPosition(point)

                // Only center map if recording actively
                mapInstanceRef.current?.setCenter(point)

                setRoute(prevRoute => {
                    // Update distance
                    if (prevRoute.length > 0) {
                        const lastPoint = prevRoute[prevRoute.length - 1]
                        const dist = calculateDistance(lastPoint.lat, lastPoint.lng, point.lat, point.lng)
                        // Ignore crazy large jumps (>1km in a tick) or 0
                        if (dist > 0 && dist < 1) {
                            setDistanceKm(d => d + dist)
                        }
                    }

                    const newRoute = [...prevRoute, point]

                    // Update polyline
                    if (polylineRef.current) {
                        polylineRef.current.setPath(newRoute.map(p => ({ lat: p.lat, lng: p.lng })))
                    }

                    return newRoute
                })
            },
            (error) => {
                console.error("Error watching position", error)
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        )
    }

    const togglePause = () => {
        if (isPaused) {
            // Resume
            setIsPaused(false)
            timerRef.current = setInterval(() => {
                setDurationSecs(prev => prev + 1)
            }, 1000)
            if (!watchIdRef.current) {
                // Restart logic in effect
            }
        } else {
            // Pause
            setIsPaused(true)
            if (timerRef.current) clearInterval(timerRef.current)
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
        }
    }

    // Effect to handle pause accurately
    useEffect(() => {
        if (!isRecording) return
        if (isPaused) {
            if (timerRef.current) clearInterval(timerRef.current)
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
        } else {
            if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                    setDurationSecs(prev => prev + 1)
                }, 1000)
            }
            if (!watchIdRef.current) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const point = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: position.timestamp }
                        markerRef.current?.setPosition(point)
                        mapInstanceRef.current?.panTo(point)
                        setRoute(prevRoute => {
                            if (prevRoute.length > 0) {
                                const lastPoint = prevRoute[prevRoute.length - 1]
                                const dist = calculateDistance(lastPoint.lat, lastPoint.lng, point.lat, point.lng)
                                if (dist < 1) setDistanceKm(d => d + dist)
                            }
                            const newRoute = [...prevRoute, point]
                            if (polylineRef.current) polylineRef.current.setPath(newRoute)
                            return newRoute
                        })
                    },
                    (e) => console.error(e),
                    { enableHighAccuracy: true }
                )
            }
        }
    }, [isPaused, isRecording])

    const finishWalk = async () => {
        if (route.length < 2 && distanceKm < 0.01) {
            if (!confirm("El paseo es muy corto. ¿Finalizar de todos modos?")) return
        }

        setSaving(true)
        if (timerRef.current) clearInterval(timerRef.current)
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)

        const now = new Date()

        // ── Petcoins Calculation ──
        let earnedCoins = 0
        const durationHours = durationSecs / 3600
        const avgSpeed = durationHours > 0 ? distanceKm / durationHours : 0

        // Anti-cheat: avg speed <= 15 km/h
        if (avgSpeed <= 15) {
            if (distanceKm >= 1) {
                earnedCoins += Math.floor(distanceKm) * 15
            }
            if (durationSecs >= 1800) {
                earnedCoins += 20
            }

            if (earnedCoins > 0 && userId) {
                // Check daily limit (max 100 per day)
                const startOfDay = new Date()
                startOfDay.setHours(0, 0, 0, 0)

                const { data: todayWalks } = await supabase
                    .from('walks')
                    .select('earned_coins')
                    .eq('user_id', userId)
                    .gte('created_at', startOfDay.toISOString())

                const coinsEarnedToday = todayWalks?.reduce((sum, walk) => sum + (walk.earned_coins || 0), 0) || 0
                const coinsAvailableToday = Math.max(0, 100 - coinsEarnedToday)

                if (earnedCoins > coinsAvailableToday) {
                    earnedCoins = coinsAvailableToday
                }
            }
        }

        const { error } = await supabase.from('walks').insert({
            user_id: userId,
            pet_id: selectedPetId || null,
            title: walkTitle || 'Paseo matutino',
            route: route,
            distance_km: distanceKm,
            duration_seconds: durationSecs,
            start_time: startTime?.toISOString() || now.toISOString(),
            end_time: now.toISOString(),
            earned_coins: earnedCoins
        })

        if (!error && earnedCoins > 0) {
            // Add coins to profile
            const { data: profile } = await supabase.from('profiles').select('pet_coins').eq('id', userId).single()
            if (profile) {
                await supabase.from('profiles').update({ pet_coins: (profile.pet_coins || 0) + earnedCoins }).eq('id', userId)
            }
        }

        setSaving(false)
        if (error) {
            alert('Error guardando el paseo: ' + error.message)
            return
        }

        if (earnedCoins > 0) {
            setRewardToShow(earnedCoins)
        } else {
            router.push('/dashboard/walks')
        }
    }

    const cancelWalk = () => {
        if (!confirm('¿Descartar este paseo? Se perderán los datos grabados.')) return
        if (timerRef.current) clearInterval(timerRef.current)
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
        router.push('/dashboard/walks')
    }

    // ── Render ────────────────────────────────────────────────────────────────//
    return (
        <div className="min-h-screen bg-dark-bg text-white relative flex flex-col sm:flex-row">
            <Sidebar />

            {/* Reward Modal */}
            {rewardToShow !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07070F]/90 backdrop-blur-sm">
                    <div className="bg-[#0D0D19] border border-[#F59E0B]/30 rounded-[32px] p-8 max-w-sm w-full text-center shadow-[0_0_80px_rgba(245,158,11,0.2)] animate-in zoom-in-95 duration-500">
                        <div className="text-[80px] mb-4 animate-[bounce_2s_infinite]">🪙</div>
                        <h2 className="text-3xl font-outfit font-extrabold text-[#F59E0B] mb-2">¡Paseo Completado!</h2>
                        <p className="text-white/70 mb-8 font-outfit text-sm">Tú y tu mascota habéis hecho un gran trabajo. Has ganado:</p>
                        <div className="text-6xl font-outfit font-black text-white mb-8 flex items-end justify-center gap-2">
                            +{rewardToShow} <span className="text-2xl font-bold text-[#F59E0B] mb-2">PC</span>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/walks')}
                            className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white font-bold font-outfit py-4 rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all text-lg"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            <main className="dashboard-main flex-1 flex flex-col h-screen overflow-hidden relative">

                {/* Fixed Map Background */}
                <div className="absolute inset-0 z-0">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07070F] via-transparent pointer-events-none" />
                </div>

                {/* Top UI */}
                <div className="relative z-10 p-6 sm:p-8 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-outfit font-extrabold text-[#00E5A0] drop-shadow-md">Grabar Paseo</h1>
                        <button onClick={cancelWalk} className="text-white/60 hover:text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-sm backdrop-blur-md">
                            ✕ Cancelar
                        </button>
                    </div>

                    {!isRecording && (
                        <div className="bg-[#0D0D19]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 max-w-sm shadow-2xl">
                            <label className="block text-sm text-white/60 mb-1.5 font-outfit">Título del paseo</label>
                            <input
                                type="text"
                                value={walkTitle}
                                onChange={e => setWalkTitle(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00E5A0]/50 mb-4 transition-colors font-outfit"
                                placeholder="Ej: Paseo por la playa"
                            />

                            <label className="block text-sm text-white/60 mb-1.5 font-outfit">¿Con quién paseas?</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
                                {pets.map(pet => (
                                    <button
                                        key={pet.id}
                                        onClick={() => setSelectedPetId(pet.id)}
                                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${selectedPetId === pet.id
                                            ? 'bg-[#00E5A0]/20 border-[#00E5A0] text-[#00E5A0]'
                                            : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-xs">
                                            {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full object-cover" /> : '🐾'}
                                        </div>
                                        <span className="font-outfit font-medium text-sm">{pet.name}</span>
                                    </button>
                                ))}
                                {pets.length === 0 && (
                                    <div className="text-white/40 text-sm">No tienes mascotas registradas</div>
                                )}
                            </div>

                            <button
                                onClick={startRecording}
                                className="w-full bg-gradient-to-r from-[#00E5A0] to-[#00B37E] text-[#07070F] font-bold font-outfit py-3.5 rounded-xl text-lg hover:shadow-[0_0_20px_rgba(0,229,160,0.4)] transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                <span className="text-xl">▶</span> Empezar
                            </button>
                        </div>
                    )}
                </div>

                {/* Dashboard Stats (Bottom overlay) */}
                {isRecording && (
                    <div className="relative z-10 mt-auto p-6 pb-20 sm:pb-8 w-full">
                        <div className="max-w-md mx-auto relative group">
                            <div className="absolute inset-0 bg-[#00E5A0] rounded-3xl blur-[30px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000"></div>

                            <div className="bg-[#0D0D19]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl relative">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="text-center flex-1">
                                        <div className="text-sm text-white/50 uppercase tracking-wider font-bold mb-1">Duración</div>
                                        <div className="font-outfit font-light text-4xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                                            {formatDuration(durationSecs)}
                                        </div>
                                    </div>
                                    <div className="w-px h-12 bg-white/10 mx-2"></div>
                                    <div className="text-center flex-1">
                                        <div className="text-sm text-white/50 uppercase tracking-wider font-bold mb-1">Distancia</div>
                                        <div className="font-outfit font-light text-4xl text-[#00E5A0] drop-shadow-[0_0_8px_rgba(0,229,160,0.4)]">
                                            {distanceKm.toFixed(2)}<span className="text-lg text-white/40 ml-1">km</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={togglePause}
                                        className={`flex-1 py-4 rounded-2xl font-outfit font-bold text-lg transition-all flex items-center justify-center gap-2 border ${isPaused
                                            ? 'bg-[#00E5A0]/10 border-[#00E5A0]/50 text-[#00E5A0] hover:bg-[#00E5A0]/20'
                                            : 'bg-[#F59E0B]/10 border-[#F59E0B]/50 text-[#F59E0B] hover:bg-[#F59E0B]/20'
                                            }`}
                                    >
                                        {isPaused ? '▶ Reanudar' : '⏸ Pausar'}
                                    </button>

                                    <button
                                        onClick={finishWalk}
                                        disabled={saving}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white border-none py-4 rounded-2xl font-outfit font-bold text-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? 'Guardando...' : '⬛ Finalizar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
