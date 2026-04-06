import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class VideoSlide extends StatefulWidget {
  const VideoSlide({
    super.key,
    required this.video,
    required this.isActive,
    required this.shouldPreload,
    required this.onLikeTap,
    required this.onFollowTap,
    required this.onCommentTap,
    required this.isLiked,
    required this.likeCount,
    required this.isFollowing,
    required this.commentCount,
  });

  final Map<String, dynamic> video;
  final bool isActive;
  final bool shouldPreload;
  final VoidCallback onLikeTap;
  final VoidCallback onFollowTap;
  final VoidCallback onCommentTap;
  final bool isLiked;
  final int likeCount;
  final bool isFollowing;
  final int commentCount;

  @override
  State<VideoSlide> createState() => _VideoSlideState();
}

class _VideoSlideState extends State<VideoSlide> {
  VideoPlayerController? _controller;

  bool _initialized = false;
  bool _readyToShow = false;
  bool _isMuted = true;

  @override
  void initState() {
    super.initState();
    _maybeInit(widget.shouldPreload || widget.isActive);
  }

  @override
  void didUpdateWidget(VideoSlide oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.shouldPreload && !_initialized) {
      _maybeInit(true);
    }

    if (widget.isActive) {
      if (_initialized &&
          _controller != null &&
          !_controller!.value.isPlaying) {
        _controller!.setVolume(0.0);
        _controller!.play();
      }
    } else {
      if (_controller != null && _initialized && _controller!.value.isPlaying) {
        _controller!.pause();
      }
    }
  }

  void _maybeInit(bool preload) {
    if (!preload) return;
    if (_controller != null) return;

    final src = _resolveVideoSrc(widget.video);
    if (src == null) return;

    _controller = VideoPlayerController.networkUrl(Uri.parse(src));
    _controller!.initialize().then((_) async {
      if (!mounted) return;
      setState(() {
        _initialized = true;
        _readyToShow =
            false; // attendre le "premier instant" avant d'enlever le poster
      });

      _controller!
        ..setLooping(true)
        ..setVolume(_isMuted ? 0.0 : 1.0);

      // Détection simple : dès que la lecture avance (position > 150ms),
      // on considère que le frame est prêt (évite le "noir" sur certains appareils).
      _controller!.addListener(() {
        final c = _controller;
        if (c == null) return;
        if (_readyToShow) return;
        if (c.value.isInitialized &&
            c.value.position > const Duration(milliseconds: 150)) {
          if (!mounted) return;
          setState(() => _readyToShow = true);
        }
      });

      if (widget.isActive) {
        await _controller!.play();
      }
    }).catchError((_) {
      // On garde le poster: pas bloquant.
    });
  }

  void _toggleMute() {
    final c = _controller;
    if (c == null || !_initialized) {
      setState(() => _isMuted = !_isMuted);
      return;
    }

    setState(() => _isMuted = !_isMuted);
    c.setVolume(_isMuted ? 0.0 : 1.0);
  }

  String? _resolveVideoSrc(Map<String, dynamic> video) {
    final hlsUrl = _toNonEmptyString(video['hls_url']);
    final videoUrl = _toNonEmptyString(video['video_url']);
    final playbackUrl = _toNonEmptyString(video['playback_url']);

    final candidate = playbackUrl ?? videoUrl ?? hlsUrl;
    if (candidate == null) return null;
    final s = candidate.trim();
    if (s.isEmpty) return null;
    if (s.startsWith('http') || s.startsWith('data:')) return s;
    return null;
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final posterUrl = _resolvePosterSrc(widget.video);
    final creator = (widget.video['creator_name'] ??
            (widget.video['creator'] is Map
                ? widget.video['creator']['username']
                : null) ??
            '')
        .toString();
    final title = (widget.video['title'] ?? '').toString();

    return SizedBox.expand(
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Poster (vrai "lâcher" après readyToShow)
          if (!_readyToShow)
            Positioned.fill(
              child: Image.network(
                posterUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.black),
              ),
            ),

          if (_controller != null)
            if (_readyToShow)
              Positioned.fill(
                child: AnimatedOpacity(
                  opacity: 1,
                  duration: const Duration(milliseconds: 180),
                  child: VideoPlayer(_controller!),
                ),
              ),

          // HUD texte
          Positioned(
            left: 16,
            right: 110,
            bottom: 120,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('@${creator.isNotEmpty ? creator : 'user'}',
                    style: const TextStyle(
                        color: Colors.white70, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(
                  title.isNotEmpty ? title : 'Video',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 18),
                ),
              ],
            ),
          ),

          // Actions droite (TikTok-like)
          Positioned(
            right: 12,
            bottom: 130,
            child: Column(
              children: [
                IconButton(
                  onPressed: widget.onLikeTap,
                  icon: Icon(
                    widget.isLiked ? Icons.favorite : Icons.favorite_border,
                    size: 34,
                    color: widget.isLiked ? Colors.pinkAccent : Colors.white,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0x40000000),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${widget.likeCount}',
                  style: const TextStyle(
                      color: Colors.white70, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 18),
                IconButton(
                  onPressed: widget.onCommentTap,
                  icon: const Icon(
                    Icons.comment_rounded,
                    size: 30,
                    color: Colors.white,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0x28000000),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${widget.commentCount}',
                  style: const TextStyle(
                      color: Colors.white70, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 22),
                Container(
                  width: 86,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: widget.isFollowing ? Colors.white10 : Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: widget.isFollowing ? Colors.white12 : Colors.white,
                      width: 1,
                    ),
                  ),
                  child: TextButton(
                    onPressed: widget.onFollowTap,
                    child: Text(
                      widget.isFollowing ? 'Suivi' : 'Suivre',
                      style: TextStyle(
                        color: widget.isFollowing ? Colors.white : Colors.black,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Volume (mute par défaut)
          Positioned(
            right: 16,
            bottom: 88,
            child: IconButton(
              onPressed: _toggleMute,
              icon: Icon(
                _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                size: 30,
                color: Colors.white,
              ),
              style: IconButton.styleFrom(
                backgroundColor: const Color(0x28000000),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _resolvePosterSrc(Map<String, dynamic> video) {
    final candidate = _toNonEmptyString(video['thumbnail_url']);
    if (candidate != null &&
        (candidate.startsWith('http') || candidate.startsWith('data:'))) {
      return candidate;
    }

    // fallback: pas de poster => noir (on ne force pas une image qui serait en fait une vidéo).
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  }

  String? _toNonEmptyString(dynamic v) {
    if (v == null) return null;
    final s = v.toString();
    if (s.trim().isEmpty) return null;
    return s;
  }
}
