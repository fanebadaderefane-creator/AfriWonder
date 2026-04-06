import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';

class StarredMessagesPage extends StatefulWidget {
  const StarredMessagesPage({super.key});

  @override
  State<StarredMessagesPage> createState() => _StarredMessagesPageState();
}

class _StarredMessagesPageState extends State<StarredMessagesPage> {
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/messages/starred');
      if (!mounted) return;
      setState(() {
        _messages = List<Map<String, dynamic>>.from(
          res.data['data']?['messages'] ?? res.data['data'] ?? const [],
        );
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Messages importants'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _messages.isEmpty
              ? const Center(
                  child: Text(
                    'Aucun message important',
                    style: TextStyle(color: Colors.white70),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _messages.length,
                  itemBuilder: (_, index) {
                    final message = _messages[index];
                    final conversation =
                        message['conversation'] as Map<String, dynamic>? ??
                            const {};
                    final sender =
                        message['sender'] as Map<String, dynamic>? ?? const {};
                    final avatar =
                        (sender['profile_image'] ?? sender['avatar_url'] ?? '')
                            .toString();
                    final title = (sender['full_name'] ??
                            sender['username'] ??
                            conversation['group_name'] ??
                            'Discussion')
                        .toString();
                    final conversationId = conversation['id']?.toString();

                    return ListTile(
                      leading: CircleAvatar(
                        backgroundImage: avatar.isNotEmpty
                            ? CachedNetworkImageProvider(avatar)
                            : null,
                        child: avatar.isEmpty
                            ? const Icon(Icons.star, color: Colors.white)
                            : null,
                      ),
                      title: Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      subtitle: Text(
                        (message['content'] ?? '').toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                      onTap: conversationId == null
                          ? null
                          : () => context.push('/messages/$conversationId'),
                    );
                  },
                ),
    );
  }
}
