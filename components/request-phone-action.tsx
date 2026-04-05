'use client';

import { Phone, Copy, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type RequestPhoneActionProps = {
  phone: string | null;
};

function normalizePhoneForTel(phone: string): string {
  const trimmed = phone.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

export default function RequestPhoneAction({ phone }: RequestPhoneActionProps) {
  const [copied, setCopied] = useState(false);
  const displayPhone = phone?.trim() ?? '';
  const telPhone = useMemo(() => normalizePhoneForTel(displayPhone), [displayPhone]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!displayPhone || !telPhone) {
    return <span className="font-medium text-slate-900">-</span>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(telPhone);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a
        href={`tel:${telPhone}`}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        <span className="text-base leading-none text-slate-900">{displayPhone}</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        aria-label="คัดลอกเบอร์โทรศัพท์"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกเบอร์'}</span>
      </button>
    </div>
  );
}
