import {
  canViewerAccessLive,
  joinAccessErrorCode,
  resolveViewerJoinAccess,
} from '../liveJoinAccess.js';

describe('resolveViewerJoinAccess', () => {
  it('autorise le créateur et les lives publics', () => {
    expect(resolveViewerJoinAccess({ isCreator: true, privateMode: true, requestStatus: null })).toBe('allowed');
    expect(resolveViewerJoinAccess({ isCreator: false, privateMode: false, requestStatus: null })).toBe('allowed');
  });

  it('live privé — none / pending / rejected / accepted', () => {
    expect(resolveViewerJoinAccess({ isCreator: false, privateMode: true, requestStatus: null })).toBe('none');
    expect(resolveViewerJoinAccess({ isCreator: false, privateMode: true, requestStatus: 'pending' })).toBe('pending');
    expect(resolveViewerJoinAccess({ isCreator: false, privateMode: true, requestStatus: 'rejected' })).toBe('rejected');
    expect(resolveViewerJoinAccess({ isCreator: false, privateMode: true, requestStatus: 'accepted' })).toBe('allowed');
  });
});

describe('canViewerAccessLive', () => {
  it('seul allowed peut rejoindre', () => {
    expect(canViewerAccessLive('allowed')).toBe(true);
    expect(canViewerAccessLive('pending')).toBe(false);
    expect(canViewerAccessLive('none')).toBe(false);
    expect(canViewerAccessLive('rejected')).toBe(false);
  });
});

describe('joinAccessErrorCode', () => {
  it('mappe les codes API', () => {
    expect(joinAccessErrorCode('none')).toBe('JOIN_ACCESS_REQUIRED');
    expect(joinAccessErrorCode('pending')).toBe('JOIN_ACCESS_PENDING');
    expect(joinAccessErrorCode('rejected')).toBe('JOIN_ACCESS_REJECTED');
  });
});
