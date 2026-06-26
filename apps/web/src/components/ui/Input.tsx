import { cn } from '@/lib/utils';

interface InputProps {
  label?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  placeholder?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
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
  disabled,
  required,
  name,
  id,
  className,
}: InputProps) {
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
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full px-3 py-2.5 text-sm text-deep-cash bg-white outline-none placeholder:text-cash-green/50',
            leadingIcon && 'pl-9',
            trailingIcon && 'pr-9',
            disabled && 'cursor-not-allowed bg-transparent',
          )}
        />
        {trailingIcon && (
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
