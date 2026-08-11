import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps {
  label?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local';
  placeholder?: string;
  error?: string;
  hint?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Only meaningful when type="password" - renders a clickable eye icon that toggles plaintext visibility. Takes over the trailing-icon slot. */
  showPasswordToggle?: boolean;
  disabled?: boolean;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number;
  maxLength?: number;
  name?: string;
  id?: string;
  className?: string;
}

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  hint,
  leadingIcon,
  trailingIcon,
  showPasswordToggle,
  disabled,
  required,
  min,
  max,
  step,
  maxLength,
  name,
  id,
  className,
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const isPasswordToggle = type === 'password' && showPasswordToggle;
  const effectiveType = isPasswordToggle ? (visible ? 'text' : 'password') : type;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={id ?? name}
          className="text-sm text-cash-green font-medium"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <div
        className={cn(
          'relative flex items-center border rounded-md overflow-hidden transition-colors',
          error
            ? 'border-red-400'
            : 'border-mint-light focus-within:border-fresh-cash',
          disabled && 'bg-soft-white opacity-60',
        )}
      >
        {leadingIcon && (
          <span className="absolute left-3 flex items-center text-cash-green/60 pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          id={id ?? name}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          className={cn(
            'w-full px-3 py-2.5 text-sm text-deep-cash bg-white outline-none placeholder:text-cash-green/50',
            leadingIcon && 'pl-9',
            (trailingIcon || isPasswordToggle) && 'pr-9',
            disabled && 'cursor-not-allowed bg-transparent',
          )}
        />
        {isPasswordToggle ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            tabIndex={-1}
            className="absolute right-3 flex items-center text-cash-green/60 hover:text-cash-green disabled:pointer-events-none"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : trailingIcon && (
          <span className="absolute right-3 flex items-center text-cash-green/60 pointer-events-none">
            {trailingIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
