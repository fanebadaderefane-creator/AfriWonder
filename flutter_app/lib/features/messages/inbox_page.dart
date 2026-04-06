import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../shared/widgets/bottom_nav.dart';
import '../../shared/widgets/premium_ui.dart';
import '../../shared/widgets/skeleton_loader.dart';

class InboxPage extends StatefulWidget {
  const InboxPage({super.key});

  @override
  State<InboxPage> createState() => _InboxPageState();
}

class _InboxPageState extends State<InboxPage> {
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _groups = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/messages/conversations'),
        ApiClient.dio.get('/messages/groups'),
      ]);
      final payload = responses[0].data['data'];
      final rawList =
          payload is Map<String, dynamic> ? payload['conversations'] : payload;
      final groupsPayload = responses[1].data['data'];
      final rawGroups = groupsPayload is Map<String, dynamic>
          ? groupsPayload['groups']
          : groupsPayload;

      setState(() {
        _conversations =
            List<Map<String, dynamic>>.from((rawList as List?) ?? const []);
        _groups =
            List<Map<String, dynamic>>.from((rawGroups as List?) ?? const []);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredConversations {
    final query = _searchCtrl.text.trim().toLowerCase();
    Iterable<Map<String, dynamic>> items = _conversations;
    if (_activeFilter == 'unread') {
      items = items.where(
        (item) => ((item['unread_count'] as num?)?.toInt() ?? 0) > 0,
      );
    }
    if (_activeFilter == 'archived') {
      items = items.where((item) => item['archived'] == true);
    }
    if (query.isNotEmpty) {
      items = items.where((item) {
        final other = item['other'] as Map<String, dynamic>? ?? const {};
        final haystack =
            '${other['full_name'] ?? ''} ${other['username'] ?? ''} ${item['last_message_text'] ?? ''}'
                .toLowerCase();
        return haystack.contains(query);
      });
    }
    return items.toList();
  }

  List<Map<String, dynamic>> get _filteredGroups {
    final query = _searchCtrl.text.trim().toLowerCase();
    Iterable<Map<String, dynamic>> items = _groups;
    if (query.isNotEmpty) {
      items = items.where((item) {
        final haystack =
            '${item['name'] ?? ''} ${item['description'] ?? ''}'.toLowerCase();
        return haystack.contains(query);
      });
    }
    return items.toList();
  }

  @override
  Widget build(BuildContext context) {
    final showGroups = _activeFilter == 'groups';
    final list = showGroups ? _filteredGroups : _filteredConversations;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        title: const Text(
          'Messages',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.star_border),
            onPressed: () => context.push('/messages/starred'),
          ),
          IconButton(
            icon: const Icon(Icons.group_add_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: _loading
          ? ListView.builder(
              itemCount: 6,
              itemBuilder: (_, __) => const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    SkeletonBox(width: 48, height: 48, radius: 24),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBox(height: 14, width: 120),
                          SizedBox(height: 6),
                          SkeletonBox(height: 12),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                    child: PremiumSurface(
                      padding: const EdgeInsets.all(12),
                      child: PremiumSearchField(
                        controller: _searchCtrl,
                        hintText: 'Rechercher une discussion',
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                  ),
                  SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        _InboxFilterChip(
                          label: 'Tout',
                          selected: _activeFilter == 'all',
                          onTap: () => setState(() => _activeFilter = 'all'),
                        ),
                        _InboxFilterChip(
                          label: 'Non lus',
                          selected: _activeFilter == 'unread',
                          onTap: () => setState(() => _activeFilter = 'unread'),
                        ),
                        _InboxFilterChip(
                          label: 'Groupes',
                          selected: _activeFilter == 'groups',
                          onTap: () => setState(() => _activeFilter = 'groups'),
                        ),
                        _InboxFilterChip(
                          label: 'Archives',
                          selected: _activeFilter == 'archived',
                          onTap: () =>
                              setState(() => _activeFilter = 'archived'),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 110),
                      itemCount: list.length,
                      itemBuilder: (_, index) {
                        final item = list[index];
                        if (showGroups) {
                          final groupAvatar =
                              (item['avatar_url'] ?? '').toString();
                          final unreadCount =
                              (item['unread_count'] as num?)?.toInt() ?? 0;
                          return PremiumSurface(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: CircleAvatar(
                                backgroundImage: groupAvatar.isNotEmpty
                                    ? CachedNetworkImageProvider(groupAvatar)
                                    : null,
                                child: groupAvatar.isEmpty
                                    ? const Icon(Icons.groups)
                                    : null,
                              ),
                              title: Text(
                                (item['name'] ?? 'Groupe').toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              subtitle: Text(
                                (item['description'] ?? '').toString(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style:
                                    const TextStyle(color: Color(0xFF94A3B8)),
                              ),
                              trailing: unreadCount > 0
                                  ? CircleAvatar(
                                      radius: 10,
                                      backgroundColor: const Color(0xFFF97316),
                                      child: Text(
                                        '$unreadCount',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                        ),
                                      ),
                                    )
                                  : null,
                              onTap: () => context.push('/group/${item['id']}'),
                            ),
                          );
                        }

                        final conversation = item;
                        final other =
                            conversation['other'] as Map<String, dynamic>? ??
                                const {};
                        final avatarUrl = other['profile_image'] as String?;
                        final title = other['full_name'] as String? ??
                            other['username'] as String? ??
                            'Utilisateur';
                        final subtitle =
                            conversation['draft_content'] as String? ??
                                conversation['last_message_text'] as String? ??
                                '';
                        final unreadCount =
                            (conversation['unread_count'] as num?)?.toInt() ??
                                0;
                        final muted = conversation['muted'] == true;
                        final archived = conversation['archived'] == true;

                        return PremiumSurface(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(
                              backgroundImage:
                                  avatarUrl != null && avatarUrl.isNotEmpty
                                      ? CachedNetworkImageProvider(avatarUrl)
                                      : null,
                              child: avatarUrl == null || avatarUrl.isEmpty
                                  ? const Icon(Icons.person)
                                  : null,
                            ),
                            title: Text(
                              title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            subtitle: Text(
                              subtitle,
                              style: const TextStyle(color: Color(0xFF94A3B8)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: unreadCount > 0
                                ? Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (muted)
                                        const Padding(
                                          padding: EdgeInsets.only(right: 8),
                                          child: Icon(
                                            Icons.notifications_off_outlined,
                                            color: Color(0xFF94A3B8),
                                            size: 18,
                                          ),
                                        ),
                                      if (archived)
                                        const Padding(
                                          padding: EdgeInsets.only(right: 8),
                                          child: Icon(
                                            Icons.archive_outlined,
                                            color: Color(0xFF94A3B8),
                                            size: 18,
                                          ),
                                        ),
                                      CircleAvatar(
                                        radius: 10,
                                        backgroundColor:
                                            const Color(0xFFF97316),
                                        child: Text(
                                          '$unreadCount',
                                          style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 11),
                                        ),
                                      ),
                                      PopupMenuButton<String>(
                                        icon: const Icon(Icons.more_vert,
                                            color: Color(0xFF94A3B8)),
                                        color: const Color(0xFF0F172A),
                                        onSelected: (value) async {
                                          if (value == 'mute') {
                                            await ApiClient.dio.patch(
                                              '/messages/conversations/${conversation['id']}/notifications',
                                              data: {'muted': !muted},
                                            );
                                          }
                                          if (value == 'archive') {
                                            await ApiClient.dio.patch(
                                              '/messages/conversations/${conversation['id']}/archive',
                                              data: {'archived': !archived},
                                            );
                                          }
                                          await _load();
                                        },
                                        itemBuilder: (_) => [
                                          PopupMenuItem<String>(
                                            value: 'mute',
                                            child: Text(
                                              muted
                                                  ? 'Réactiver notifications'
                                                  : 'Couper notifications',
                                              style: const TextStyle(
                                                  color: Colors.white),
                                            ),
                                          ),
                                          PopupMenuItem<String>(
                                            value: 'archive',
                                            child: Text(
                                              archived
                                                  ? 'Désarchiver'
                                                  : 'Archiver',
                                              style: const TextStyle(
                                                  color: Colors.white),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  )
                                : PopupMenuButton<String>(
                                    icon: const Icon(Icons.more_vert,
                                        color: Color(0xFF94A3B8)),
                                    color: const Color(0xFF0F172A),
                                    onSelected: (value) async {
                                      if (value == 'mute') {
                                        await ApiClient.dio.patch(
                                          '/messages/conversations/${conversation['id']}/notifications',
                                          data: {'muted': !muted},
                                        );
                                      }
                                      if (value == 'archive') {
                                        await ApiClient.dio.patch(
                                          '/messages/conversations/${conversation['id']}/archive',
                                          data: {'archived': !archived},
                                        );
                                      }
                                      await _load();
                                    },
                                    itemBuilder: (_) => [
                                      PopupMenuItem<String>(
                                        value: 'mute',
                                        child: Text(
                                          muted
                                              ? 'Réactiver notifications'
                                              : 'Couper notifications',
                                          style: const TextStyle(
                                              color: Colors.white),
                                        ),
                                      ),
                                      PopupMenuItem<String>(
                                        value: 'archive',
                                        child: Text(
                                          archived ? 'Désarchiver' : 'Archiver',
                                          style: const TextStyle(
                                              color: Colors.white),
                                        ),
                                      ),
                                    ],
                                  ),
                            onTap: () =>
                                context.push('/messages/${conversation['id']}'),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 3),
    );
  }
}

class _InboxFilterChip extends StatelessWidget {
  const _InboxFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: PremiumChoiceChip(
        label: label,
        selected: selected,
        onTap: onTap,
      ),
    );
  }
}
