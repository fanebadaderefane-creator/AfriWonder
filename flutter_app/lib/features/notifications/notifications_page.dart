import 'dart:async';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/dio_client.dart';
import '../../shared/widgets/skeleton_loader.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<Map<String, dynamic>> _notifs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/notifications');
      final payload = res.data['data'];
      final rawList =
          payload is Map<String, dynamic> ? payload['notifications'] : payload;
      setState(() {
        _notifs =
            List<Map<String, dynamic>>.from((rawList as List?) ?? const []);
        _loading = false;
      });
      // Marquer tout comme lu
      unawaited(ApiClient.dio.put('/notifications/read-all', data: const {}));
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _onTap(Map<String, dynamic> notif) {
    final type = notif['type'] as String?;
    final refId = notif['ref_id']?.toString();
    switch (type) {
      case 'like':
      case 'comment':
        if (refId != null) {
          context.push('/feed');
        }
        return;
      case 'follow':
        if (refId != null) {
          context.push('/profile/$refId');
        }
        return;
      case 'order':
        return;
      default:
        return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Notifications',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (_notifs.isNotEmpty)
            TextButton(
              onPressed: () {
                setState(() {
                  for (final n in _notifs) {
                    n['read'] = true;
                  }
                });
              },
              child: const Text('Tout lire',
                  style: TextStyle(color: Color(0xFF2563EB))),
            ),
        ],
      ),
      body: _loading
          ? ListView.builder(
              itemCount: 8,
              itemBuilder: (_, __) => const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(children: [
                  SkeletonBox(width: 44, height: 44, radius: 22),
                  SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        SkeletonBox(height: 13),
                        SizedBox(height: 6),
                        SkeletonBox(width: 180, height: 11),
                      ])),
                ]),
              ),
            )
          : _notifs.isEmpty
              ? const Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.notifications_none,
                        size: 64, color: Color(0xFF334155)),
                    SizedBox(height: 12),
                    Text('Aucune notification',
                        style: TextStyle(color: Color(0xFF94A3B8))),
                  ]),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: _notifs.length,
                    itemBuilder: (_, i) {
                      final n = _notifs[i];
                      final read = (n['read'] as bool?) ??
                          (n['is_read'] as bool?) ??
                          false;
                      return InkWell(
                        onTap: () => _onTap(n),
                        child: Container(
                          color: read
                              ? Colors.transparent
                              : const Color(0xFF0F172A),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          child: Row(children: [
                            // Avatar
                            CircleAvatar(
                              radius: 22,
                              backgroundImage: n['actor_avatar'] != null
                                  ? CachedNetworkImageProvider(
                                      n['actor_avatar'] as String)
                                  : null,
                              backgroundColor: const Color(0xFF1E293B),
                              child: n['actor_avatar'] == null
                                  ? Icon(_iconForType(n['type'] as String?),
                                      color: Colors.white, size: 20)
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            // Texte
                            Expanded(
                                child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _textForNotif(n),
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: read
                                        ? FontWeight.normal
                                        : FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _timeAgo(n['created_at'] as String?),
                                  style: const TextStyle(
                                      color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            )),
                            // Point non-lu
                            if (!read)
                              const CircleAvatar(
                                radius: 4,
                                backgroundColor: Color(0xFF2563EB),
                              ),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  String _textForNotif(Map<String, dynamic> n) {
    final actor = n['actor_username'] as String? ??
        n['from_user_name'] as String? ??
        'Quelqu\'un';
    switch (n['type'] as String?) {
      case 'like':
        return '$actor a aimé votre vidéo';
      case 'comment':
        return '$actor a commenté votre vidéo';
      case 'follow':
        return '$actor vous suit maintenant';
      case 'mention':
        return '$actor vous a mentionné';
      case 'order':
        return 'Votre commande a été mise à jour';
      default:
        return (n['title'] as String?)?.trim().isNotEmpty == true
            ? '${n['title']}'
            : n['message'] as String? ?? 'Nouvelle notification';
    }
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'like':
        return Icons.favorite;
      case 'comment':
        return Icons.comment;
      case 'follow':
        return Icons.person_add;
      case 'mention':
        return Icons.alternate_email;
      case 'order':
        return Icons.shopping_bag;
      default:
        return Icons.notifications;
    }
  }

  String _timeAgo(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inHours < 1) return 'Il y a ${diff.inMinutes} min';
    if (diff.inDays < 1) return 'Il y a ${diff.inHours} h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
