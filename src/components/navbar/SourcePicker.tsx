import { Check, ChevronDown, Layers } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { controlClass } from './styles'

interface SourcePickerProps {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}

// Dropdown sumber dibuat sendiri, bukan <select> bawaan, karena panel milik
// sistem operasi tidak bisa diberi gaya dan tampak asing di header gelap.
// Polanya mengikuti "select-only combobox" ARIA: fokus tetap di tombol dan
// pilihan aktif ditunjuk lewat aria-activedescendant.
const SourcePicker = ({ value, options, onChange }: SourcePickerProps) => {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedLabel = options[selectedIndex]?.label ?? value

  // Klik di luar menutup panel. Listener hanya dipasang saat panel terbuka.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  // Daftar sumber bisa lebih panjang dari panelnya, jadi baris yang sedang
  // disorot lewat keyboard ikut digulir ke area yang terlihat.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, activeIndex])

  const open = () => {
    setActiveIndex(selectedIndex)
    setIsOpen(true)
  }

  const commit = (index: number) => {
    const option = options[index]

    if (option) {
      onChange(option.id)
    }

    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()

        if (!isOpen) {
          open()
          return
        }

        const step = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((current) => (current + step + options.length) % options.length)
        return
      }
      case 'Home':
      case 'End': {
        if (!isOpen) {
          return
        }

        event.preventDefault()
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
        return
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()

        if (!isOpen) {
          open()
          return
        }

        commit(activeIndex)
        return
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault()
          setIsOpen(false)
        }

        return
      }
      case 'Tab': {
        setIsOpen(false)
      }
    }
  }

  return (
    <div ref={containerRef} className="relative order-4 shrink-0 md:order-3">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'source-picker-list' : undefined}
        aria-activedescendant={isOpen ? `source-picker-option-${activeIndex}` : undefined}
        aria-label={`Sumber anime: ${selectedLabel}`}
        title="Ganti platform sumber anime"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`${controlClass} gap-2 pl-3 pr-2.5 ${
          isOpen
            ? 'border-rose-300 text-rose-600 dark:border-rose-500/60 dark:text-rose-300'
            : ''
        }`}
      >
        <Layers className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
        <span className="hidden text-[11px] font-bold uppercase tracking-wide text-slate-400 lg:inline dark:text-slate-500">
          Sumber
        </span>
        <span className="max-w-[5rem] truncate text-xs font-semibold text-slate-700 sm:max-w-[7rem] dark:text-slate-200">
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="pop-in absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-950">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Pilih sumber
          </p>
          <ul
            ref={listRef}
            id="source-picker-list"
            role="listbox"
            aria-label="Sumber anime"
            className="max-h-72 space-y-0.5 overflow-y-auto"
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex
              const isActive = index === activeIndex

              return (
                <li
                  key={option.id}
                  id={`source-picker-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onClick={() => commit(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'text-rose-600 dark:text-rose-300'
                      : 'text-slate-600 dark:text-slate-300'
                  } ${isActive ? 'bg-rose-50 dark:bg-rose-950/40' : ''}`}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SourcePicker
