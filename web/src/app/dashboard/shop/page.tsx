'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Product {
    id: string
    title: string
    description: string
    category: 'Food' | 'Toys' | 'Accessories' | 'Health' | 'Other'
    target_species: string
    image_url: string
    affiliate_link: string
    price_estimate: number
}

const CATEGORIES = [
    { id: 'All', label: 'Todos', icon: '🌟' },
    { id: 'Food', label: 'Alimentación', icon: '🍖' },
    { id: 'Toys', label: 'Juguetes', icon: '🎾' },
    { id: 'Accessories', label: 'Accesorios', icon: '🦮' },
    { id: 'Health', label: 'Salud e Higiene', icon: '🛁' },
]

const CATEGORY_EMOJI: Record<string, string> = {
    Food: '🍖', Toys: '🎾', Accessories: '🦮', Health: '💊', Other: '🛒'
}

const SPECIES_LABEL: Record<string, string> = {
    Dog: '🐶 PERROS', Cat: '🐱 GATOS', Any: 'UNIVERSAL', Bird: '🐦 AVES', Rabbit: '🐇 CONEJOS',
}

export default function ShopPage() {
    const supabase = createClient()
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState<string>('All')
    const [userSpecies, setUserSpecies] = useState<string[]>([])
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) router.push('/auth')
            else fetchData()
        })
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: pets } = await supabase.from('pets').select('species').eq('owner_id', user.id)
                if (pets) {
                    setUserSpecies(Array.from(new Set(pets.map(p => p.species))))
                }
            }

            const { data: productsData, error } = await supabase
                .from('affiliate_products')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.warn('Error fetching products:', error.message)
                setProducts([])
            } else {
                setProducts(productsData || [])
            }
        } catch (error) {
            console.error('Unexpected error:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter(p => {
        if (activeCategory !== 'All' && p.category !== activeCategory) return false
        return true
    }).sort((a, b) => {
        const aMatches = userSpecies.includes(a.target_species) || a.target_species === 'Any'
        const bMatches = userSpecies.includes(b.target_species) || b.target_species === 'Any'
        if (aMatches && !bMatches) return -1
        if (!aMatches && bMatches) return 1
        return 0
    })

    return (
        <div className="flex min-h-screen bg-[#07070F]">
            <Sidebar />

            <main className="dashboard-main relative overflow-y-auto text-[#F8F8FF]">
                {/* Premium background */}
                <div className="noise-overlay" />
                <div className="orb w-[600px] h-[600px] -top-40 -right-40 bg-[radial-gradient(circle,rgba(245,158,11,0.06)_0%,transparent_70%)]" />
                <div className="orb w-[400px] h-[400px] bottom-0 -left-20 bg-[radial-gradient(circle,rgba(108,63,245,0.06)_0%,transparent_70%)]" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="mb-10">
                        <Breadcrumbs items={[{ label: 'Tienda' }]} />
                        <h1 className="font-['Outfit',_sans-serif] font-extrabold text-[2.5rem] mb-4">
                            PetNexa <span className="bg-gradient-to-br from-[#F59E0B] to-[#FF6B9D] bg-clip-text text-transparent">Marketplace</span>
                        </h1>
                        <p className="text-[rgba(248,248,255,0.6)] text-[1rem] leading-relaxed max-w-[600px]">
                            Descubre una selección premium de productos, alimentación y juguetes curados por nuestra comunidad.
                        </p>
                    </div>

                    {/* Categories */}
                    <div className="flex gap-3 mb-8 overflow-x-auto pb-2.5 hide-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-5 py-2.5 rounded-full text-[0.9rem] font-semibold flex items-center gap-2 cursor-pointer transition-all duration-200 whitespace-nowrap ${activeCategory === cat.id
                                    ? 'bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.4)] text-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                    : 'bg-[rgba(13,13,25,0.6)] border border-[rgba(108,63,245,0.15)] text-[rgba(248,248,255,0.7)] hover:bg-[rgba(108,63,245,0.05)]'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center gap-3 py-[100px]">
                            <div className="w-10 h-10 border-[3px] border-[rgba(245,158,11,0.2)] border-t-[#F59E0B] rounded-full animate-spin" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-[80px] bg-[rgba(13,13,25,0.4)] rounded-[24px] border border-dashed border-[rgba(108,63,245,0.2)]">
                            <div className="text-[4rem] mb-4">🛒</div>
                            <h3 className="font-['Outfit',_sans-serif] text-[1.3rem] font-bold mb-2.5">Aún no hay productos disponibles</h3>
                            <p className="text-[rgba(248,248,255,0.5)] text-[0.9rem]">Vuelve más tarde para descubrir nuestras recomendaciones.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map((product, index) => {
                                const imgFailed = imgErrors.has(product.id)
                                const categoryEmoji = CATEGORY_EMOJI[product.category] || '🛒'
                                const isBestValue = index === 0
                                return (
                                    <div key={product.id} className="group bg-[rgba(13,13,25,0.85)] backdrop-blur-xl border border-[rgba(108,63,245,0.15)] rounded-[24px] overflow-hidden flex flex-col transition-all duration-300 cursor-pointer hover:-translate-y-[6px] hover:shadow-[0_12px_30px_rgba(0,0,0,0.4),_0_0_20px_rgba(245,158,11,0.12)] hover:border-[rgba(245,158,11,0.3)] relative">

                                        {isBestValue && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white text-[0.7rem] font-bold px-4 py-1 rounded-b-lg shadow-[0_4px_10px_rgba(245,158,11,0.3)] z-20 flex items-center gap-1 uppercase tracking-wider">
                                                <span>⭐</span> Mejor Valor
                                            </div>
                                        )}

                                        {/* Image / Fallback Box */}
                                        <div className="w-full h-[200px] bg-gradient-to-br from-[rgba(18,18,32,0.95)] to-[rgba(13,13,25,0.8)] flex items-center justify-center relative overflow-hidden border-b border-[rgba(108,63,245,0.1)]">
                                            {/* species badge */}
                                            <div className="absolute top-3 right-3 bg-[rgba(7,7,15,0.85)] backdrop-blur-md px-2.5 py-1 rounded-full text-[0.68rem] font-extrabold tracking-wide text-[#F8F8FF] border border-[rgba(248,248,255,0.1)] z-10">
                                                {SPECIES_LABEL[product.target_species] || product.target_species}
                                            </div>

                                            {imgFailed || !product.image_url ? (
                                                <div className="text-center relative z-10">
                                                    <div className="text-[64px] drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                                                        {categoryEmoji}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    className="relative w-[80%] h-[80%] object-contain transition-transform duration-300 group-hover:scale-110 z-10"
                                                    onError={() => setImgErrors(prev => new Set([...prev, product.id]))}
                                                />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-[22px] flex flex-col flex-1">
                                            <div className="flex justify-between items-start gap-3 mb-2.5">
                                                <h3 className="font-['Outfit',_sans-serif] text-[1.05rem] font-extrabold leading-snug text-[#F8F8FF] group-hover:text-[#F59E0B] transition-colors duration-300 line-clamp-2">
                                                    {product.title}
                                                </h3>
                                                {product.price_estimate && (
                                                    <div className="text-[1.15rem] font-extrabold text-[#F59E0B] flex-shrink-0">
                                                        {product.price_estimate}€
                                                    </div>
                                                )}
                                            </div>

                                            <p className="text-[rgba(248,248,255,0.6)] text-[0.83rem] leading-relaxed mb-5 flex-1 line-clamp-3">
                                                {product.description}
                                            </p>

                                            <a
                                                href={product.affiliate_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full p-[13px] rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] text-white no-underline font-bold text-[0.9rem] shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                                            >
                                                Ver Oferta <span className="text-[1rem] transition-transform duration-200 group-hover:translate-x-1">→</span>
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
