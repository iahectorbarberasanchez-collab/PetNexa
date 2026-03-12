'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Breadcrumbs from '@/components/Breadcrumbs'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Place {
    id: string
    name: string
    type: PlaceType
    address: string
    rating?: number
    lat: number
    lng: number
    isOpen?: boolean
}

type PlaceType = 'vet' | 'park' | 'shop' | 'grooming' | 'shelter'

const createSvgElement = (color: string, path: string) => {
    // We create a standard HTML element to be used with AdvancedMarkerElement
    const div = document.createElement('div')
    div.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
            <circle cx="12" cy="12" r="11" fill="#131325" stroke="${color}" stroke-width="2" />
            <path d="${path}" fill="${color}" transform="scale(0.6) translate(8, 8)"/>
        </svg>
    `
    return div.firstElementChild as HTMLElement
}

const ICONS = {
    vet: "M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2zm-1 8h-2v2h-2v-2H7v-2h2v-2h2v2h2v2z",
    park: "M16 13h-3V8.5c0-.83-.67-1.5-1.5-1.5S10 7.67 10 8.5V13H7l5 7 4-7zM5 21h14v2H5z",
    shop: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
    grooming: "M17 3H7c-1.1 0-1.99.9-1.99 2v14c0 1.1.89 2 1.99 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7V5h10v14zM8.5 15c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z",
    shelter: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
}

const PLACE_CONFIG: Record<PlaceType, { label: string; icon: string; color: string; types: string[]; getIconElement: () => HTMLElement }> = {
    vet: { label: 'Veterinarias', icon: '🏥', color: '#00D4FF', types: ['veterinary_care'], getIconElement: () => createSvgElement('#00D4FF', ICONS.vet) },
    park: { label: 'Pipican', icon: '🌳', color: '#00E5A0', types: ['park', 'dog_park'], getIconElement: () => createSvgElement('#00E5A0', ICONS.park) },
    shop: { label: 'Tiendas', icon: '🛒', color: '#F59E0B', types: ['pet_store'], getIconElement: () => createSvgElement('#F59E0B', ICONS.shop) },
    grooming: { label: 'Peluquerías', icon: '✂️', color: '#FF6B9D', types: ['dog_boarding', 'dog_groomer'], getIconElement: () => createSvgElement('#FF6B9D', "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z") },
    shelter: { label: 'Refugios', icon: '🏠', color: '#A78BFA', types: ['animal_shelter'], getIconElement: () => createSvgElement('#A78BFA', ICONS.shelter) },
}

// Dark map styles (without mapId to avoid conflict)
const DARK_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#0f0f1a' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f1a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0a2a1a' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1c2e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#131325' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c2c40' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030d1a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
]

declare global {
    interface Window {
        google: typeof google
        initPetNexaMap: () => void
    }
}

export default function MapPage() {
    const supabase = createClient()
    const router = useRouter()
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const markersRef = useRef<(google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]>([])

    const [authLoading, setAuthLoading] = useState(true)
    const [mapReady, setMapReady] = useState(false)
    const [activeFilter, setActiveFilter] = useState<PlaceType | null>(null)
    const [places, setPlaces] = useState<Place[]>([])
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
    const [userPos, setUserPos] = useState<{ lat: number; lng: number }>({ lat: 41.3851, lng: 2.1734 })
    const [searching, setSearching] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [locError, setLocError] = useState<string | null>(null)
    const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

    // ── Auth ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) router.push('/auth')
            else setAuthLoading(false)
        })
    }, [])

    // ── Load Maps script ────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return
        if (window.google?.maps) { setMapReady(true); return }
        if (document.getElementById('gmap-script')) return

        window.initPetNexaMap = () => setMapReady(true)

        const script = document.createElement('script')
        script.id = 'gmap-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,geometry,marker&callback=initPetNexaMap&loading=async`
        script.async = true
        script.defer = true
        document.head.appendChild(script)
    }, [authLoading])

    // ── Init map ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapReady || !mapRef.current) return

        const map = new window.google.maps.Map(mapRef.current, {
            center: userPos,
            zoom: 14,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: DARK_STYLES,
            mapId: 'PETNEXA_MAP_ID', // Requerido para Advanced Markers
        })
        mapInstanceRef.current = map

        // Geoloc
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const ul = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    setUserPos(ul)
                    map.setCenter(ul)
                    // Create a user location marker
                    const userMarkerDiv = document.createElement('div');
                    userMarkerDiv.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" style="filter: drop-shadow(0px 0px 8px rgba(108,63,245,0.8));">
                            <circle cx="12" cy="12" r="10" fill="#6C3FF5" stroke="white" stroke-width="2"/>
                            <circle cx="12" cy="12" r="4" fill="white"/>
                        </svg>
                    `;

                    if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                        new window.google.maps.marker.AdvancedMarkerElement({
                            map,
                            position: ul,
                            content: userMarkerDiv.firstElementChild as HTMLElement,
                            title: 'Tu ubicación',
                            zIndex: 999,
                        })
                    } else {
                        // Fallback as standard marker just in case
                        new window.google.maps.Marker({
                            map,
                            position: ul,
                            icon: {
                                url: encodeURI(`data:image/svg+xml;utf-8,
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
                                        <circle cx="12" cy="12" r="10" fill="#6C3FF5" stroke="white" stroke-width="2"/>
                                        <circle cx="12" cy="12" r="4" fill="white"/>
                                    </svg>
                                `),
                                scaledSize: new window.google.maps.Size(32, 32),
                                anchor: new window.google.maps.Point(16, 16),
                            },
                        })
                    }
                },
                () => setLocError('No se pudo obtener tu ubicación. Mostrando Barcelona.')
            )
        }
    }, [mapReady])

    // ── Search nearby ───────────────────────────────────────────────────────────
    const clearMarkers = () => {
        markersRef.current.forEach(m => {
            if ('setMap' in m) {
                m.setMap(null)
            } else {
                m.map = null
            }
        })
        markersRef.current = []
    }

    const searchPlaces = (type: PlaceType) => {
        const map = mapInstanceRef.current
        if (!map) return

        if (activeFilter === type) {
            setActiveFilter(null); clearMarkers(); setPlaces([]); setSelectedPlace(null); return
        }

        setActiveFilter(type); setSearching(true); setPlaces([]); setSelectedPlace(null); clearMarkers()

        const center = userPos
        const service = new window.google.maps.places.PlacesService(map)
        const cfg = PLACE_CONFIG[type]

        // Use text search for better compat with all project types
        service.textSearch(
            {
                query: cfg.label + ' mascotas',
                location: new window.google.maps.LatLng(center.lat, center.lng),
                radius: 5000,
                type: cfg.types[0] as string,
            },
            (
                results: google.maps.places.PlaceResult[] | null,
                status: google.maps.places.PlacesServiceStatus
            ) => {
                setSearching(false)
                if (
                    status !== window.google.maps.places.PlacesServiceStatus.OK &&
                    status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
                ) {
                    // Fallback: try nearbySearch
                    service.nearbySearch(
                        {
                            location: new window.google.maps.LatLng(center.lat, center.lng),
                            radius: 5000,
                            type: cfg.types[0] as string,
                        },
                        handleResults
                    )
                    return
                }
                handleResults(results, status)
            }
        )

        const handleResults = (
            results: google.maps.places.PlaceResult[] | null,
            status: google.maps.places.PlacesServiceStatus
        ) => {
            if (
                (status !== window.google.maps.places.PlacesServiceStatus.OK &&
                    status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) ||
                !results
            ) {
                setSearching(false)
                return
            }

            const found: Place[] = []
            results.slice(0, 20).forEach((r: google.maps.places.PlaceResult) => {
                if (!r.geometry?.location) return
                const lat = r.geometry.location.lat()
                const lng = r.geometry.location.lng()

                const place: Place = {
                    id: r.place_id || Math.random().toString(),
                    name: r.name || 'Sin nombre',
                    type,
                    address: r.vicinity || r.formatted_address || '',
                    rating: r.rating,
                    lat, lng,
                    isOpen: typeof r.opening_hours?.isOpen === 'function' ? r.opening_hours.isOpen() : undefined,
                }
                found.push(place)

                // Marker using AdvancedMarkerElement
                let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement

                if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                    marker = new window.google.maps.marker.AdvancedMarkerElement({
                        map,
                        position: { lat, lng },
                        title: place.name,
                        content: cfg.getIconElement(),
                    })

                    marker.addListener('click', () => {
                        setSelectedPlace(place)
                        map.panTo({ lat, lng })
                    })
                } else {
                    // Fallback to legacy marker if advanced is not available
                    marker = new window.google.maps.Marker({
                        map,
                        position: { lat, lng },
                        title: place.name,
                    })
                    marker.addListener('click', () => {
                        setSelectedPlace(place)
                        map.panTo({ lat, lng })
                    })
                }

                markersRef.current.push(marker)
            })

            setPlaces(found)
            setSearching(false)

            // Fit bounds
            if (found.length > 0) {
                const bounds = new window.google.maps.LatLngBounds()
                found.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
                bounds.extend(userPos)
                map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 })
            }
        }
    }

    const handleGeneralSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return

        const map = mapInstanceRef.current
        if (!map) return

        setActiveFilter(null)
        setSearching(true)
        setPlaces([])
        setSelectedPlace(null)
        clearMarkers()

        const center = userPos
        const service = new window.google.maps.places.PlacesService(map)

        service.textSearch(
            {
                query: searchQuery,
                location: new window.google.maps.LatLng(center.lat, center.lng),
                radius: 5000,
            },
            (
                results: google.maps.places.PlaceResult[] | null,
                status: google.maps.places.PlacesServiceStatus
            ) => {
                setSearching(false)
                if (
                    status !== window.google.maps.places.PlacesServiceStatus.OK &&
                    status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
                ) {
                    return
                }

                if (!results) return

                const found: Place[] = []
                results.slice(0, 20).forEach((r: google.maps.places.PlaceResult) => {
                    if (!r.geometry?.location) return
                    const lat = r.geometry.location.lat()
                    const lng = r.geometry.location.lng()

                    const place: Place = {
                        id: r.place_id || Math.random().toString(),
                        name: r.name || 'Sin nombre',
                        type: 'vet', // Fallback type ya que no podemos asignar string genérico a PlaceType
                        address: r.formatted_address || r.vicinity || '',
                        rating: r.rating,
                        lat, lng,
                        isOpen: typeof r.opening_hours?.isOpen === 'function' ? r.opening_hours.isOpen() : undefined,
                    }
                    found.push(place)

                    let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement
                    if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                        const iconDiv = document.createElement('div')
                        iconDiv.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
                                <circle cx="12" cy="12" r="11" fill="#131325" stroke="#F8F8FF" stroke-width="2" />
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#F8F8FF" transform="scale(0.6) translate(8, 8)"/>
                            </svg>
                        `
                        marker = new window.google.maps.marker.AdvancedMarkerElement({
                            map,
                            position: { lat, lng },
                            title: place.name,
                            content: iconDiv.firstElementChild as HTMLElement,
                        })
                        marker.addListener('click', () => {
                            setSelectedPlace(place)
                            map.panTo({ lat, lng })
                        })
                    } else {
                        marker = new window.google.maps.Marker({
                            map,
                            position: { lat, lng },
                            title: place.name,
                        })
                        marker.addListener('click', () => {
                            setSelectedPlace(place)
                            map.panTo({ lat, lng })
                        })
                    }
                    markersRef.current.push(marker)
                })

                setPlaces(found)

                if (found.length > 0) {
                    const bounds = new window.google.maps.LatLngBounds()
                    found.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
                    bounds.extend(userPos)
                    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 })
                }
            }
        )
    }

    // ── Loading auth ───────────────────────────────────────────────────────────
    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#07070F]">
            <div className="text-center">
                <div className="text-[52px] mb-4">🗺️</div>
                <p className="text-[rgba(248,248,255,0.6)] font-['Outfit',_sans-serif]">Cargando mapa...</p>
            </div>
        </div>
    )

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex min-h-screen bg-[#07070F]">
            <Sidebar />

            <main className="dashboard-main flex flex-col h-screen overflow-hidden w-full">

                {/* Top bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="[&>nav]:mb-2"><Breadcrumbs items={[{ label: 'Mapa' }]} /></div>
                            <h1 className="font-['Outfit',_sans-serif] text-[1.3rem] font-extrabold mb-0.5 mt-0">Mapa 🗺️</h1>
                            <p className={`text-[0.76rem] m-0 ${locError ? 'text-[#F59E0B]' : 'text-[rgba(248,248,255,0.5)]'}`}>
                                {locError || 'Explora lugares pet-friendly cerca de ti'}
                            </p>
                        </div>
                        
                        <form onSubmit={handleGeneralSearch} className="relative w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Buscar en el mapa..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-[rgba(13,13,25,0.8)] border border-[rgba(108,63,245,0.3)] rounded-full py-2 pr-4 pl-9 text-[#F8F8FF] font-['Outfit',_sans-serif] text-[0.8rem] outline-none w-full sm:w-[200px] transition-all duration-200 focus:border-[#6C3FF5]"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 text-[0.9rem]">🔍</span>
                            <button type="submit" className="hidden">Buscar</button>
                        </form>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-none">
                        {(Object.entries(PLACE_CONFIG) as [PlaceType, typeof PLACE_CONFIG[PlaceType]][]).map(([key, cfg]) => (
                            <button key={key} onClick={() => searchPlaces(key)}
                                className={`px-[14px] py-[7px] rounded-full cursor-pointer transition-all duration-200 border-[1.5px] font-['Outfit',_sans-serif] font-bold text-[0.78rem] flex items-center gap-[5px] whitespace-nowrap`}
                                style={{
                                    border: `1.5px solid ${activeFilter === key ? cfg.color : 'rgba(108,63,245,0.18)'}`,
                                    background: activeFilter === key ? `${cfg.color}18` : 'rgba(13,13,25,0.8)',
                                    color: activeFilter === key ? cfg.color : 'rgba(248,248,255,0.6)',
                                    boxShadow: activeFilter === key ? `0 0 12px ${cfg.color}30` : 'none',
                                }}>
                                <span>{cfg.icon}</span> {cfg.label}
                            </button>
                        ))}
                    </div>

                {/* Map + panel */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

                    {/* Map */}
                    <div className="flex-1 relative">
                        <div ref={mapRef} className="w-full h-full" />

                        {!mapReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#07070F]">
                                <div className="text-center">
                                    <div className="text-5xl mb-3">🗺️</div>
                                    <p className="text-[rgba(248,248,255,0.6)] font-['Outfit',_sans-serif]">Cargando Google Maps...</p>
                                </div>
                            </div>
                        )}

                        {searching && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[rgba(13,13,25,0.95)] border border-[rgba(108,63,245,0.3)] rounded-full py-2.5 px-5 flex items-center gap-2 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                                <div className="w-2 h-2 rounded-full bg-[#6C3FF5] animate-[pulse_1s_infinite]" />
                                <span className="font-['Outfit',_sans-serif] font-bold text-[0.82rem] text-[#A78BFA]">Buscando...</span>
                            </div>
                        )}

                        {mapReady && !activeFilter && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(13,13,25,0.95)] border border-[rgba(108,63,245,0.2)] rounded-[14px] py-3 px-[22px] backdrop-blur-md">
                                <span className="font-['Outfit',_sans-serif] text-[0.83rem] text-[rgba(248,248,255,0.6)]">
                                    👆 Selecciona un filtro para ver lugares pet-friendly
                                </span>
                            </div>
                        )}

                        {mapReady && activeFilter && !searching && places.length === 0 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(13,13,25,0.95)] border border-[rgba(245,158,11,0.2)] rounded-[14px] py-3 px-[22px] backdrop-blur-md">
                                <span className="font-['Outfit',_sans-serif] text-[0.83rem] text-[#F59E0B]">
                                    😕 No se encontraron {PLACE_CONFIG[activeFilter].label.toLowerCase()} en esta zona
                                </span>
                            </div>
                        )}

                        {mapReady && (
                            <button
                                onClick={() => {
                                    if (mapInstanceRef.current && userPos) {
                                        mapInstanceRef.current.panTo(userPos)
                                        mapInstanceRef.current.setZoom(14)
                                    }
                                }}
                                className="absolute bottom-6 right-6 w-11 h-11 rounded-full bg-[#131325] border border-[rgba(108,63,245,0.4)] flex items-center justify-center cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-[#6C3FF5] text-[1.2rem] transition-all duration-200 hover:bg-[#6C3FF5] hover:text-white"
                                title="Gps a mi ubicación"
                            >
                                📍
                            </button>
                        )}
                    </div>

                    {/* Results panel */}
                    {places.length > 0 && (
                        <div className="lg:w-[320px] w-full lg:h-full h-[40vh] bg-[rgba(7,7,15,0.97)] border-l lg:border-l border-t lg:border-t-0 border-[rgba(108,63,245,0.12)] overflow-y-auto p-5 shrink-0 z-20">
                            <div className="mb-4 pb-3 border-b border-[rgba(108,63,245,0.1)]">
                                <h3 className="font-['Outfit',_sans-serif] font-bold text-[0.95rem] flex items-center gap-2 m-0"
                                    style={{ color: activeFilter ? PLACE_CONFIG[activeFilter].color : '#F8F8FF' }}>
                                    <span>{activeFilter ? PLACE_CONFIG[activeFilter].icon : '📌'}</span>
                                    {places.length} {activeFilter ? PLACE_CONFIG[activeFilter].label : 'Resultados encontrados'}
                                </h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                {places.map(place => {
                                    const isSelected = selectedPlace?.id === place.id
                                    const color = activeFilter ? PLACE_CONFIG[activeFilter].color : '#6C3FF5'
                                    return (
                                        <div key={place.id}
                                            onClick={() => {
                                                setSelectedPlace(place)
                                                mapInstanceRef.current?.panTo({ lat: place.lat, lng: place.lng })
                                                mapInstanceRef.current?.setZoom(16)
                                            }}
                                            className="group rounded-[16px] p-4 cursor-pointer transition-all duration-200"
                                            style={{
                                                background: isSelected ? `${color}15` : 'rgba(13,13,25,0.8)',
                                                border: `1px solid ${isSelected ? color + '50' : 'rgba(108,63,245,0.15)'}`,
                                                boxShadow: isSelected ? `0 4px 20px ${color}15` : '0 2px 8px rgba(0,0,0,0.2)',
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = 'rgba(108,63,245,0.4)'
                                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = 'rgba(108,63,245,0.15)'
                                                    e.currentTarget.style.transform = 'none'
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="font-['Outfit',_sans-serif] font-bold text-[0.9rem] text-[#F8F8FF] flex-1 leading-snug">
                                                    {place.name}
                                                </div>
                                                {place.isOpen !== undefined && (
                                                    <div className={`px-2 py-1 rounded-full shrink-0 border ${place.isOpen ? 'bg-[rgba(0,229,160,0.1)] border-[rgba(0,229,160,0.2)]' : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]'}`}>
                                                        <span className={`text-[0.65rem] font-bold ${place.isOpen ? 'text-[#00E5A0]' : 'text-[#EF4444]'}`}>
                                                            {place.isOpen ? 'ABIERTO' : 'CERRADO'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {place.address && (
                                                <div className="flex gap-1.5 items-start mb-3">
                                                    <span className="opacity-60 text-[0.8rem] mt-[1px]">📍</span>
                                                    <span className="text-[0.75rem] text-[rgba(248,248,255,0.6)] leading-relaxed">
                                                        {place.address}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center border-t border-[rgba(248,248,255,0.05)] pt-2.5 mt-auto">
                                                {place.rating ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[#F59E0B] text-[0.8rem]">★</span>
                                                        <span className="text-[0.8rem] font-bold text-[#F8F8FF]">{place.rating.toFixed(1)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[0.7rem] text-[rgba(248,248,255,0.5)] italic">Sin valoraciones</span>
                                                )}

                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="text-[0.75rem] font-bold ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-200 no-underline"
                                                    style={{ color: color, background: `${color}10`, border: `1px solid ${color}20` }}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${color}20`}
                                                    onMouseLeave={e => e.currentTarget.style.background = `${color}10`}
                                                >
                                                    Cómo llegar <span className="text-[0.8rem]">↗</span>
                                                </a>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
