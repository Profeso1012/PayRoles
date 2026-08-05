import { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

interface RevealedPasswordModalProps {
  /** Who this password belongs to (email or name) - shown in the body copy. */
  subject: string;
  password: string;
  onDone: () => void;
}

/**
 * Deliberately not the shared Modal component - backdrop click, the X
 * button, and Escape all close it immediately, which risks losing the only
 * copy of a password that can never be shown again. This one only closes
 * once the caller has actually copied it. Used anywhere a temporary
 * password is generated server-side and returned once in a response body
 * (reset-password, new tenant user, new platform user, etc.) - none of
 * these are emailed or stored in plaintext, so a toast alone loses it forever.
 */
export default function RevealedPasswordModal({ subject, password, onDone }: RevealedPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15, 46, 35, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(1rem, 3vw, 2rem)',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: '0.75rem',
          maxWidth: 'min(420px, 92vw)', width: '100%',
          padding: 'clamp(1.25rem, 3vw, 1.75rem)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={18} className="text-cash-green" />
          <h3 className="text-base font-semibold text-deep-cash">Temporary Password</h3>
        </div>
        <p className="text-sm text-cash-green/80 mb-4">
          Temporary password for <span className="font-medium text-deep-cash">{subject}</span>.
        </p>

        <div className="flex items-center gap-2 p-3 rounded-lg border border-mint-light bg-soft-white mb-3">
          <code className="flex-1 text-sm font-mono text-deep-cash break-all">{password}</code>
          <Button
            variant={copied ? 'secondary' : 'primary'}
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(password);
              setCopied(true);
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-cash-gold/10 border border-cash-gold/30 mb-4">
          <AlertTriangle size={15} className="text-cash-gold shrink-0 mt-0.5" />
          <p className="text-xs text-deep-cash">
            You can only see this password right now — it cannot be shown again. Copy and save it
            somewhere safe, then share it with the user directly, before closing this dialog.
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" disabled={!copied} onClick={onDone}>
            Done, I've saved it
          </Button>
        </div>
      </div>
    </div>
  );
}
