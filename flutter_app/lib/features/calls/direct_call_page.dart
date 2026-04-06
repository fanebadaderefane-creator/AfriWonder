import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../core/api/dio_client.dart';
import '../../core/theme/theme.dart';

class DirectCallPage extends StatefulWidget {
  final String userId; // ID de l'interlocuteur
  final String channelName; // Nom du channel Agora
  final bool isVideo; // true = appel vidéo, false = appel audio

  const DirectCallPage({
    super.key,
    required this.userId,
    required this.channelName,
    this.isVideo = true,
  });

  @override
  State<DirectCallPage> createState() => _DirectCallPageState();
}

class _DirectCallPageState extends State<DirectCallPage> {
  RtcEngine? _engine;
  int? _remoteUid;
  bool _joined = false;
  bool _micMuted = false;
  bool _camOff = false;
  bool _speakerOn = true;
  int _duration = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _initAgora();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _engine?.leaveChannel();
    _engine?.release();
    super.dispose();
  }

  Future<void> _initAgora() async {
    try {
      final tokenRes = await ApiClient.dio.post('/calls/token', data: {
        'channel': widget.channelName,
        'uid': 0,
      });
      final data = tokenRes.data['data'] as Map<String, dynamic>;
      final appId =
          (data['appId'] as String?) ?? dotenv.env['AGORA_APP_ID'] ?? '';
      final token = data['token'] as String?;
      final channel = (data['channel'] as String?) ?? widget.channelName;

      final engine = createAgoraRtcEngine();
      await engine.initialize(RtcEngineContext(appId: appId));

      engine.registerEventHandler(RtcEngineEventHandler(
        onJoinChannelSuccess: (_, __) {
          if (!mounted) return;
          setState(() => _joined = true);
          _startTimer();
        },
        onUserJoined: (_, uid, __) {
          if (!mounted) return;
          setState(() => _remoteUid = uid);
        },
        onUserOffline: (_, __, ___) {
          if (!mounted) return;
          setState(() => _remoteUid = null);
          // L'interlocuteur a raccroché
          Navigator.of(context).pop();
        },
      ));

      if (widget.isVideo) {
        await engine.enableVideo();
        await engine.startPreview();
      } else {
        await engine.disableVideo();
      }
      await engine.setEnableSpeakerphone(_speakerOn);

      if (token == null) throw Exception('Token manquant');
      await engine.joinChannel(
        token: token,
        channelId: channel,
        uid: 0,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
        ),
      );

      if (!mounted) return;
      setState(() => _engine = engine);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Impossible de démarrer l\'appel: $e'),
          backgroundColor: Colors.red,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _duration++);
    });
  }

  String _formatDuration(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  Future<void> _hangUp() async {
    await _engine?.leaveChannel();
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _toggleMic() async {
    _micMuted = !_micMuted;
    await _engine?.muteLocalAudioStream(_micMuted);
    setState(() {});
  }

  Future<void> _toggleCam() async {
    _camOff = !_camOff;
    await _engine?.muteLocalVideoStream(_camOff);
    setState(() {});
  }

  Future<void> _toggleSpeaker() async {
    _speakerOn = !_speakerOn;
    await _engine?.setEnableSpeakerphone(_speakerOn);
    setState(() {});
  }

  Future<void> _flipCamera() async {
    await _engine?.switchCamera();
  }

  @override
  Widget build(BuildContext context) {
    final engine = _engine;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Vidéo distante (plein écran)
          if (widget.isVideo && engine != null && _remoteUid != null)
            AgoraVideoView(
              controller: VideoViewController.remote(
                rtcEngine: engine,
                canvas: VideoCanvas(uid: _remoteUid),
                connection: RtcConnection(channelId: widget.channelName),
              ),
            )
          else
            Container(
              color: const Color(0xFF0F172A),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircleAvatar(
                      radius: 56,
                      backgroundColor: AfriWonderTheme.primary,
                      child: Icon(Icons.person, size: 56, color: Colors.white),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _joined
                          ? (_remoteUid != null ? 'En appel' : 'En attente...')
                          : 'Connexion...',
                      style: const TextStyle(color: Colors.white, fontSize: 18),
                    ),
                    if (_joined)
                      Text(
                        _formatDuration(_duration),
                        style: const TextStyle(
                            color: Color(0xFF94A3B8), fontSize: 14),
                      ),
                  ],
                ),
              ),
            ),

          // Préview locale (coin supérieur droit)
          if (widget.isVideo && engine != null && !_camOff)
            Positioned(
              top: 48,
              right: 16,
              child: SizedBox(
                width: 100,
                height: 150,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AgoraVideoView(
                    controller: VideoViewController(
                      rtcEngine: engine,
                      canvas: const VideoCanvas(uid: 0),
                    ),
                  ),
                ),
              ),
            ),

          // Durée
          if (_joined)
            Positioned(
              top: 48,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  _formatDuration(_duration),
                  style: const TextStyle(color: Colors.white70, fontSize: 16),
                ),
              ),
            ),

          // Contrôles bas
          Positioned(
            bottom: 48,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ControlButton(
                  icon: _micMuted ? Icons.mic_off : Icons.mic,
                  label: _micMuted ? 'Micro off' : 'Micro',
                  onTap: _toggleMic,
                  active: !_micMuted,
                ),
                if (widget.isVideo)
                  _ControlButton(
                    icon: _camOff ? Icons.videocam_off : Icons.videocam,
                    label: _camOff ? 'Cam off' : 'Cam',
                    onTap: _toggleCam,
                    active: !_camOff,
                  ),
                // Raccrocher
                GestureDetector(
                  onTap: _hangUp,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.call_end,
                        color: Colors.white, size: 32),
                  ),
                ),
                if (widget.isVideo)
                  _ControlButton(
                    icon: Icons.flip_camera_ios_outlined,
                    label: 'Flip',
                    onTap: _flipCamera,
                    active: true,
                  ),
                _ControlButton(
                  icon: _speakerOn ? Icons.volume_up : Icons.volume_off,
                  label: _speakerOn ? 'Haut-parleur' : 'Écouteur',
                  onTap: _toggleSpeaker,
                  active: _speakerOn,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: active
                  ? const Color(0xFF1E293B)
                  : Colors.white.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon,
                color: active ? Colors.white : Colors.white54, size: 26),
          ),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(color: Colors.white70, fontSize: 11)),
        ],
      ),
    );
  }
}
