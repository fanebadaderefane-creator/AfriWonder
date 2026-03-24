import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export function MessageReceiptTicks({ status, labels }) {
  const s = String(status || '');
  if (s === 'sending') {
    return (
      <span className="inline-flex text-white/55" title={labels?.sending} aria-label={labels?.sending}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (s === 'failed') {
    return (
      <span className="inline-flex text-amber-400/95" title={labels?.sendFailed} aria-label={labels?.sendFailed}>
        <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    );
  }
  if (s === 'read') {
    return (
      <span className="inline-flex items-center text-sky-400" title={labels?.read} aria-label={labels?.read}>
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        <Check className="-ml-1.5 h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (s === 'delivered') {
    return (
      <span
        className="inline-flex items-center text-white/45"
        title={labels?.messageStatusDelivered}
        aria-label={labels?.messageStatusDelivered}
      >
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        <Check className="-ml-1.5 h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (s === 'sent' || s === 'scheduled') {
    return (
      <span
        className="inline-flex text-white/45"
        title={labels?.messageStatusSent}
        aria-label={labels?.messageStatusSent}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  return null;
}
