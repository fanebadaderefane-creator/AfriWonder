import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';
import '../../core/api/socket_service.dart';
import '../../core/storage/secure_storage.dart';
import '../../core/theme/theme.dart';

class GroupChatPage extends StatefulWidget {
  final String groupId;

  const GroupChatPage({super.key, required this.groupId});

  @override
  State<GroupChatPage> createState() => _GroupChatPageState();
}

class _GroupChatPageState extends State<GroupChatPage> {
  final _messages = <Map<String, dynamic>>[];
  final _inputCtrl = TextEditingController();
  final _scroll = ScrollController();

  bool _loading = true;
  String? _myId;
  String _title = 'Groupe';
  int _members = 0;

  @override
  void initState() {
    super.initState();
    _load();
    SocketService.emit('message:join-conversation', widget.groupId);
    _listenSocket();
  }

  @override
  void dispose() {
    SocketService.emit('message:leave-conversation', widget.groupId);
    SocketService.off('message:new');
    _inputCtrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      _myId = await SecureStorage.getUserId();
      final responses = await Future.wait([
        ApiClient.dio.get('/messages/conversations/id/${widget.groupId}'),
        ApiClient.dio.get('/messages/${widget.groupId}'),
      ]);

      final conv = responses[0].data['data'] as Map<String, dynamic>? ?? {};
      final msgs = responses[1].data['data'] as List? ?? [];

      if (!mounted) return;
      setState(() {
        _title = conv['name'] as String? ?? 'Groupe';
        _members = (conv['members'] as List?)?.length ?? 0;
        _messages.addAll(msgs.cast<Map<String, dynamic>>());
        _loading = false;
      });
      _scrollToBottom();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _listenSocket() {
    SocketService.on('message:new', (data) {
      if (!mounted || data is! Map) return;
      if (data['conversation_id']?.toString() != widget.groupId) return;
      setState(() => _messages.add(Map<String, dynamic>.from(data)));
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty) return;
    _inputCtrl.clear();
    try {
      await ApiClient.dio.post(
        '/messages/${widget.groupId}',
        data: {'content': text, 'type': 'text'},
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AfriWonderTheme.surface,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_title,
                style: const TextStyle(color: Colors.white, fontSize: 16)),
            Text(
              '$_members membres',
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.group_outlined),
            onPressed: () => _showMembers(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AfriWonderTheme.primary))
                : _messages.isEmpty
                    ? const Center(
                        child: Text('Soyez le premier à écrire !',
                            style: TextStyle(color: Color(0xFF64748B))))
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) => _buildBubble(_messages[i]),
                      ),
          ),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> msg) {
    final isMe = msg['sender_id']?.toString() == _myId;
    final sender = msg['sender'] as Map<String, dynamic>? ?? {};
    final text = msg['content'] as String? ?? '';
    final senderName = sender['full_name'] as String? ??
        sender['username'] as String? ??
        'Anonyme';
    final avatarUrl = sender['avatar_url'] as String?;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 14,
              backgroundImage: avatarUrl != null
                  ? CachedNetworkImageProvider(avatarUrl)
                  : null,
              backgroundColor: AfriWonderTheme.primary.withValues(alpha: 0.2),
              child: avatarUrl == null
                  ? Text(senderName[0].toUpperCase(),
                      style: const TextStyle(
                          fontSize: 12, color: AfriWonderTheme.primary))
                  : null,
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2, left: 4),
                    child: Text(senderName,
                        style: const TextStyle(
                            color: AfriWonderTheme.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w600)),
                  ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isMe
                        ? AfriWonderTheme.primary
                        : const Color(0xFF0F172A),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                  ),
                  child: Text(
                    text,
                    style: TextStyle(
                      color: isMe ? Colors.white : const Color(0xFFE2E8F0),
                      fontSize: 15,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput() {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 24),
      color: const Color(0xFF0F172A),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _inputCtrl,
              style: const TextStyle(color: Colors.white),
              maxLines: null,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: 'Message au groupe...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.send, color: AfriWonderTheme.primary),
            onPressed: _send,
          ),
        ],
      ),
    );
  }

  void _showMembers() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      builder: (_) => const SizedBox(
        height: 300,
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.all(16),
              child: Text('Membres du groupe',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16)),
            ),
            Divider(color: Color(0xFF1E293B)),
            // Liste chargée à la demande
            Expanded(
              child: Center(
                child: Text('Membres disponibles dans la conversation',
                    style: TextStyle(color: Color(0xFF64748B))),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
