import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../core/api/socket_service.dart';

class ChatPage extends StatefulWidget {
  final String conversationId;

  const ChatPage({super.key, required this.conversationId});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _messages = <Map<String, dynamic>>[];
  final _inputCtrl = TextEditingController();
  final _scroll = ScrollController();

  bool _loading = true;
  bool _muted = false;
  String? _myId;
  String? _recipientId;
  String _title = 'Conversation';

  @override
  void initState() {
    super.initState();
    _load();
    SocketService.emit('message:join-conversation', widget.conversationId);
    _listenSocket();
  }

  @override
  void dispose() {
    unawaited(_saveDraft(_inputCtrl.text.trim()));
    SocketService.emit('message:leave-conversation', widget.conversationId);
    SocketService.off('message:new');
    _inputCtrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/auth/me'),
        ApiClient.dio
            .get('/messages/conversations/id/${widget.conversationId}'),
        ApiClient.dio.get('/messages/${widget.conversationId}'),
      ]);

      final meRes = responses[0];
      final convRes = responses[1];
      final msgRes = responses[2];
      Response<dynamic>? draftRes;
      try {
        draftRes = await ApiClient.dio
            .get('/messages/conversations/${widget.conversationId}/draft');
      } catch (_) {}

      final conversation = convRes.data['data'] as Map<String, dynamic>;
      final myId = meRes.data['data']['id'].toString();
      final user1 = conversation['user1'] as Map<String, dynamic>? ?? const {};
      final user2 = conversation['user2'] as Map<String, dynamic>? ?? const {};
      final other = user1['id']?.toString() == myId ? user2 : user1;
      final messagePayload =
          msgRes.data['data'] as Map<String, dynamic>? ?? const {};

      setState(() {
        _myId = myId;
        _recipientId = other['id']?.toString();
        _title = other['full_name'] as String? ??
            other['username'] as String? ??
            'Conversation';
        _muted = conversation['muted'] == true;
        _messages
          ..clear()
          ..addAll(List<Map<String, dynamic>>.from(
              messagePayload['messages'] as List? ?? const []));
        _inputCtrl.text = (draftRes != null
                ? (draftRes.data['data']?['draft_content'] ?? '')
                : '')
            .toString();
        _loading = false;
      });

      await ApiClient.dio
          .put('/messages/${widget.conversationId}/read', data: const {});
      _scrollToBottom();
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _listenSocket() {
    SocketService.on('message:new', (data) {
      final incoming = data as Map<String, dynamic>;
      if (incoming['conversation_id']?.toString() != widget.conversationId) {
        return;
      }
      if (!mounted) return;

      setState(() => _messages.add(incoming));
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _recipientId == null) return;

    _inputCtrl.clear();
    await _saveDraft('');
    try {
      await ApiClient.dio.post('/messages/send', data: {
        'recipientId': _recipientId,
        'content': text,
        'type': 'text',
      });
    } catch (_) {}
  }

  Future<void> _saveDraft(String content) async {
    try {
      await ApiClient.dio.put(
        '/messages/conversations/${widget.conversationId}/draft',
        data: {'content': content},
      );
    } catch (_) {}
  }

  Future<void> _toggleMute() async {
    try {
      await ApiClient.dio.patch(
        '/messages/conversations/${widget.conversationId}/notifications',
        data: {'muted': !_muted},
      );
      if (!mounted) return;
      setState(() => _muted = !_muted);
    } catch (_) {}
  }

  Future<void> _exportConversation() async {
    try {
      final res = await ApiClient.dio.get(
        '/messages/export',
        queryParameters: {'conversationId': widget.conversationId},
      );
      final data = res.data['data'];
      final count = data is Map<String, dynamic>
          ? (data['messages'] as List?)?.length ?? 0
          : 0;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Export préparé ($count messages)')),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        title: Text(_title),
        actions: [
          if (_recipientId != null)
            IconButton(
              icon: const Icon(Icons.call_outlined),
              onPressed: () => context.push('/call/${_recipientId!}'),
            ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            color: const Color(0xFF0F172A),
            onSelected: (value) {
              if (value == 'mute') {
                _toggleMute();
              }
              if (value == 'export') {
                _exportConversation();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem<String>(
                value: 'mute',
                child: Text(
                  _muted ? 'Réactiver notifications' : 'Couper notifications',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
              const PopupMenuItem<String>(
                value: 'export',
                child: Text(
                  'Exporter la discussion',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (_, index) {
                      final message = _messages[index];
                      final isMe = message['sender_id']?.toString() == _myId;
                      final sender = message['sender'] as Map<String, dynamic>?;
                      final content = message['content'] as String? ?? '';

                      return Align(
                        alignment:
                            isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.72,
                          ),
                          decoration: BoxDecoration(
                            color: isMe
                                ? const Color(0xFF2563EB)
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!isMe && sender?['username'] != null)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Text(
                                    '@${sender!['username']}',
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              Text(
                                content,
                                style: const TextStyle(color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      onSubmitted: (_) => _send(),
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Message...',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 16),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF2563EB)),
                    onPressed: _send,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
