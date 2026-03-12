import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// gemini-2.5-flash is confirmed working with this key
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `Eres PetBot, el asistente veterinario virtual de PetNexa. Eres amable, empático y experto en salud y bienestar animal.

REGLAS:
- Responde SIEMPRE en español.
- Sé conciso pero completo (máximo 3-4 párrafos por respuesta).
- Si el usuario pregunta por síntomas graves o emergencias, SIEMPRE recomienda ir al veterinario de inmediato.
- No diagnostiques enfermedades con certeza, solo orienta y sugiere posibles causas.
- Puedes dar consejos sobre alimentación, comportamiento, higiene, vacunas, razas, entrenamiento y cuidados generales.
- Usa emojis ocasionalmente para hacer la conversación más amena 🐾
- Si no sabes algo con certeza, sé honesto y di que lo mejor es consultar un veterinario.
- Trata a las mascotas por su nombre si el usuario lo menciona.

Recuerda: eres el mejor amigo peludo de los dueños de mascotas. ¡Sé cálido y profesional!`

export async function POST(req: NextRequest) {
    try {
        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY no configurada en el servidor.' },
                { status: 500 }
            )
        }

        const { messages, petContext } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'messages es requerido' }, { status: 400 })
        }

        // Calculate age from birth_date if available
        let ageStr = ''
        if (petContext?.birth_date) {
            const birthDate = new Date(petContext.birth_date)
            const today = new Date()
            let age = today.getFullYear() - birthDate.getFullYear()
            const m = today.getMonth() - birthDate.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--
            }
            ageStr = age === 0 ? 'Menos de 1 año' : `${age} años`
        }

        let contextPrompt = SYSTEM_PROMPT
        if (petContext) {
            contextPrompt += `\n\nCONTEXTO DE LA MASCOTA DEL USUARIO:\n`
            if (petContext.name) contextPrompt += `- Nombre: ${petContext.name}\n`
            if (petContext.species) contextPrompt += `- Especie: ${petContext.species}\n`
            if (petContext.breed) contextPrompt += `- Raza: ${petContext.breed}\n`
            if (ageStr) contextPrompt += `- Edad aproximada: ${ageStr}\n`
            if (petContext.weight_kg) contextPrompt += `- Peso: ${petContext.weight_kg} kg\n`
            contextPrompt += `\nUtiliza esta información para dar respuestas personalizadas y relevantes.`
        }

        // Build Gemini conversation history
        const contents = messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }))

        const body = {
            system_instruction: {
                parts: [{ text: contextPrompt }]
            },
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        }

        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('Gemini error:', errText)
            return NextResponse.json({ error: 'Error al contactar con la IA.' }, { status: 502 })
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no pude generar una respuesta.'

        return NextResponse.json({ text })
    } catch (err) {
        console.error('PetBot API error:', err)
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
    }
}
