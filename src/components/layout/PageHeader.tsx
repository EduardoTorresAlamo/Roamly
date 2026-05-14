import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
}

export default function PageHeader({ title, subtitle, backTo, backLabel = 'Back' }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium mb-3 hover:opacity-80 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </Link>
      )}
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
