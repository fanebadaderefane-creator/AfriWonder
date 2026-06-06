import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  MESSAGE_BUBBLE_HIGHLIGHT_HOVER_RELEASE_MS,
  createMessageHighlightDelayedRelease,
} from './messageBubbleHighlightTiming';

describe('messageBubbleHighlightTiming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('releases highlight after the configured delay', () => {
    const release = vi.fn();
    const controller = createMessageHighlightDelayedRelease(400);

    controller.schedule('msg-1', release);
    expect(release).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MESSAGE_BUBBLE_HIGHLIGHT_HOVER_RELEASE_MS);
    expect(release).toHaveBeenCalledWith('msg-1');
  });

  it('cancel prevents a scheduled release', () => {
    const release = vi.fn();
    const controller = createMessageHighlightDelayedRelease(400);

    controller.schedule('msg-1', release);
    controller.cancel();
    vi.advanceTimersByTime(500);

    expect(release).not.toHaveBeenCalled();
  });

  it('only releases the latest scheduled message id', () => {
    const release = vi.fn();
    const controller = createMessageHighlightDelayedRelease(200);

    controller.schedule('msg-a', release);
    vi.advanceTimersByTime(100);
    controller.schedule('msg-b', release);
    vi.advanceTimersByTime(200);

    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith('msg-b');
  });
});
