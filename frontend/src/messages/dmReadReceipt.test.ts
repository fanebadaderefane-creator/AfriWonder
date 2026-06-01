import { describe, expect, it } from 'vitest';
import {
  extractMessageReadReaderId,
  mapApiMessageStatus,
  shouldApplyPeerReceiptEvent,
} from './dmReadReceipt';

describe('dmReadReceipt', () => {
  it('ignore self-read events for outgoing receipts', () => {
    expect(shouldApplyPeerReceiptEvent('user-a', 'user-a')).toBe(false);
    expect(shouldApplyPeerReceiptEvent('user-b', 'user-a')).toBe(true);
  });

  it('extracts reader id from socket payload', () => {
    expect(extractMessageReadReaderId({ userId: 'abc' })).toBe('abc');
    expect(extractMessageReadReaderId({ user_id: 'xyz' })).toBe('xyz');
  });

  it('maps API message status without upgrading sent to read', () => {
    expect(mapApiMessageStatus('read')).toBe('read');
    expect(mapApiMessageStatus('sent')).toBe('sent');
    expect(mapApiMessageStatus('delivered')).toBe('delivered');
  });
});
