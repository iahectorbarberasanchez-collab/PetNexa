import { NextRequest, NextResponse } from 'next/server'

// Gemini API setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// gemini-2.5-flash is confirmed working with this key (2.0-flash returns 404 for new users)
const GEMINI_MODEL = 'gemini-2.5-flash'

// Calculate age from birth date string
function calculateAge(birthDateString: string): string {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age <= 0) {
        // Calculate months if less than 1 year
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0) {
            months += 12;
            age--;
        }
        if (today.getDate() < birthDate.getDate()) {
            months--;
        }
        return `${Math.max(0, months)} meses`;
    }

    return `${age} años`;
}

export async function POST(req: NextRequest) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    try {
        const { petContext } = await req.json()

        if (!petContext) {
            return NextResponse.json({ error: 'Falta petContext en la solicitud' }, { status: 400 })
        }

        // Build a highly specific context string for the tip
        let petDetails = `${petContext.name}, que es un ${petContext.species || 'mascota'}`
        if (petContext.breed) petDetails += ` de raza ${petContext.breed}`
        if (petContext.birth_date) {
            const ageStr = calculateAge(petContext.birth_date);
            if (ageStr) petDetails += ` de ${ageStr} de edad`
        }
        const weight = petContext.weight_kg || petContext.weight;
        if (weight) petDetails += `, pesa ${weight}kg`

        const systemPrompt = `Eres el asistente experto veterinario de PetNexa. 
Tu única tarea ahora es generar UN (1) solo consejo proactivo (Proactive Tip) para la mascota del usuario basada ESTRICTAMENTE en su perfil: ${petDetails}.

REGLAS:
1. El consejo debe ser MUY BREVE (máximo 2 oraciones, menos de 30 palabras si es posible).
2. Debe ser directamente relevante a su raza, edad, peso, o condiciones si las tiene.
3. El tono debe ser cálido, profesional y amigable.
4. NO uses comillas en la respuesta, solo texto plano con un emoji opcional al principio.
5. NO saludes, ve directo al consejo.`

        const body = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nGenera ahora el consejo breve.` }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
            }
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorText = errorData ? JSON.stringify(errorData) : await response.text();
            console.error('Gemini API Error Detail:', errorText);

            return NextResponse.json({
                error: 'Error calling Gemini API',
                details: errorData || errorText
            }, { status: 500 });
        }

        const data = await response.json()

        const tipText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!tipText) {
            return NextResponse.json({ error: 'No tip generated' }, { status: 500 })
        }

        return NextResponse.json({ tip: tipText })

    } catch (error) {
        console.error('PetBot Tip Tip error:', error)
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        )
    }
}
