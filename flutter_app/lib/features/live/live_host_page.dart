import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../core/api/dio_client.dart';

class LiveHostPage extends StatefulWidget {
  final String channelName;

  const LiveHostPage({super.key, required this.channelName});

  @override
  State<LiveHostPage> createState() => _LiveHostPageState();
}

class _LiveHostPageState extends State<LiveHostPage> {
  RtcEngine? _engine;
  final _titleCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  final _thumbnailCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController(text: 'general');
  final _regionCtrl = TextEditingController(text: 'africa-west');

  bool _starting = false;
  bool _isLive = false;
  bool _micMuted = false;
  int _viewers = 0;
  String _streamId = '';
  String _channelId = '';

  @override
  void initState() {
    super.initState();
    _titleCtrl.text =
        widget.channelName == 'demo-room' ? '' : widget.channelName;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descriptionCtrl.dispose();
    _thumbnailCtrl.dispose();
    _categoryCtrl.dispose();
    _regionCtrl.dispose();
    final engine = _engine;
    _engine = null;
    engine?.leaveChannel();
    engine?.release();
    super.dispose();
  }

  Future<void> _startLive() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ajoutez un titre avant de demarrer le live'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _starting = true);
    try {
      final startPayload = <String, dynamic>{
        'title': title,
        'description': _descriptionCtrl.text.trim().isEmpty
            ? null
            : _descriptionCtrl.text.trim(),
        'category': _categoryCtrl.text.trim().isEmpty
            ? 'general'
            : _categoryCtrl.text.trim(),
        'thumbnail_url': _thumbnailCtrl.text.trim().isEmpty
            ? null
            : _thumbnailCtrl.text.trim(),
        'region':
            _regionCtrl.text.trim().isEmpty ? null : _regionCtrl.text.trim(),
        'language': 'fr',
        'status': 'live',
      }..removeWhere((key, value) => value == null);

      final startRes =
          await ApiClient.dio.post('/live/start', data: startPayload);
      final startData = startRes.data['data'] as Map<String, dynamic>;
      _streamId = (startData['id'] ?? widget.channelName).toString();

      final tokenRes = await ApiClient.dio.get(
        '/live/$_streamId/token',
        queryParameters: {'role': 'host'},
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

      final engine = createAgoraRtcEngine();
      await engine.initialize(RtcEngineContext(appId: appId));
      engine.registerEventHandler(
        RtcEngineEventHandler(
          onJoinChannelSuccess: (_, __) {
            if (!mounted) return;
            setState(() => _isLive = true);
          },
          onUserJoined: (_, __, ___) {
            if (!mounted) return;
            setState(() => _viewers++);
          },
          onUserOffline: (_, __, ___) {
            if (!mounted) return;
            setState(() => _viewers = (_viewers - 1).clamp(0, 99999));
          },
        ),
      );

      await engine.setClientRole(role: ClientRoleType.clientRoleBroadcaster);
      await engine.enableVideo();
      await engine.startPreview();
      await engine.joinChannel(
        token: token,
        channelId: _channelId,
        uid: uid,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
          publishCameraTrack: true,
          publishMicrophoneTrack: true,
        ),
      );

      if (!mounted) {
        await engine.leaveChannel();
        await engine.release();
        return;
      }

      setState(() => _engine = engine);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Impossible de lancer le live: $error'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _starting = false);
      }
    }
  }

  Future<void> _endLive() async {
    final streamId = _streamId;
    try {
      if (streamId.isNotEmpty) {
        await ApiClient.dio.post('/live/$streamId/end', data: {});
      }
    } catch (_) {}

    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final engine = _engine;
    if (engine == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF020617),
        appBar: AppBar(
          backgroundColor: const Color(0xFF020617),
          title: const Text('Demarrer un live'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Preparation du live',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Ces champs reprennent le contrat backend deja utilise par la PWA.',
              style: TextStyle(color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 20),
            _InputField(
              controller: _titleCtrl,
              label: 'Titre',
              hint: 'Concert live, debat, vente en direct...',
            ),
            const SizedBox(height: 16),
            _InputField(
              controller: _descriptionCtrl,
              label: 'Description',
              hint: 'Decrivez le programme du live',
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            _InputField(
              controller: _categoryCtrl,
              label: 'Categorie',
              hint: 'general',
            ),
            const SizedBox(height: 16),
            _InputField(
              controller: _regionCtrl,
              label: 'Region',
              hint: 'africa-west',
            ),
            const SizedBox(height: 16),
            _InputField(
              controller: _thumbnailCtrl,
              label: 'Thumbnail URL',
              hint: 'https://...',
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: _starting ? null : _startLive,
              icon: _starting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.wifi_tethering),
              label: Text(_starting ? 'Connexion...' : 'Demarrer maintenant'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                minimumSize: const Size(double.infinity, 54),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          AgoraVideoView(
            controller: VideoViewController(
              rtcEngine: engine,
              canvas: const VideoCanvas(uid: 0),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _isLive ? Colors.red : Colors.grey,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _isLive ? 'LIVE • $_viewers' : 'Connexion...',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: _endLive,
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 32,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ControlBtn(
                  icon: _micMuted ? Icons.mic_off : Icons.mic,
                  label: _micMuted ? 'Activer' : 'Muet',
                  onTap: () async {
                    await engine.muteLocalAudioStream(!_micMuted);
                    if (!mounted) return;
                    setState(() => _micMuted = !_micMuted);
                  },
                ),
                const SizedBox(width: 24),
                _ControlBtn(
                  icon: Icons.flip_camera_ios,
                  label: 'Camera',
                  onTap: () => engine.switchCamera(),
                ),
                const SizedBox(width: 24),
                _ControlBtn(
                  icon: Icons.stop_circle_outlined,
                  label: 'Terminer',
                  color: Colors.red,
                  onTap: _endLive,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final int maxLines;

  const _InputField({
    required this.controller,
    required this.label,
    required this.hint,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
            filled: true,
            fillColor: const Color(0xFF0F172A),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}

class _ControlBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ControlBtn({
    required this.icon,
    required this.label,
    this.color = Colors.white,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Colors.white24,
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(color: Colors.white, fontSize: 11)),
        ],
      ),
    );
  }
}
