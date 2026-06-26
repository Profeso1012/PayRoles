import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlighted >= 0) {
        onChange(options[highlighted].value);
        setIsOpen(false);
        setHighlighted(-1);
      } else {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-sm text-cash-green font-medium">{label}</span>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 border rounded-md text-sm bg-white transition-colors',
            error
              ? 'border-red-400'
              : isOpen
              ? 'border-fresh-cash'
              : 'border-mint-light hover:border-fresh-cash/60',
            disabled && 'bg-soft-white opacity-60 cursor-not-allowed',
          )}
        >
          <span className={cn(selectedOption ? 'text-deep-cash' : 'text-cash-green/50')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'text-cash-green/60 transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        {isOpen && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-mint-light rounded-md shadow-lg max-h-60 overflow-y-auto">
            {options.map((option, index) => (
              <li
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setHighlighted(-1);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer',
                  highlighted === index ? 'bg-mint-light' : 'hover:bg-mint-light',
                  option.value === value
                    ? 'text-fresh-cash font-medium'
                    : 'text-deep-cash',
                )}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={14} className="text-fresh-cash shrink-0" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
