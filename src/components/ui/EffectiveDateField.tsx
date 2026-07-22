import { cn, formatDate } from '@/lib/utils';
import Input from './Input';

interface EffectiveDateFieldProps {
  effectiveFrom: string;
  effectiveTo: string | null;
  onChange: (effectiveFrom: string) => void;
  disabled?: boolean;
}

export default function EffectiveDateField({
  effectiveFrom,
  effectiveTo,
  onChange,
  disabled,
}: EffectiveDateFieldProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Effective from"
        type="date"
        value={effectiveFrom}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm text-cash-green font-medium">Until</span>
        <div
          className={cn(
            'min-h-[42px] flex items-center px-3 py-2.5 border border-mint-light rounded-md bg-soft-white/60 cursor-default',
          )}
        >
          {effectiveTo ? (
            <span className="text-sm text-deep-cash">{formatDate(effectiveTo)}</span>
          ) : (
            <span className="text-sm text-cash-gold font-medium">Present</span>
          )}
        </div>
      </div>
    </div>
  );
}
