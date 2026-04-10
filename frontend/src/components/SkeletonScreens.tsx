import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Shimmer, ShimmerCircle, ShimmerLine, ShimmerRect } from './Shimmer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GRID_GAP = 2;

// Feed Post Skeleton
export function FeedPostSkeleton() {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <ShimmerCircle size={44} />
        <View style={styles.postHeaderText}>
          <ShimmerLine width={140} height={14} />
          <ShimmerLine width={90} height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={styles.postBody}>
        <ShimmerLine width="95%" height={13} />
        <ShimmerLine width="80%" height={13} style={{ marginTop: 8 }} />
        <ShimmerLine width="60%" height={13} style={{ marginTop: 8 }} />
      </View>
      <ShimmerRect height={220} borderRadius={0} style={{ marginTop: 12 }} />
      <View style={styles.postActions}>
        <ShimmerLine width={70} height={12} />
        <ShimmerLine width={70} height={12} />
        <ShimmerLine width={70} height={12} />
      </View>
    </View>
  );
}

// Feed Skeleton (stories + posts)
export function FeedSkeleton() {
  return (
    <View style={styles.container}>
      {/* Stories skeleton */}
      <View style={styles.storiesRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.storyItem}>
            <ShimmerCircle size={64} />
            <ShimmerLine width={48} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      {/* Posts */}
      <FeedPostSkeleton />
      <FeedPostSkeleton />
    </View>
  );
}

