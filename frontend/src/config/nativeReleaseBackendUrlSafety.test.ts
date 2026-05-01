import { describe, it, expect } from 'vitest';
import { unsafeBackendOriginReasonForNativeRelease } from './nativeReleaseBackendUrlSafety';

describe('nativeReleaseBackendUrlSafety (APK / prod)', () => {
  it('accepte uniquement HTTPS avec hôte public', () => {
    expect(unsafeBackendOriginReasonForNativeRelease('https://afriwonder.onrender.com')).toBe(null);
    expect(unsafeBackendOriginReasonForNativeRelease('https://api.example.com:443')).toBe(null);
  });

  it('rejette HTTP et schémas non sécurisés', () => {
    expect(unsafeBackendOriginReasonForNativeRelease('http://api.example.com')).toMatch(/^non_https_protocol:/);
  });

  it('rejette localhost et boucle IPv4', () => {
    expect(unsafeBackendOriginReasonForNativeRelease('https://localhost')).toBe('localhost_hostname');
    expect(unsafeBackendOriginReasonForNativeRelease('https://127.0.0.1')).toBe('loopback_hostname');
    expect(unsafeBackendOriginReasonForNativeRelease('https://127.8.0.1')).toBe('loopback_ipv4');
  });

  it('rejette RFC1918 et lien-local', () => {
    expect(unsafeBackendOriginReasonForNativeRelease('https://192.168.1.11')).toBe('private_or_link_local_ipv4');
    expect(unsafeBackendOriginReasonForNativeRelease('https://10.0.2.2')).toBe('private_or_link_local_ipv4');
    expect(unsafeBackendOriginReasonForNativeRelease('https://169.254.1.1')).toBe('private_or_link_local_ipv4');
  });
});
