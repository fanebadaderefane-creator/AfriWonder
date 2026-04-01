import 'package:flutter/material.dart';
import 'package:afriwonder_mobile/src/services/backend_client.dart';

/// Liste des notifications GET /api/notifications.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.client,
    required this.accessToken,
  });

  final BackendClient client;
  final String accessToken;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = [];
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.client.getNotifications(
        accessToken: widget.accessToken,
        page: 1,
        limit: 50,
      );
      if (!mounted) return;
      final raw = data['notifications'];
      final list = raw is List
          ? raw
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : <Map<String, dynamic>>[];
      final unread = data['unreadCount'];
      setState(() {
        _items = list;
        _unread = unread is num ? unread.toInt() : 0;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _markRead(Map<String, dynamic> n) async {
    final id = (n['id'] ?? '').toString();
    if (id.isEmpty) return;
    final wasUnread = n['is_read'] != true;
    if (!wasUnread) return;
    setState(() {
      final i = _items.indexWhere((e) => (e['id'] ?? '').toString() == id);
      if (i >= 0) {
        _items[i] = Map<String, dynamic>.from(_items[i])..['is_read'] = true;
        _unread = (_unread - 1).clamp(0, 1 << 30);
      }
    });
    try {
      await widget.client.markNotificationRead(
        accessToken: widget.accessToken,
        notificationId: id,
      );
    } catch (_) {
      await _load();
    }
  }

  Future<void> _markAllRead() async {
    try {
      await widget.client.markAllNotificationsRead(accessToken: widget.accessToken);
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Retour',
        ),
        title: Text(_unread > 0 ? 'Notifications ($_unread)' : 'Notifications'),
        actions: [
          if (_items.isNotEmpty && _unread > 0)
            TextButton(
              onPressed: _loading ? null : _markAllRead,
              child: const Text('Tout lu', style: TextStyle(color: Color(0xFFEC4899))),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFFEC4899),
        onRefresh: _load,
        child: _loading && _items.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(child: CircularProgressIndicator(color: Color(0xFFEC4899))),
                ],
              )
            : _error != null
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(24),
                    children: [
                      SizedBox(height: MediaQuery.sizeOf(context).height * 0.2),
                      Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
                    ],
                  )
                : _items.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          SizedBox(height: MediaQuery.sizeOf(context).height * 0.25),
                          const Icon(Icons.notifications_none_rounded, size: 56, color: Colors.white24),
                          const SizedBox(height: 16),
                          const Text(
                            'Aucune notification',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white54, fontSize: 16),
                          ),
                        ],
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: Colors.white10),
                        itemBuilder: (context, index) {
                          final n = _items[index];
                          final title = (n['title'] ?? '').toString();
                          final message = (n['message'] ?? '').toString();
                          final unread = n['is_read'] != true;
                          final created = n['created_at']?.toString() ?? '';
                          return ListTile(
                            onTap: () => _markRead(n),
                            tileColor: unread ? const Color(0x14EC4899) : null,
                            title: Text(
                              title.isNotEmpty ? title : 'Notification',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (message.isNotEmpty)
                                    Text(message, style: const TextStyle(color: Colors.white60, fontSize: 13)),
                                  if (created.isNotEmpty)
                                    Text(
                                      created,
                                      style: const TextStyle(color: Colors.white38, fontSize: 11),
                                    ),
                                ],
                              ),
                            ),
                            trailing: unread
                                ? const Icon(Icons.circle, size: 10, color: Color(0xFFEC4899))
                                : null,
                          );
                        },
                      ),
      ),
    );
  }
}
