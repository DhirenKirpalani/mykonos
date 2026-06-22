'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import Link from 'next/link'

const PAGE_LABELS: Record<string, string> = {
  about: 'About Us',
  shipping: 'Shipping Policy',
  returns: 'Refund Policy',
  faqs: 'Help Center / FAQs',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
}

export default function PageContentEditor() {
  const params = useParams()
  const router = useRouter()
  const pageKey = params.page as string

  const [locale, setLocale] = useState<'en' | 'id'>('en')
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchContent = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/cms/page-content/${pageKey}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const json = await res.json()
      if (json.success) {
        setContent(json.data?.[locale]?.content || getDefaultContent(pageKey))
      }
    } catch {
      setContent(getDefaultContent(pageKey))
    } finally {
      setLoading(false)
    }
  }, [pageKey, locale])

  useEffect(() => { fetchContent() }, [fetchContent])

  const save = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      }

      // Save current locale
      const res = await fetch(`/api/cms/page-content/${pageKey}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ locale, content }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error('Failed to save', { description: json.error })
        return
      }

      // For About page: sync banner images to the other locale too
      if (pageKey === 'about' && (content?.hero_desktop_image || content?.hero_mobile_image)) {
        const otherLocale = locale === 'en' ? 'id' : 'en'
        const otherRes = await fetch(`/api/cms/page-content/${pageKey}?locale=${otherLocale}`)
        const otherJson = await otherRes.json()
        const otherContent = otherJson.content?.[otherLocale] || {}
        const merged = {
          ...otherContent,
          hero_desktop_image: content.hero_desktop_image,
          hero_mobile_image: content.hero_mobile_image,
        }
        await fetch(`/api/cms/page-content/${pageKey}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ locale: otherLocale, content: merged }),
        })
      }

      toast.success('Content saved successfully')
    } catch (e: any) {
      toast.error('Failed to save', { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cms/page-content">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-luxury-navy">{PAGE_LABELS[pageKey] || pageKey}</h1>
            <p className="text-sm text-gray-500">Edit page copywriting</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-luxury-navy hover:bg-luxury-navy/90 text-white">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div>
        <div className="flex gap-2 mb-4">
          {(['en', 'id'] as const).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                locale === loc
                  ? 'bg-luxury-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {loc === 'en' ? 'English' : 'Indonesian'}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {pageKey === 'about' && content && (
            <AboutEditor content={content} onChange={setContent} />
          )}
          {pageKey === 'faqs' && content && (
            <FAQsEditor content={content} onChange={setContent} />
          )}
          {['shipping', 'returns', 'terms', 'privacy'].includes(pageKey) && content && (
            <PolicyEditor content={content} onChange={setContent} showIntro={pageKey === 'privacy'} showConsent={pageKey === 'privacy'} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── About Us Editor ──────────────────────────────────────────────────────────

function AboutEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...content, [key]: value })
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)

  const uploadBannerImage = async (file: File, field: 'hero_desktop_image' | 'hero_mobile_image') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    const setter = field === 'hero_desktop_image' ? setUploadingDesktop : setUploadingMobile
    setter(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `about-banner-${field === 'hero_desktop_image' ? 'desktop' : 'mobile'}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('hero-media')
        .upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('hero-media').getPublicUrl(fileName)
      update(field, publicUrl)
      toast.success('Image uploaded successfully')
    } catch (e: any) {
      toast.error('Upload failed', { description: e.message })
    } finally {
      setter(false)
    }
  }

  const updateSection = (index: number, field: string, value: any) => {
    const sections = [...(content.sections || [])]
    sections[index] = { ...sections[index], [field]: value }
    update('sections', sections)
  }

  const updateParagraph = (sectionIndex: number, paraIndex: number, value: string) => {
    const sections = [...(content.sections || [])]
    const paras = [...(sections[sectionIndex].paragraphs || [])]
    paras[paraIndex] = value
    sections[sectionIndex] = { ...sections[sectionIndex], paragraphs: paras }
    update('sections', sections)
  }

  const addParagraph = (sectionIndex: number) => {
    const sections = [...(content.sections || [])]
    sections[sectionIndex] = {
      ...sections[sectionIndex],
      paragraphs: [...(sections[sectionIndex].paragraphs || []), ''],
    }
    update('sections', sections)
  }

  const removeParagraph = (sectionIndex: number, paraIndex: number) => {
    const sections = [...(content.sections || [])]
    const paras = sections[sectionIndex].paragraphs.filter((_: any, i: number) => i !== paraIndex)
    sections[sectionIndex] = { ...sections[sectionIndex], paragraphs: paras }
    update('sections', sections)
  }

  const addSection = () => {
    const sections = [...(content.sections || []), { number: String((content.sections?.length || 0) + 1).padStart(2, '0'), title: '', paragraphs: [''] }]
    update('sections', sections)
  }

  const removeSection = (index: number) => {
    update('sections', content.sections.filter((_: any, i: number) => i !== index))
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-luxury-navy">Hero Banner Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Desktop */}
          <div className="space-y-2">
            <Label>Desktop Banner</Label>
            <div className="flex gap-2">
              <Input
                value={content.hero_desktop_image || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('hero_desktop_image', e.target.value)}
                placeholder="/assets/images/web about us banner.png"
                className="flex-1"
              />
              <label className="flex items-center gap-1.5 px-3 py-2 bg-luxury-gold text-luxury-navy rounded-md text-sm font-semibold cursor-pointer hover:bg-luxury-gold/90 transition-colors shrink-0">
                <Upload className="h-4 w-4" />
                {uploadingDesktop ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingDesktop}
                  onChange={(e) => { if (e.target.files?.[0]) uploadBannerImage(e.target.files[0], 'hero_desktop_image') }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">Recommended: 1920 × 480px • JPG, PNG, WebP</p>
            {content.hero_desktop_image && (
              <img src={content.hero_desktop_image} alt="Desktop preview" className="w-full h-32 object-cover rounded" />
            )}
          </div>
          {/* Mobile */}
          <div className="space-y-2">
            <Label>Mobile Banner</Label>
            <div className="flex gap-2">
              <Input
                value={content.hero_mobile_image || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('hero_mobile_image', e.target.value)}
                placeholder="/assets/images/mobile about us banner.png"
                className="flex-1"
              />
              <label className="flex items-center gap-1.5 px-3 py-2 bg-luxury-gold text-luxury-navy rounded-md text-sm font-semibold cursor-pointer hover:bg-luxury-gold/90 transition-colors shrink-0">
                <Upload className="h-4 w-4" />
                {uploadingMobile ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingMobile}
                  onChange={(e) => { if (e.target.files?.[0]) uploadBannerImage(e.target.files[0], 'hero_mobile_image') }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">Recommended: 768 × 280px • JPG, PNG, WebP</p>
            {content.hero_mobile_image && (
              <img src={content.hero_mobile_image} alt="Mobile preview" className="w-full h-32 object-cover rounded" />
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-luxury-navy">Content Sections</h3>
          <Button variant="outline" size="sm" onClick={addSection}><Plus className="h-4 w-4 mr-1" />Add Section</Button>
        </div>
        {(content.sections || []).map((section: any, sIdx: number) => (
          <div key={sIdx} className="rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-luxury-gold">Section {section.number}</span>
              <Button variant="ghost" size="icon" onClick={() => removeSection(sIdx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Number</Label>
                <Input value={section.number || ''} onChange={(e) => updateSection(sIdx, 'number', e.target.value)} placeholder="01" />
              </div>
              <div className="col-span-3 space-y-1">
                <Label>Section Title</Label>
                <Input value={section.title || ''} onChange={(e) => updateSection(sIdx, 'title', e.target.value)} placeholder="Section title" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Paragraphs</Label>
              {(section.paragraphs || []).map((para: string, pIdx: number) => (
                <div key={pIdx} className="flex gap-2">
                  <textarea
                    value={para}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateParagraph(sIdx, pIdx, e.target.value)}
                    rows={3}
                    className="flex-1 text-sm w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeParagraph(sIdx, pIdx)} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addParagraph(sIdx)}><Plus className="h-3 w-3 mr-1" />Add Paragraph</Button>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-luxury-navy">Call to Action Section</h3>
        <div className="space-y-2">
          <Label>CTA Title</Label>
          <Input value={content.cta_title || ''} onChange={(e) => update('cta_title', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>CTA Subtitle</Label>
          <Input value={content.cta_subtitle || ''} onChange={(e) => update('cta_subtitle', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input value={content.cta_button || ''} onChange={(e) => update('cta_button', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

// ─── Policy Pages Editor ──────────────────────────────────────────────────────

function PolicyEditor({
  content,
  onChange,
  showIntro,
  showConsent,
}: {
  content: any
  onChange: (c: any) => void
  showIntro?: boolean
  showConsent?: boolean
}) {
  const update = (key: string, value: any) => onChange({ ...content, [key]: value })

  const updateSection = (index: number, field: string, value: any) => {
    const sections = [...(content.sections || [])]
    sections[index] = { ...sections[index], [field]: value }
    update('sections', sections)
  }

  const addSection = () => {
    update('sections', [...(content.sections || []), { title: '', type: 'paragraphs', content: [''] }])
  }

  const removeSection = (index: number) => {
    update('sections', content.sections.filter((_: any, i: number) => i !== index))
  }

  const moveSection = (index: number, dir: -1 | 1) => {
    const sections = [...(content.sections || [])]
    const to = index + dir
    if (to < 0 || to >= sections.length) return;
    [sections[index], sections[to]] = [sections[to], sections[index]]
    update('sections', sections)
  }

  const updateContentItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const sections = [...(content.sections || [])]
    const items = [...(sections[sectionIndex].content || [])]
    items[itemIndex] = value
    sections[sectionIndex] = { ...sections[sectionIndex], content: items }
    update('sections', sections)
  }

  const addContentItem = (sectionIndex: number) => {
    const sections = [...(content.sections || [])]
    sections[sectionIndex] = { ...sections[sectionIndex], content: [...(sections[sectionIndex].content || []), ''] }
    update('sections', sections)
  }

  const removeContentItem = (sectionIndex: number, itemIndex: number) => {
    const sections = [...(content.sections || [])]
    sections[sectionIndex] = { ...sections[sectionIndex], content: sections[sectionIndex].content.filter((_: any, i: number) => i !== itemIndex) }
    update('sections', sections)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-luxury-navy">Page Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input value={content.title || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle / Last Updated</Label>
            <Input value={content.subtitle || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('subtitle', e.target.value)} />
          </div>
        </div>
        {showIntro && (
          <div className="space-y-2">
            <Label>Introduction Paragraph</Label>
            <textarea rows={3} value={content.intro || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('intro', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-luxury-navy">Sections</h3>
          <Button variant="outline" size="sm" onClick={addSection}><Plus className="h-4 w-4 mr-1" />Add Section</Button>
        </div>

        {(content.sections || []).map((section: any, sIdx: number) => (
          <div key={sIdx} className="rounded-lg border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveSection(sIdx, 1)} disabled={sIdx === (content.sections?.length || 0) - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-medium text-gray-500">Section {sIdx + 1}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeSection(sIdx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Section Title</Label>
                <Input value={section.title || ''} onChange={(e) => updateSection(sIdx, 'title', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Content Type</Label>
                <select
                  value={section.type || 'paragraphs'}
                  onChange={(e) => updateSection(sIdx, 'type', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="paragraphs">Paragraphs</option>
                  <option value="list">Bullet List</option>
                  <option value="numbered_list">Numbered List</option>
                  <option value="subsections">Subsections</option>
                  <option value="contact">Contact Block</option>
                </select>
              </div>
            </div>

            {section.highlight !== undefined && (
              <div className="space-y-1">
                <Label>Highlight Box (optional)</Label>
                <Input value={section.highlight || ''} onChange={(e) => updateSection(sIdx, 'highlight', e.target.value)} placeholder="Leave empty to hide" />
              </div>
            )}

            {['paragraphs', 'list', 'numbered_list', 'contact'].includes(section.type || 'paragraphs') && (
              <div className="space-y-2">
                {section.intro !== undefined && (
                  <div className="space-y-1">
                    <Label>Intro sentence (before list)</Label>
                    <Input value={section.intro || ''} onChange={(e) => updateSection(sIdx, 'intro', e.target.value)} />
                  </div>
                )}
                <Label>{section.type === 'list' || section.type === 'numbered_list' ? 'List Items' : 'Content'}</Label>
                {(section.content || []).map((item: string, iIdx: number) => (
                  <div key={iIdx} className="flex gap-2">
                    <textarea
                      value={item}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateContentItem(sIdx, iIdx, e.target.value)}
                      rows={2}
                      className="flex-1 w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeContentItem(sIdx, iIdx)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addContentItem(sIdx)}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                {section.footer !== undefined && (
                  <div className="space-y-1 pt-1">
                    <Label>Footer note (after list)</Label>
                    <Input value={section.footer || ''} onChange={(e) => updateSection(sIdx, 'footer', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {section.type === 'subsections' && (
              <SubsectionsEditor
                subsections={section.subsections || []}
                onChange={(subs) => updateSection(sIdx, 'subsections', subs)}
              />
            )}
          </div>
        ))}
      </div>

      {showConsent && (
        <div className="rounded-lg border border-gray-200 p-5 space-y-2">
          <Label>Consent Statement (bottom banner)</Label>
          <textarea rows={2} value={content.consent || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('consent', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
      )}
    </div>
  )
}

function SubsectionsEditor({ subsections, onChange }: { subsections: any[]; onChange: (s: any[]) => void }) {
  const addSub = () => onChange([...subsections, { title: '', content: [''] }])
  const removeSub = (i: number) => onChange(subsections.filter((_, idx) => idx !== i))
  const updateSub = (i: number, field: string, value: string) => {
    const s = [...subsections]
    s[i] = { ...s[i], [field]: value }
    onChange(s)
  }
  const updateSubItem = (subIdx: number, itemIdx: number, value: string) => {
    const s = [...subsections]
    const items = [...(s[subIdx].content || [])]
    items[itemIdx] = value
    s[subIdx] = { ...s[subIdx], content: items }
    onChange(s)
  }
  const addSubItem = (subIdx: number) => {
    const s = [...subsections]
    s[subIdx] = { ...s[subIdx], content: [...(s[subIdx].content || []), ''] }
    onChange(s)
  }
  const removeSubItem = (subIdx: number, itemIdx: number) => {
    const s = [...subsections]
    s[subIdx] = { ...s[subIdx], content: s[subIdx].content.filter((_: any, i: number) => i !== itemIdx) }
    onChange(s)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Subsections</Label>
        <Button variant="outline" size="sm" onClick={addSub}><Plus className="h-3 w-3 mr-1" />Add Sub</Button>
      </div>
      {subsections.map((sub, sIdx) => (
        <div key={sIdx} className="rounded border border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Subsection {sIdx + 1}</Label>
            <Button variant="ghost" size="icon" onClick={() => removeSub(sIdx)} className="h-6 w-6 text-red-400">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input value={sub.title || ''} onChange={(e) => updateSub(sIdx, 'title', e.target.value)} placeholder="Subsection title" />
          {(sub.content || []).map((item: string, iIdx: number) => (
            <div key={iIdx} className="flex gap-2">
              <textarea value={item} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSubItem(sIdx, iIdx, e.target.value)} rows={2} className="flex-1 w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <Button variant="ghost" size="icon" onClick={() => removeSubItem(sIdx, iIdx)} className="text-red-400 shrink-0">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addSubItem(sIdx)}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
        </div>
      ))}
    </div>
  )
}

// ─── FAQs Editor ──────────────────────────────────────────────────────────────

function FAQsEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const update = (key: string, value: any) => onChange({ ...content, [key]: value })

  const updateCategory = (cIdx: number, field: string, value: any) => {
    const cats = [...(content.categories || [])]
    cats[cIdx] = { ...cats[cIdx], [field]: value }
    update('categories', cats)
  }

  const addCategory = () => update('categories', [...(content.categories || []), { name: '', questions: [{ q: '', a: '' }] }])
  const removeCategory = (i: number) => update('categories', content.categories.filter((_: any, idx: number) => idx !== i))

  const updateQ = (cIdx: number, qIdx: number, field: 'q' | 'a', value: string) => {
    const cats = [...(content.categories || [])]
    const qs = [...(cats[cIdx].questions || [])]
    qs[qIdx] = { ...qs[qIdx], [field]: value }
    cats[cIdx] = { ...cats[cIdx], questions: qs }
    update('categories', cats)
  }

  const addQ = (cIdx: number) => {
    const cats = [...(content.categories || [])]
    cats[cIdx] = { ...cats[cIdx], questions: [...(cats[cIdx].questions || []), { q: '', a: '' }] }
    update('categories', cats)
  }

  const removeQ = (cIdx: number, qIdx: number) => {
    const cats = [...(content.categories || [])]
    cats[cIdx] = { ...cats[cIdx], questions: cats[cIdx].questions.filter((_: any, i: number) => i !== qIdx) }
    update('categories', cats)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-luxury-navy">Page Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Page Title</Label>
            <Input value={content.title || ''} onChange={(e) => update('title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Subtitle</Label>
            <Input value={content.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-luxury-navy">FAQ Categories</h3>
          <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-4 w-4 mr-1" />Add Category</Button>
        </div>

        {(content.categories || []).map((cat: any, cIdx: number) => (
          <div key={cIdx} className="rounded-lg border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Label className="shrink-0">Category Name</Label>
                <Input value={cat.name || ''} onChange={(e) => updateCategory(cIdx, 'name', e.target.value)} className="max-w-xs" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeCategory(cIdx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-luxury-gold/30">
              {(cat.questions || []).map((q: any, qIdx: number) => (
                <div key={qIdx} className="space-y-2 bg-gray-50 rounded p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-1">Q{qIdx + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeQ(cIdx, qIdx)} className="h-6 w-6 text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Question</Label>
                    <Input value={q.q || ''} onChange={(e) => updateQ(cIdx, qIdx, 'q', e.target.value)} className="text-sm font-medium" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Answer</Label>
                    <textarea value={q.a || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateQ(cIdx, qIdx, 'a', e.target.value)} rows={4} className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addQ(cIdx)}><Plus className="h-3 w-3 mr-1" />Add Question</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Default content fallbacks ────────────────────────────────────────────────

function getDefaultContent(pageKey: string): any {
  const defaults: Record<string, any> = {
    about: {
      hero_desktop_image: '/assets/images/web about us banner.png',
      hero_mobile_image: '/assets/images/mobile about us banner.png',
      sections: [],
      cta_title: 'Designed to be Remembered',
      cta_subtitle: 'Enter the world of MYKONOS fragrances',
      cta_button: 'Shop Now',
    },
    faqs: { title: 'Help Center', subtitle: '', categories: [] },
  }
  const policyDefault = { title: '', subtitle: '', sections: [] }
  return defaults[pageKey] || policyDefault
}
