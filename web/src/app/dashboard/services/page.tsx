import { Metadata } from 'next'
import ServicesClient from './ServicesClient'
import { JsonLd } from '@/components/JsonLd'

export const metadata: Metadata = {
    title: 'Servicios para Mascotas | PetNexa',
    description: 'Encuentra los mejores paseadores, cuidadores y adiestradores para tu mascota. Profesionales verificados cerca de ti.',
    keywords: ['paseador de perros', 'cuidador de gatos', 'adiestramiento canino', 'peluquería mascotas', 'veterinario cerca de mi'],
}

export default function ServicesPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Servicios para Mascotas en PetNexa',
        'description': 'Directorio de profesionales verificados para el cuidado de mascotas.',
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': 1,
                'name': 'Paseadores de Perros'
            },
            {
                '@type': 'ListItem',
                'position': 2,
                'name': 'Cuidadores de Mascotas'
            },
            {
                '@type': 'ListItem',
                'position': 3,
                'name': 'Adiestradores Caninos'
            },
            {
                '@type': 'ListItem',
                'position': 4,
                'name': 'Peluquería Canina'
            },
            {
                '@type': 'ListItem',
                'position': 5,
                'name': 'Veterinarios'
            }
        ]
    }

    return (
        <>
            <JsonLd data={jsonLd} />
            <ServicesClient />
        </>
    )
}
