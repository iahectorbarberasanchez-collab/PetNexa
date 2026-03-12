import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// gemini-2.5-flash is confirmed working with this key
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

// Map Spanish species names → DB English keys
const SPECIES_MAP: Record<string, string> = {
    'perro': 'Dog', 'can': 'Dog', 'dog': 'Dog',
    'gato': 'Cat', 'felino': 'Cat', 'cat': 'Cat',
    'pájaro': 'Bird', 'pajaro': 'Bird', 'ave': 'Bird', 'bird': 'Bird',
    'pez': 'Fish', 'fish': 'Fish',
    'conejo': 'Rabbit', 'rabbit': 'Rabbit',
    'hámster': 'Hamster', 'hamster': 'Hamster',
    'reptil': 'Reptile', 'lagarto': 'Reptile', 'reptile': 'Reptile',
}

function mapSpecies(raw: string): string {
    const normalized = raw.toLowerCase().trim()
    for (const [key, val] of Object.entries(SPECIES_MAP)) {
        if (normalized.includes(key)) return val
    }
    return 'Other'
}

export async function POST(req: NextRequest) {
    try {
        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY no configurada.' },
                { status: 500 }
            )
        }

        const { imageBase64, mimeType } = await req.json()

        if (!imageBase64) {
            return NextResponse.json({ error: 'imageBase64 es requerido' }, { status: 400 })
        }

        const body = {
            contents: [{
                parts: [
                    {
                        text: `Eres un experto en identificación de razas de animales domésticos.
Analiza esta imagen y responde ÚNICAMENTE con JSON válido (sin markdown, sin texto adicional):
{
  "species": "Especie en español (ej: Perro, Gato, Conejo, Ave, Pez, Hámster, Reptil, Otro)",
  "breed": "Raza identificada o 'Mestizo/a' si no se puede determinar con certeza",
  "confidence": "Alta",
  "characteristics": ["característica 1", "característica 2", "característica 3"],
  "tips": "1-2 frases de consejo específico para esta raza/especie"
}
Si no hay ningún animal visible en la imagen, responde ÚNICAMENTE: {"error": "No se detectó ningún animal en la imagen."}`
                    },
                    {
                        inline_data: {
                            mime_type: mimeType || 'image/jpeg',
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 600
            }
        }

        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('Gemini Vision error:', errText)
            return NextResponse.json({ error: 'Error al analizar la imagen.' }, { status: 502 })
        }

        const data = await res.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        try {
            const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const parsed = JSON.parse(cleaned)

            // Add the English key for frontend auto-select
            if (parsed.species && !parsed.error) {
                parsed.speciesKey = mapSpecies(parsed.species)
            }

            return NextResponse.json(parsed)
        } catch {
            return NextResponse.json({ breed: rawText, confidence: 'Media', characteristics: [], tips: '' })
        }
    } catch (err) {
        console.error('Breed detector error:', err)
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
    }
}