// Explore Grid Skeleton
export function ExploreGridSkeleton() {
  const { width } = useWindowDimensions();
  const tileSize = Math.floor((width - GRID_GAP * 2) / 3);
  const tileHeight = Math.floor(tileSize * 1.35);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchSkeleton}>
        <ShimmerRect width="100%" height={44} borderRadius={12} />
      </View>
      {/* Stories */}
      <View style={styles.storiesRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.storyItem}>
            <ShimmerCircle size={64} />
            <ShimmerLine width={48} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      {/* Services */}
      <View style={styles.servicesRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.serviceItem}>
            <ShimmerRect width={52} height={52} borderRadius={16} />
            <ShimmerLine width={40} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      {/* Categories */}
      <View style={styles.categoriesRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerRect key={i} width={80} height={34} borderRadius={20} />
        ))}
      </View>
      {/* Grid */}
      {Array.from({ length: 3 }).map((_, ri) => (
        <View key={ri} style={{ width, height: tileHeight + GRID_GAP, overflow: 'hidden' }}>
          {Array.from({ length: 3 }).map((_, ci) => (
            <View
              key={ci}
              style={{ position: 'absolute', left: ci * (tileSize + GRID_GAP), top: 0, width: tileSize, height: tileHeight }}
            >
              <Shimmer width={tileSize} height={tileHeight} borderRadius={0} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Profile Skeleton
export function ProfileSkeleton() {
  const { width } = useWindowDimensions();
  const gridSize = Math.floor((width - 4) / 3);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.profileTopBar}>
        <ShimmerLine width={160} height={20} />
      </View>
      {/* Avatar + stats */}
      <View style={styles.profileRow}>
        <ShimmerCircle size={88} />
        <View style={styles.profileStats}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.profileStat}>
              <ShimmerLine width={40} height={18} />
              <ShimmerLine width={50} height={11} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>
      {/* Bio */}
      <View style={styles.profileBio}>
        <ShimmerLine width={140} height={14} />
        <ShimmerLine width="90%" height={12} style={{ marginTop: 8 }} />
        <ShimmerLine width="70%" height={12} style={{ marginTop: 6 }} />
      </View>
      {/* Buttons */}
      <View style={styles.profileButtons}>
        <ShimmerRect width="45%" height={38} borderRadius={10} />
        <ShimmerRect width="45%" height={38} borderRadius={10} />
      </View>
      {/* Highlights */}
      <View style={styles.storiesRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.storyItem}>
            <ShimmerCircle size={64} />
            <ShimmerLine width={48} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      {/* Grid */}
      {Array.from({ length: 3 }).map((_, ri) => (
        <View key={ri} style={{ width, height: gridSize + 2, overflow: 'hidden' }}>
          {Array.from({ length: 3 }).map((_, ci) => (
            <View key={ci} style={{ position: 'absolute', left: ci * (gridSize + 2), top: 0, width: gridSize, height: gridSize }}>
              <Shimmer width={gridSize} height={gridSize} borderRadius={0} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Marketplace Skeleton
export function MarketplaceSkeleton() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2;

  return (
    <View style={styles.container}>
      <View style={styles.searchSkeleton}>
        <ShimmerRect width="100%" height={44} borderRadius={12} />
      </View>
      <View style={styles.categoriesRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerRect key={i} width={80} height={34} borderRadius={20} />
        ))}
      </View>
      <View style={styles.marketGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.marketCard, { width: cardWidth }]}>
            <ShimmerRect width={cardWidth} height={cardWidth} borderRadius={12} />
            <ShimmerLine width="80%" height={13} style={{ marginTop: 10 }} />
            <ShimmerLine width={60} height={16} style={{ marginTop: 6 }} />
            <ShimmerLine width={90} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Wallet Skeleton
export function WalletSkeleton() {
  return (
    <View style={styles.container}>
      <ShimmerRect width="100%" height={180} borderRadius={20} style={{ marginBottom: 20 }} />
      <View style={styles.walletActions}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.walletAction}>
            <ShimmerCircle size={52} />
            <ShimmerLine width={48} height={10} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
      <ShimmerLine width={140} height={16} style={{ marginTop: 24, marginBottom: 12 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.transactionRow}>
          <ShimmerCircle size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ShimmerLine width="60%" height={13} />
            <ShimmerLine width="40%" height={10} style={{ marginTop: 6 }} />
          </View>
          <ShimmerLine width={70} height={14} />
        </View>
      ))}
    </View>
  );
}

// Crowdfunding Skeleton
export function CrowdfundingSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.searchSkeleton}>
        <ShimmerRect width="100%" height={44} borderRadius={12} />
      </View>
      {/* Stats banner */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <ShimmerRect width="100%" height={100} borderRadius={16} />
      </View>
      {/* Featured */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <ShimmerRect width="100%" height={240} borderRadius={16} />
      </View>
      {/* Categories */}
      <View style={styles.categoriesRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerRect key={i} width={90} height={34} borderRadius={20} />
        ))}
      </View>
      {/* Project cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <ShimmerRect width="100%" height={160} borderRadius={16} />
          <View style={{ padding: 14 }}>
            <ShimmerLine width="40%" height={12} />
            <ShimmerLine width="90%" height={16} style={{ marginTop: 8 }} />
            <ShimmerLine width="100%" height={6} style={{ marginTop: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <ShimmerLine width={100} height={14} />
              <ShimmerLine width={40} height={18} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Stories
  storiesRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, paddingVertical: 12 },
  storyItem: { alignItems: 'center', width: 64 },

  // Post
  postCard: { borderBottomWidth: 6, borderBottomColor: '#111', paddingBottom: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  postHeaderText: { flex: 1 },
  postBody: { paddingHorizontal: 16 },
  postActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, paddingHorizontal: 16 },

  // Search
  searchSkeleton: { paddingHorizontal: 16, paddingVertical: 8 },

  // Services
  servicesRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12 },
  serviceItem: { alignItems: 'center' },

  // Categories
  categoriesRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 8 },

  // Profile
  profileTopBar: { paddingHorizontal: 16, paddingVertical: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  profileStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 20 },
  profileStat: { alignItems: 'center' },
  profileBio: { paddingHorizontal: 16, marginBottom: 16 },
  profileButtons: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },

  // Market
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, marginTop: 16 },
  marketCard: { marginBottom: 8 },

  // Wallet
  walletActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  walletAction: { alignItems: 'center' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
});
