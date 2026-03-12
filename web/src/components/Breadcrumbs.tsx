import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-[rgba(248,248,255,0.6)]">
                <li>
                    <Link href="/dashboard" className="hover:text-[#F8F8FF] transition-colors flex items-center">
                        <Home className="w-4 h-4" />
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index} className="flex items-center space-x-2">
                        <ChevronRight className="w-4 h-4 text-[rgba(248,248,255,0.3)]" />
                        {item.href ? (
                            <Link href={item.href} className="hover:text-[#F8F8FF] transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-[#F8F8FF] font-medium pointer-events-none">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    )
}
