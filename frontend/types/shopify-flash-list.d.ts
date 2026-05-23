declare module '@shopify/flash-list' {
  import * as React from 'react';

  // Minimal local typings to satisfy TS in this repo.
  // Runtime comes from the installed package; this file only defines types.
  export type FlashListRef<TItem> = any;

  export type FlashListProps<TItem> = {
    data: ReadonlyArray<TItem> | null | undefined;
    renderItem: (info: { item: TItem; index: number }) => React.ReactElement | null;
    keyExtractor?: (item: TItem, index: number) => string;

    // Common props used in the app (kept permissive).
    style?: any;
    ref?: any;
    onLayout?: any;
    showsVerticalScrollIndicator?: boolean;
    pagingEnabled?: boolean;
    snapToInterval?: number;
    snapToAlignment?: 'start' | 'center' | 'end';
    disableIntervalMomentum?: boolean;
    decelerationRate?: 'fast' | 'normal' | number;
    onScroll?: any;
    onScrollBeginDrag?: any;
    onScrollEndDrag?: any;
    onMomentumScrollEnd?: any;
    bounces?: boolean;
    overScrollMode?: 'auto' | 'always' | 'never';
    scrollEventThrottle?: number;
    estimatedItemSize?: number;
    drawDistance?: number;
    viewabilityConfig?: any;
    onViewableItemsChanged?: any;
    onEndReached?: any;
    onEndReachedThreshold?: number;
    refreshControl?: React.ReactElement | null;
    ListEmptyComponent?: React.ReactElement | null;
  } & Record<string, any>;

  export const FlashList: <TItem>(
    props: FlashListProps<TItem> & { ref?: React.Ref<FlashListRef<TItem>> }
  ) => React.ReactElement | null;
}

