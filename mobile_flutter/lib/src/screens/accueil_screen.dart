import 'package:flutter/material.dart';
import 'package:afriwonder_mobile/src/widgets/video_slide.dart';

/// Écran principal post-connexion : feed vertical, onglets Pour toi / Abonnements, barre du bas.
class AccueilScreen extends StatefulWidget {
  const AccueilScreen({
    super.key,
    required this.user,
    required this.feed,
    required this.pageController,
    required this.activeIndex,
    required this.activeTab,
    required this.bottomNavIndex,
    required this.onSwitchFeedTab,
    required this.onBottomNavTap,
    required this.onRefresh,
    required this.onLogout,
    required this.onLikeAt,
    required this.onFollowAt,
    required this.onCommentAt,
    required this.onSearchTap,
    required this.onNotificationsTap,
  });

  final Map<String, dynamic> user;
  final List<Map<String, dynamic>> feed;
  final PageController pageController;
  final int activeIndex;
  /// 0 = Pour toi, 1 = Abonnements
  final int activeTab;
  final int bottomNavIndex;
  final void Function(int tab) onSwitchFeedTab;
  final void Function(int index) onBottomNavTap;
  final Future<void> Function() onRefresh;
  final VoidCallback onLogout;
  final void Function(int index) onLikeAt;
  final void Function(int index) onFollowAt;
  final void Function(int index) onCommentAt;
  final VoidCallback onSearchTap;
  final VoidCallback onNotificationsTap;

  @override
  State<AccueilScreen> createState() => _AccueilScreenState();
}

class _AccueilScreenState extends State<AccueilScreen> {
  bool _pullRefreshInFlight = false;

  Future<void> _handlePullRefresh() async {
    if (_pullRefreshInFlight) return;
    _pullRefreshInFlight = true;
    try {
      await widget.onRefresh();
    } finally {
      if (mounted) setState(() => _pullRefreshInFlight = false);
    }
  }

