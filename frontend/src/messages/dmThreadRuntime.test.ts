import { describe, expect, it, vi } from 'vitest';
import { markThreadDelivered, markThreadOpened, markThreadRead } from './dmThreadRuntime';
import { createDmThreadApi } from './dmThreadApi';

describe('dmThreadRuntime', () => {
  it('markThreadOpened appelle delivered puis read en DM', async () => {
    const client = {
      put: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    };
    const api = createDmThreadApi('conv-1', 'dm');
    await markThreadOpened(api, client as never);
    expect(client.put).toHaveBeenCalledWith('/messages/conv-1/delivered', {});
    expect(client.put).toHaveBeenCalledWith('/messages/conv-1/read', {});
  });

  it('markThreadOpened ne appelle que read en groupe', async () => {
    const client = {
      put: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    };
    const api = createDmThreadApi('grp-1', 'group');
    await markThreadOpened(api, client as never);
    expect(client.put).not.toHaveBeenCalled();
    expect(client.post).toHaveBeenCalledWith('/messages/group/grp-1/read', {});
  });

  it('markThreadDelivered ignoré pour groupe', async () => {
    const client = { put: vi.fn() };
    const api = createDmThreadApi('grp-1', 'group');
    await markThreadDelivered(api, client as never);
    expect(client.put).not.toHaveBeenCalled();
  });

  it('markThreadRead seul reste disponible', async () => {
    const client = { put: vi.fn().mockResolvedValue({}), post: vi.fn() };
    const api = createDmThreadApi('conv-2', 'dm');
    await markThreadRead(api, client as never);
    expect(client.put).toHaveBeenCalledWith('/messages/conv-2/read', {});
  });
});
