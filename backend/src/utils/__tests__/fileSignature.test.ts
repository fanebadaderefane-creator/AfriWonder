import { detectFileSignature, fileSignatureMatchesMime } from '../fileSignature.js';

describe('fileSignature', () => {
  it('detects png signature', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectFileSignature(buf)).toBe('image/png');
    expect(fileSignatureMatchesMime(buf, 'image/png')).toBe(true);
  });

  it('rejects mismatched mime and signature', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(fileSignatureMatchesMime(png, 'video/mp4')).toBe(false);
  });

  it('detects pdf signature', () => {
    const pdf = Buffer.from('%PDF-1.7\n', 'ascii');
    expect(detectFileSignature(pdf)).toBe('application/pdf');
    expect(fileSignatureMatchesMime(pdf, 'application/pdf')).toBe(true);
  });

  it('detects quicktime separately from mp4', () => {
    const quicktime = Buffer.from([
      0x00, 0x00, 0x00, 0x14,
      0x66, 0x74, 0x79, 0x70,
      0x71, 0x74, 0x20, 0x20,
      0x00, 0x00, 0x00, 0x00,
    ]);
    expect(detectFileSignature(quicktime)).toBe('video/quicktime');
    expect(fileSignatureMatchesMime(quicktime, 'video/quicktime')).toBe(true);
    expect(fileSignatureMatchesMime(quicktime, 'video/mp4')).toBe(false);
  });
});
