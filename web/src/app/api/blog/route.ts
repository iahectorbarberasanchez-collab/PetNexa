import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        + '-' + Date.now()
}

function estimateReadTime(content: string): number {
    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    return Math.max(1, Math.ceil(words / wordsPerMinute))
}

export async function POST(req: NextRequest) {
    // Validate API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.BLOG_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const {
            title,
            content,
            excerpt,
            cover_image_url,
            author = 'PetNexa Team',
            category = 'Consejos',
            tags = [],
            slug: customSlug,
            published = true,
        } = body

        if (!title || !content) {
            return NextResponse.json(
                { error: 'title and content are required' },
                { status: 400 }
            )
        }

        const slug = customSlug || generateSlug(title)
        const read_time_minutes = estimateReadTime(content)

        const { data, error } = await supabaseAdmin
            .from('blog_posts')
            .insert({
                title,
                slug,
                content,
                excerpt: excerpt || null,
                cover_image_url: cover_image_url || null,
                author,
                category,
                tags,
                read_time_minutes,
                published,
            })
            .select()
            .single()

        if (error) {
            console.error('[Blog API] Supabase error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            post: {
                id: data.id,
                slug: data.slug,
                url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://petnexa.com'}/blog/${data.slug}`,
            },
        }, { status: 201 })

    } catch (err) {
        console.error('[Blog API] Error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET - List recent posts (public)
export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const category = url.searchParams.get('category')

    let query = supabaseAdmin
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, author, category, tags, read_time_minutes, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts: data || [] })
}
