'use client'

interface Tab {
  id: string
  label: string
}

const tabs: Tab[] = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'pricing', label: 'Pricing & Inventory' },
  { id: 'variants', label: 'Variants' },
  { id: 'media', label: 'Media' },
  { id: 'fragrance', label: 'Fragrance Details' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'seo', label: 'SEO' },
  { id: 'publishing', label: 'Publishing' },
  { id: 'advanced', label: 'Advanced' },
]

interface ProductEditTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function ProductEditTabs({ activeTab, onTabChange }: ProductEditTabsProps) {
  const scrollToSection = (tabId: string) => {
    onTabChange(tabId)
    
    // Use setTimeout to ensure state updates before scrolling
    setTimeout(() => {
      const element = document.getElementById(`section-${tabId}`)
      if (element) {
        const yOffset = -120 // Offset for sticky header
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
        
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        })
      }
    }, 0)
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 mb-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => scrollToSection(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-luxury-gold text-luxury-gold bg-luxury-gold/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