  bool _onScrollOverscroll(ScrollNotification n) {
    if (widget.feed.isEmpty) return false;
    if (widget.activeIndex != 0) return false;
    if (n is! OverscrollNotification) return false;
    // Tirer vers le bas depuis la première vidéo
    if (n.overscroll >= 0) return false;
    if (_pullRefreshInFlight) return false;
    // Seuil pour limiter les déclenchements accidentels
    if (n.overscroll > -56) return false;
    _handlePullRefresh();
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final greeting = (widget.user['full_name'] ?? widget.user['username'] ?? '').toString().trim();

    return Scaffold(
      extendBody: true,
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          if (widget.feed.isEmpty)
            Positioned.fill(
              child: _AccueilEmptyState(
                activeTab: widget.activeTab,
                userGreeting: greeting.isNotEmpty ? greeting : null,
                onRefresh: widget.onRefresh,
              ),
            )
          else
            NotificationListener<ScrollNotification>(
              onNotification: _onScrollOverscroll,
              child: Stack(
                alignment: Alignment.topCenter,
                children: [
                  PageView.builder(
                    controller: widget.pageController,
                    scrollDirection: Axis.vertical,
                    physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                    itemCount: widget.feed.length,
                    itemBuilder: (context, index) {
                      final video = widget.feed[index];
                      final id = (video['id'] ?? index).toString();
                      final likes = (video['_localLikes'] is num) ? (video['_localLikes'] as num).toInt() : 0;
                      final liked = video['_localIsLiked'] == true;
                      final followed = video['_localIsFollowing'] == true;
                      final comments =
                          (video['comments_count'] is num) ? (video['comments_count'] as num).toInt() : 0;

                      final isActive = index == widget.activeIndex;
                      final shouldPreload = (index - widget.activeIndex).abs() <= 1;

                      return VideoSlide(
                        key: ValueKey('slide-$id'),
                        video: video,
                        isActive: isActive,
                        shouldPreload: shouldPreload,
                        isLiked: liked,
                        likeCount: likes,
                        isFollowing: followed,
                        onLikeTap: () => widget.onLikeAt(index),
                        onFollowTap: () => widget.onFollowAt(index),
                        onCommentTap: () => widget.onCommentAt(index),
                        commentCount: comments,
                      );
                    },
                  ),
                  if (_pullRefreshInFlight)
                    const Padding(
                      padding: EdgeInsets.only(top: 100),
                      child: SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFFEC4899),
                        ),
                      ),
                    ),
                ],
              ),
            ),

          // Barre supérieure
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(
                            child: _FeedTabPill(
                              label: 'Pour toi',
                              selected: widget.activeTab == 0,
                              onTap: () => widget.onSwitchFeedTab(0),
                            ),
                          ),
                          Expanded(
                            child: _FeedTabPill(
                              label: 'Abonnements',
                              selected: widget.activeTab == 1,
                              onTap: () => widget.onSwitchFeedTab(1),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.search_rounded),
                      color: Colors.white,
                      tooltip: 'Rechercher',
                      onPressed: widget.onSearchTap,
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded),
                      color: Colors.white,
                      tooltip: 'Actualiser',
                      onPressed: () => widget.onRefresh(),
                    ),
                    IconButton(
                      icon: const Icon(Icons.notifications_none_rounded),
                      color: Colors.white,
                      tooltip: 'Notifications',
                      onPressed: widget.onNotificationsTap,
                    ),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert_rounded, color: Colors.white),
                      tooltip: 'Plus',
                      color: const Color(0xFF111113),
                      onSelected: (value) {
                        if (value == 'logout') widget.onLogout();
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'logout',
                          child: Text('Déconnexion', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Navigation inférieure
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Container(
                height: 68,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x00000000), Color(0x99000000)],
                  ),
                ),
                child: BottomNavigationBar(
                  backgroundColor: Colors.transparent,
                  type: BottomNavigationBarType.fixed,
                  currentIndex: widget.bottomNavIndex.clamp(0, 4),
                  onTap: widget.onBottomNavTap,
                  showSelectedLabels: false,
                  showUnselectedLabels: false,
                  selectedItemColor: Colors.white,
                  unselectedItemColor: Colors.white54,
                  items: [
                    BottomNavigationBarItem(
                      icon: Icon(
                        Icons.home_rounded,
                        size: 26,
                        color: widget.bottomNavIndex == 0 ? Colors.white : Colors.white54,
                      ),
                      label: 'Accueil',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(
                        Icons.explore_rounded,
                        size: 26,
                        color: widget.bottomNavIndex == 1 ? Colors.white : Colors.white54,
                      ),
                      label: 'Découvrir',
                    ),
                    BottomNavigationBarItem(
                      icon: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white10, width: 1),
                        ),
                        child: const Icon(Icons.add_rounded, size: 28, color: Colors.white),
                      ),
                      label: 'Créer',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(
                        Icons.message_rounded,
                        size: 26,
                        color: widget.bottomNavIndex == 3 ? Colors.white : Colors.white54,
                      ),
                      label: 'Messages',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(
                        Icons.person_rounded,
                        size: 26,
                        color: widget.bottomNavIndex == 4 ? Colors.white : Colors.white54,
                      ),
                      label: 'Profil',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedTabPill extends StatelessWidget {
  const _FeedTabPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : Colors.white54,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            height: 3,
            width: double.infinity,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(99),
              color: selected ? Colors.pinkAccent : Colors.transparent,
            ),
          ),
        ],
      ),
    );
  }
}

class _AccueilEmptyState extends StatelessWidget {
  const _AccueilEmptyState({
    required this.activeTab,
    required this.onRefresh,
    this.userGreeting,
  });

  final int activeTab;
  final Future<void> Function() onRefresh;
  final String? userGreeting;

  @override
  Widget build(BuildContext context) {
    final String title;
    final String subtitle;
    if (activeTab == 1) {
      title = 'Aucune vidéo de vos abonnements';
      subtitle =
          'Suivez des créateurs pour voir leurs nouvelles vidéos ici, ou repassez sur « Pour toi » pour le fil global.';
    } else {
      title = 'Aucune vidéo pour l’instant';
      subtitle = 'Tirez pour actualiser ou vérifiez que le serveur renvoie bien le feed.';
    }

    final child = Padding(
      padding: const EdgeInsets.fromLTRB(32, 120, 32, 120),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            activeTab == 1 ? Icons.people_outline_rounded : Icons.play_circle_outline_rounded,
            size: 56,
            color: Colors.white38,
          ),
          const SizedBox(height: 20),
          if (userGreeting != null && userGreeting!.isNotEmpty)
            Text(
              'Bonjour, $userGreeting',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 15),
            ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white60, fontSize: 14, height: 1.35),
          ),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: () => onRefresh(),
            icon: const Icon(Icons.refresh_rounded, size: 20),
            label: const Text('Actualiser'),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEC4899),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            ),
          ),
        ],
      ),
    );

    return RefreshIndicator(
      color: const Color(0xFFEC4899),
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: child,
            ),
          );
        },
      ),
    );
  }
}
