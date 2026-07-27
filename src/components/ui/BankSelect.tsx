import { useEffect, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { NIGERIAN_BANKS } from '@/lib/data/nigerianBanks';
import { cn } from '@/lib/utils';
import Input from './Input';

interface BankSelectProps {
  label?: string;
  bankName: string;
  bankCode: string;
  onChange: (bankName: string, bankCode: string) => void;
  className?: string;
}

/**
 * Type-to-filter picker over NIGERIAN_BANKS - selecting a bank sets its name
 * AND its NIBSS code together, so a user never has to know or type the code
 * themselves. Falls back to plain manual text entry (name + code) for the
 * rare institution not in the list, rather than being a dead end - starts in
 * manual mode automatically if the existing bankName doesn't match any known
 * bank, so previously-entered custom data isn't hidden behind the wrong mode.
 */
export default function BankSelect({ label, bankName, bankCode, onChange, className }: BankSelectProps) {
  const knownMatch = NIGERIAN_BANKS.some((b) => b.name === bankName);
  const [manualMode, setManualMode] = useState(!knownMatch && !!bankName);
  const [query, setQuery] = useState(bankName);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!manualMode) setQuery(bankName);
  }, [bankName, manualMode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(bankName);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bankName]);

  const filtered = query.trim()
    ? NIGERIAN_BANKS.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50)
    : NIGERIAN_BANKS.slice(0, 50);

  function pick(bank: { name: string; code: string }) {
    onChange(bank.name, bank.code);
    setQuery(bank.name);
    setIsOpen(false);
    setHighlighted(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filtered[highlighted]) pick(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(bankName);
    }
  }

  if (manualMode) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <Input
          label={label ?? 'Bank Name'}
          value={bankName}
          onChange={(e) => onChange(e.target.value, bankCode)}
          placeholder="e.g. GTBank"
        />
        <Input
          label="Bank (NIBSS) Code"
          value={bankCode}
          onChange={(e) => onChange(bankName, e.target.value)}
          placeholder="e.g. 058"
        />
        <button
          type="button"
          onClick={() => setManualMode(false)}
          className="text-xs text-fresh-cash font-medium text-left hover:underline w-fit"
        >
          Search from bank list instead
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-sm text-cash-green font-medium">{label}</span>}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cash-green/40 pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2.5 border border-mint-light rounded-md text-sm bg-white outline-none focus:border-fresh-cash transition-colors"
            value={query}
            placeholder="Search for a bank..."
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlighted(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {isOpen && filtered.length > 0 && (
          <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-mint-light rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filtered.map((bank, i) => (
              <li
                key={`${bank.code}-${bank.name}`}
                onClick={() => pick(bank)}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
                  highlighted === i ? 'bg-mint-light' : 'hover:bg-mint-light',
                  bank.name === bankName ? 'text-fresh-cash font-medium' : 'text-deep-cash',
                )}
              >
                <span>{bank.name}</span>
                {bank.name === bankName && <Check size={13} className="text-fresh-cash shrink-0" />}
              </li>
            ))}
          </ul>
        )}
        {isOpen && filtered.length === 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-mint-light rounded-md shadow-lg px-3 py-2.5 text-sm text-cash-green/60">
            No matching bank found.
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setManualMode(true);
          setIsOpen(false);
        }}
        className="text-xs text-fresh-cash font-medium text-left hover:underline w-fit"
      >
        Can't find your bank? Enter manually
      </button>
    </div>
  );
}
