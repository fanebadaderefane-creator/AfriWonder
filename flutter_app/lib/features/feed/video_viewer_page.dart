import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/video.dart';
import 'video_slide.dart';

/// Lecteur plein écran pour une vidéo ouverte depuis le profil, Discover, etc.
class VideoViewerPage extends StatefulWidget {
  const VideoViewerPage({super.key, required this.videoId});

  final String videoId;

  @override
  State<VideoViewerPage> createState() => _VideoViewerPageState();
}

class _VideoViewerPageState extends State<VideoViewerPage> {
  Video? _video;
  VideoPlayerController? _controller;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _load();
  }

  @override
  void dispose() {
    _controller?.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/videos/${widget.videoId}');
      final raw = res.data['data'] as Map<String, dynamic>? ?? {};
      final video = Video.fromJson(Map<String, dynamic>.from(raw));
      if (video.videoUrl.isEmpty) {
        if (mounted) {
          setState(() {
            _loading = false;
            _error = 'Vidéo indisponible';
          });
        }
        return;
      }
      final ctrl = VideoPlayerController.networkUrl(
        Uri.parse(video.videoUrl),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
      await ctrl.initialize();
      if (!mounted) {
        await ctrl.dispose();
        return;
      }
      await ctrl.play();
      setState(() {
        _video = video;
        _controller = ctrl;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Impossible de charger la vidéo';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_loading)
            const Center(
              child: CircularProgressIndicator(color: Color(0xFF2563EB)),
            )
          else if (_error != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: () {
                        if (context.canPop()) {
                          context.pop();
                        } else {
                          context.go('/feed');
                        }
                      },
                      child: const Text('Retour'),
                    ),
                  ],
                ),
              ),
            )
          else if (_video != null)
            VideoSlide(
              video: _video!,
              controller: _controller,
              isActive: true,
            ),
          SafeArea(
            child: Align(
              alignment: Alignment.topLeft,
              child: Semantics(
                label: 'Retour',
                button: true,
                child: IconButton(
                  onPressed: () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/feed');
                    }
                  },
                  icon:
                      const Icon(Icons.arrow_back_rounded, color: Colors.white),
                  tooltip: 'Retour',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
