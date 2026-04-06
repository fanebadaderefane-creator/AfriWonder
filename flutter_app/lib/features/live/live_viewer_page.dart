import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../core/api/dio_client.dart';
import '../../core/api/socket_service.dart';

class LiveViewerPage extends StatefulWidget {
  final String channelName;

  const LiveViewerPage({super.key, required this.channelName});

  @override
  State<LiveViewerPage> createState() => _LiveViewerPageState();
}

class _LiveViewerPageState extends State<LiveViewerPage> {
  RtcEngine? _engine;
  int? _remoteUid;
  bool _joined = false;
  int _viewers = 0;
  String _streamId = '';
  String _channelId = '';
  String _sessionId = '';
  Timer? _heartbeatTimer;
  final _messages = <Map<String, String>>[];
  final _chatCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _streamId = widget.channelName;
    _sessionId = 'viewer-${DateTime.now().millisecondsSinceEpoch}';
    _joinLive();
    _listenChat();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _leaveLive();
    SocketService.off('live:chat');
    SocketService.emit('live:leave-room', _streamId);
    _chatCtrl.dispose();
    super.dispose();
  }

  Future<void> _joinLive() async {
    try {
      final streamRes = await ApiClient.dio.get('/live/${widget.channelName}');
      final streamData = streamRes.data['data'] as Map<String, dynamic>?;
      if (streamData != null) {
        _streamId = (streamData['id'] ?? widget.channelName).toString();
        _viewers = (streamData['current_viewers'] as num?)?.toInt() ?? _viewers;
      }

      final tokenRes = await ApiClient.dio.get(
        '/live/$_streamId/token',
        queryParameters: {'role': 'audience'},
      );
      final tokenData = tokenRes.data['data'] as Map<String, dynamic>;
      final appId =
          (tokenData['appId'] as String?) ?? dotenv.env['AGORA_APP_ID'] ?? '';
      final token = tokenData['token'] as String?;
      _channelId = (tokenData['channel'] ?? widget.channelName).toString();
      final uid = (tokenData['uid'] as num?)?.toInt() ?? 0;

      if (token == null || token.isEmpty) {
        throw Exception('Token Agora manquant pour ce live');
      }

      await ApiClient.dio
          .post('/live/$_streamId/join', data: {'sessionId': _sessionId});

      final engine = createAgoraRtcEngine();
      await engine.initialize(RtcEngineContext(appId: appId));
      engine.registerEventHandler(
        RtcEngineEventHandler(
          onUserJoined: (_, uid, __) {
            if (!mounted) return;
            setState(() => _remoteUid = uid);
          },
          onUserOffline: (_, __, ___) {
            if (!mounted) return;
            setState(() => _remoteUid = null);
          },
          onJoinChannelSuccess: (_, __) {
            if (!mounted) return;
            setState(() => _joined = true);
          },
        ),
      );

      await engine.setClientRole(role: ClientRoleType.clientRoleAudience);
      await engine.enableVideo();
      await engine.joinChannel(
        token: token,
        channelId: _channelId,
        uid: uid,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleAudience,
        ),
      );

      SocketService.emit('live:join-room', _streamId);
      _startHeartbeat();

      if (!mounted) return;
      setState(() {
        _engine = engine;
        _viewers = (_viewers <= 0) ? 1 : _viewers;
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Impossible de rejoindre le live: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _leaveLive() async {
    final engine = _engine;
    _engine = null;

    try {
      await engine?.leaveChannel();
      await engine?.release();
    } catch (_) {}

    if (_streamId.isNotEmpty) {
      try {
        await ApiClient.dio
            .post('/live/$_streamId/leave', data: {'sessionId': _sessionId});
      } catch (_) {}
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 25), (_) async {
      if (_streamId.isEmpty) return;
      try {
        await ApiClient.dio.post('/live/$_streamId/heartbeat',
            data: {'sessionId': _sessionId});
      } catch (_) {}
    });
  }

  void _listenChat() {
    SocketService.on('live:chat', (data) {
      if (!mounted || data is! Map) return;
      final liveId = data['live_id']?.toString();
      if (liveId != null && _streamId.isNotEmpty && liveId != _streamId) return;

      setState(() {
        _messages.add({
          'user': data['sender_name']?.toString() ?? 'Anonyme',
          'text': data['message']?.toString() ?? '',
        });
      });
    });
  }

  Future<void> _sendMessage() async {
    final text = _chatCtrl.text.trim();
    if (text.isEmpty || _streamId.isEmpty) return;

    try {
      await ApiClient.dio
          .post('/live/$_streamId/chat', data: {'message': text});
      _chatCtrl.clear();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Message non envoye: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final engine = _engine;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          if (engine != null && _remoteUid != null)
            AgoraVideoView(
              controller: VideoViewController.remote(
                rtcEngine: engine,
                canvas: VideoCanvas(uid: _remoteUid),
                connection: RtcConnection(
                    channelId:
                        _channelId.isEmpty ? widget.channelName : _channelId),
              ),
            )
          else
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 16),
                  Text(
                    _joined
                        ? 'En attente du diffuseur...'
                        : 'Connexion au live...',
                    style: const TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.circle, color: Colors.white, size: 8),
                        const SizedBox(width: 4),
                        Text(
                          '$_viewers spectateurs',
                          style: const TextStyle(
                              color: Colors.white, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 8,
            right: 60,
            bottom: 60,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _messages.reversed.take(5).map((m) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '${m['user']} ',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        TextSpan(
                          text: m['text'],
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Positioned(
            left: 8,
            right: 8,
            bottom: 8,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Un commentaire...',
                      hintStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: Colors.white12,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: Colors.white),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
