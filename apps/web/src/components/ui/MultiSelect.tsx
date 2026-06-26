import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export default function MultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = 'Select options',
  error,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((o) => values.includes(o.value));
  const unselectedOptions = options.filter((o) => !values.includes(o.value));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function removeValue(val: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(values.filter((v) => v !== val));
  }

  function addValue(val: string) {
    onChange([...values, val]);
  }

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-sm text-cash-green font-medium">{label}</span>
      )}
      <div className="relative">
        <div
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            'min-h-[42px] flex flex-wrap gap-1 items-center px-3 py-1.5 border rounded-md cursor-text transition-colors bg-white',
            error
              ? 'border-red-400'
              : isOpen
              ? 'border-fresh-cash'
              : 'border-mint-light hover:border-fresh-cash/60',
          )}
        >
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-mint-light text-cash-green"
              >
                {option.label}
                <button
                  type="button"
                  onClick={(e) => removeValue(option.value, e)}
                  className="hover:text-deep-cash transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-cash-green/50 py-1">{placeholder}</span>
          )}
          <ChevronDown
            size={16}
            className={cn(
              'ml-auto text-cash-green/60 transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180',
            )}
          />
        </div>

        {isOpen && unselectedOptions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-mint-light rounded-md shadow-lg max-h-60 overflow-y-auto">
            {unselectedOptions.map((option) => (
              <li
                key={option.value}
                onClick={() => addValue(option.value)}
                className="px-3 py-2.5 text-sm text-deep-cash cursor-pointer hover:bg-mint-light"
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}

        {isOpen && unselectedOptions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-mint-light rounded-md shadow-lg px-3 py-2.5 text-sm text-cash-green/50">
            All options selected
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
