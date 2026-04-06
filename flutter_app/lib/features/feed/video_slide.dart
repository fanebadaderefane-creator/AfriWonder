import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../../core/api/dio_client.dart';
import '../../shared/models/video.dart';

class VideoSlide extends StatefulWidget {
  final Video video;
  final VideoPlayerController? controller;
  final bool isActive;

  const VideoSlide({
    super.key,
    required this.video,
    required this.controller,
    required this.isActive,
  });

  @override
  State<VideoSlide> createState() => _VideoSlideState();
}

class _VideoSlideState extends State<VideoSlide> {
  bool _isLiked = false;
  bool _isSaved = false;
  bool _isFollowing = false;
  int _likesCount = 0;
  int _commentsCount = 0;
  int _sharesCount = 0;
  bool _showHeart = false;

  @override
  void initState() {
    super.initState();
    _syncFromVideo(widget.video);
  }

  @override
  void didUpdateWidget(covariant VideoSlide oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.video.id != widget.video.id) {
      _syncFromVideo(widget.video);
    }
  }

  void _syncFromVideo(Video v) {
    _isLiked = v.isLiked;
    _isFollowing = v.author.isFollowing;
    _likesCount = v.likesCount;
    _commentsCount = v.commentsCount;
    _sharesCount = v.sharesCount;
    _isSaved = false;
    _showHeart = false;
  }

  void _onSingleTap() {
    final ctrl = widget.controller;
    if (ctrl == null || !ctrl.value.isInitialized) return;
    if (ctrl.value.isPlaying) {
      ctrl.pause();
    } else {
      ctrl.play();
    }
  }

  Future<void> _toggleLike() async {
    setState(() {
      _isLiked = !_isLiked;
      _likesCount += _isLiked ? 1 : -1;
    });
    try {
      if (_isLiked) {
        await ApiClient.dio.post('/videos/${widget.video.id}/like');
      } else {
        await ApiClient.dio.delete('/videos/${widget.video.id}/like');
      }
    } catch (_) {
      // Rollback
      setState(() {
        _isLiked = !_isLiked;
        _likesCount += _isLiked ? 1 : -1;
      });
    }
  }

  void _onDoubleTap() {
    if (!_isLiked) _toggleLike();
    setState(() => _showHeart = true);
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) setState(() => _showHeart = false);
    });
  }

  Future<void> _toggleSave() async {
    final previous = _isSaved;
    setState(() => _isSaved = !_isSaved);
    try {
      await ApiClient.dio.post('/saves', data: {'video_id': widget.video.id});
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSaved = previous);
    }
  }

  Future<void> _toggleFollow() async {
    final creatorId = widget.video.creatorId.isNotEmpty
        ? widget.video.creatorId
        : widget.video.author.id;
    if (creatorId.isEmpty) return;
    final previous = _isFollowing;
    setState(() => _isFollowing = !_isFollowing);
    try {
      await ApiClient.dio.post('/users/$creatorId/follow', data: const {});
    } catch (_) {
      if (!mounted) return;
      setState(() => _isFollowing = previous);
    }
  }

  Future<void> _shareVideo() async {
    try {
      await ApiClient.dio
          .post('/videos/${widget.video.id}/share', data: const {});
      await Clipboard.setData(
        ClipboardData(text: 'https://afriwonder.com/video/${widget.video.id}'),
      );
      if (!mounted) return;
      setState(() => _sharesCount += 1);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lien copié et partage enregistré')),
      );
    } catch (_) {}
  }

  Future<void> _openComments() async {
    final posted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0B111D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => _CommentsSheet(videoId: widget.video.id),
    );
    if (posted == true && mounted) {
      setState(() => _commentsCount += 1);
    }
  }

  Future<void> _openTipDialog() async {
    final amount = await showDialog<int>(
      context: context,
      builder: (_) => const _TipDialog(),
    );
    if (amount == null || amount <= 0) return;
    try {
      await ApiClient.dio.post('/videos/${widget.video.id}/tip-wallet', data: {
        'amount': amount,
        'message': 'Support depuis Flutter',
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Tip envoyé: $amount FCFA')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Tip impossible: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = widget.controller;
    final location = widget.video.locationLabel?.trim();
    final music = widget.video.musicTitle?.trim();
    final creatorHandle = widget.video.author.username.isNotEmpty
        ? '@${widget.video.author.username}'
        : '@afriwonder';

    return Stack(
      fit: StackFit.expand,
      children: [
        // Tap / double-tap : média + légende (même comportement que TikTok) ; le rail reste exclus.
        GestureDetector(
          onTap: _onSingleTap,
          onDoubleTap: _onDoubleTap,
          behavior: HitTestBehavior.opaque,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // ── Vidéo ou thumbnail ────────────────────────────────────
              if (ctrl != null && ctrl.value.isInitialized)
                FittedBox(
                  fit: BoxFit.cover,
                  child: SizedBox(
                    width: ctrl.value.size.width,
                    height: ctrl.value.size.height,
                    child: VideoPlayer(ctrl),
                  ),
                )
              else if (widget.video.thumbnailUrl != null)
                CachedNetworkImage(
                  imageUrl: widget.video.thumbnailUrl!,
                  fit: BoxFit.cover,
                )
              else
                const ColoredBox(color: Color(0xFF0F172A)),

              // ── Dégradé bas ───────────────────────────────────────────
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x33000000),
                        Colors.transparent,
                        Color(0x99000000),
                      ],
                      stops: [0.0, 0.45, 1.0],
                    ),
                  ),
                ),
              ),

              // ── Cœur double-tap ────────────────────────────────────────
              if (_showHeart)
                const Center(
                  child: Icon(Icons.favorite, color: Colors.white, size: 100),
                ),

              // ── Info auteur + description ──────────────────────────────
              Positioned(
                left: 16,
                right: 96,
                bottom: 94,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      creatorHandle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                      ),
                    ),
                    if (widget.video.description != null &&
                        widget.video.description!.trim().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        widget.video.description!,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 15,
                          height: 1.2,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    if (location != null && location.isNotEmpty)
                      _MetaChip(
                        icon: Icons.place_outlined,
                        label: location,
                      ),
                    if (music != null && music.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      _MetaChip(
                        icon: Icons.music_note_rounded,
                        label: music,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),

        // ── Actions droite ──────────────────────────────────────────────
        Positioned(
          right: 14,
          bottom: 112,
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFFF2C94C),
                        width: 2.5,
                      ),
                    ),
                    child: CircleAvatar(
                      radius: 22,
                      backgroundImage: widget.video.author.avatarUrl != null
                          ? CachedNetworkImageProvider(
                              widget.video.author.avatarUrl!)
                          : null,
                      child: widget.video.author.avatarUrl == null
                          ? const Icon(Icons.person, color: Colors.white)
                          : null,
                    ),
                  ),
                  Positioned(
                    right: -2,
                    bottom: -4,
                    child: GestureDetector(
                      onTap: _toggleFollow,
                      child: Container(
                        height: 22,
                        width: 22,
                        decoration: const BoxDecoration(
                          color: Color(0xFFF2C94C),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _isFollowing ? Icons.check : Icons.add,
                          color: Colors.black,
                          size: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _RightRailButton(
                icon: _isLiked ? Icons.favorite : Icons.favorite_border,
                iconColor: _isLiked ? Colors.white : Colors.white,
                label: _formatCount(_likesCount),
                onTap: _toggleLike,
              ),
              const SizedBox(height: 12),
              _RightRailButton(
                icon: Icons.comment_rounded,
                label: _formatCount(_commentsCount),
                onTap: _openComments,
              ),
              const SizedBox(height: 12),
              _RightRailButton(
                icon: Icons.reply_rounded,
                label: _formatCount(_sharesCount),
                onTap: _shareVideo,
              ),
              const SizedBox(height: 12),
              _RightRailButton(
                icon: _isSaved ? Icons.bookmark : Icons.bookmark_border,
                iconColor: _isSaved ? const Color(0xFFF2C94C) : Colors.white,
                label: '',
                onTap: _toggleSave,
              ),
              const SizedBox(height: 12),
              _RightRailButton(
                icon: Icons.volunteer_activism_outlined,
                label: 'Tip',
                onTap: _openTipDialog,
              ),
              const SizedBox(height: 18),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: Colors.white.withValues(alpha: 0.08)),
                ),
                child: const Icon(
                  Icons.album_outlined,
                  color: Color(0xFFF2C94C),
                  size: 18,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 15),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

class _CommentsSheet extends StatefulWidget {
  const _CommentsSheet({required this.videoId});

  final String videoId;

  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  final _commentCtrl = TextEditingController();
  List<Map<String, dynamic>> _comments = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.dio.get('/videos/${widget.videoId}/comments');
      if (!mounted) return;
      setState(() {
        _comments = List<Map<String, dynamic>>.from(
            res.data['data'] as List? ?? const []);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _sendComment() async {
    final content = _commentCtrl.text.trim();
    if (content.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ApiClient.dio.post('/videos/${widget.videoId}/comment', data: {
        'content': content,
      });
      _commentCtrl.clear();
      await _load();
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Commentaire impossible: $error')),
      );
      setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 12,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Commentaires',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 12),
            Flexible(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: _comments.length,
                      itemBuilder: (_, index) {
                        final comment = _comments[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFF1E293B),
                            child: Icon(Icons.person, color: Colors.white),
                          ),
                          title: Text(
                            (comment['user_name'] ??
                                    comment['author_name'] ??
                                    'Utilisateur')
                                .toString(),
                            style: const TextStyle(color: Colors.white),
                          ),
                          subtitle: Text(
                            (comment['content'] ?? '').toString(),
                            style: const TextStyle(color: Color(0xFFCBD5E1)),
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Votre commentaire...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _sending ? null : _sendComment,
                  icon: const Icon(Icons.send, color: Color(0xFF2563EB)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TipDialog extends StatefulWidget {
  const _TipDialog();

  @override
  State<_TipDialog> createState() => _TipDialogState();
}

class _TipDialogState extends State<_TipDialog> {
  final _customCtrl = TextEditingController();
  int? _selected;

  @override
  void dispose() {
    _customCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final choices = [100, 500, 1000, 2500, 5000];
    final custom = int.tryParse(_customCtrl.text.trim());
    final finalAmount = _selected ?? custom;

    return AlertDialog(
      backgroundColor: const Color(0xFF0B111D),
      title:
          const Text('Envoyer un tip', style: TextStyle(color: Colors.white)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: choices.map((amount) {
              final selected = _selected == amount;
              return ChoiceChip(
                label: Text('$amount F'),
                selected: selected,
                onSelected: (_) => setState(() => _selected = amount),
                selectedColor: Colors.white,
                backgroundColor: const Color(0xFF1E293B),
                labelStyle: TextStyle(
                  color: selected ? Colors.black : Colors.white,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _customCtrl,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              labelText: 'Montant personnalisé',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() => _selected = null),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: finalAmount == null || finalAmount < 50
              ? null
              : () => Navigator.of(context).pop(finalAmount),
          child: const Text('Envoyer'),
        ),
      ],
    );
  }
}

class _RightRailButton extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final VoidCallback onTap;

  const _RightRailButton({
    required this.icon,
    this.iconColor = Colors.white,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 27),
          ),
          if (label.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
