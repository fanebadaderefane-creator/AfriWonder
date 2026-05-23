import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function VirtualScroller({ 
  items = [], 
  itemHeight = 1080,
  renderItem,
  onScroll,
  className = ''
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 3 });
  const containerRef = useRef(null);
  const lastScrollRef = useRef(0);
  const scrollTimeoutRef = useRef(null);

  const handleScroll = useCallback((_e) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    
    // Calculate visible range with buffer
    const bufferItems = 2;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
    const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + bufferItems);
    
    setVisibleRange({ start, end });
    
    // Debounce scroll callback
    lastScrollRef.current = scrollTop;
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      onScroll?.(scrollTop);
    }, 150);
  }, [items.length, itemHeight, onScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const _offsetY = visibleRange.start * itemHeight;

  return (
    <div 
      ref={containerRef}
      className={`overflow-y-scroll ${className}`}
      style={{ scrollBehavior: 'smooth' }}
    >
      <div style={{ height: visibleRange.start * itemHeight }} />
      <div>
        {visibleItems.map((item, idx) => (
          <div key={visibleRange.start + idx}>
            {renderItem(item, visibleRange.start + idx)}
          </div>
        ))}
      </div>
      <div style={{ height: (items.length - visibleRange.end) * itemHeight }} />
    </div>
  );
}