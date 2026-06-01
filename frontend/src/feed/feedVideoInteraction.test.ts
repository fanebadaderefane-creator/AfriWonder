import { describe, expect, it } from 'vitest';
import {
  applyFeedVideoStates,
  mergeFeedVideoInteraction,
  parseFeedVideoStatesPayload,
  pickFeedStateSyncIds,
} from './feedVideoInteraction';

describe('feedVideoInteraction', () => {
  it('parseFeedVideoStatesPayload normalise liked/saved/reactions', () => {
    const parsed = parseFeedVideoStatesPayload({
      likedIds: ['v1'],
      savedIds: ['v2'],
      reactionsByVideoId: { v1: 'like', v3: 'fire' },
    });
    expect(parsed.likedIds.has('v1')).toBe(true);
    expect(parsed.savedIds.has('v2')).toBe(true);
    expect(parsed.reactionsByVideoId.v3).toBe('fire');
  });

  it('applyFeedVideoStates remplit isLiked sur la fenêtre visible', () => {
    const videos = [
      { id: 'a', isLiked: false, isSaved: false, myReaction: null },
      { id: 'b', isLiked: false, isSaved: false, myReaction: null },
    ];
    const states = parseFeedVideoStatesPayload({
      likedIds: ['a'],
      savedIds: ['b'],
      reactionsByVideoId: { a: 'like' },
    });
    const out = applyFeedVideoStates(videos, states, new Set(['a']));
    expect(out[0].isLiked).toBe(true);
    expect(out[0].myReaction).toBe('like');
    expect(out[1].isLiked).toBe(false);
    expect(out[1].isSaved).toBe(false);
  });

  it('mergeFeedVideoInteraction conserve le like local si l’API ne le renvoie pas', () => {
    const merged = mergeFeedVideoInteraction(
      { id: 'v1', isLiked: false, views: 10, likes: 5 },
      { id: 'v1', isLiked: true, myReaction: 'like', views: 8, likes: 4 },
    );
    expect(merged.isLiked).toBe(true);
    expect(merged.myReaction).toBe('like');
    expect(merged.views).toBe(10);
    expect(merged.likes).toBe(5);
  });

  it('mergeFeedVideoInteraction respecte un unlike confirmé par l’API', () => {
    const merged = mergeFeedVideoInteraction(
      { id: 'v1', isLiked: false, myReaction: null, viewerStateFromApi: true, views: 10, likes: 5 },
      { id: 'v1', isLiked: true, myReaction: 'like', views: 8, likes: 4 },
    );
    expect(merged.isLiked).toBe(false);
    expect(merged.myReaction).toBeNull();
  });

  it('pickFeedStateSyncIds limite la fenêtre autour de l’index actif', () => {
    const ids = ['0', '1', '2', '3', '4', '5'];
    const picked = pickFeedStateSyncIds(ids, 2, 1);
    expect(picked).toEqual(['1', '2', '3']);
  });
});
