import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../core/api/dio_client.dart';

class UploadVideoPage extends StatefulWidget {
  const UploadVideoPage({super.key});

  @override
  State<UploadVideoPage> createState() => _UploadVideoPageState();
}

class _UploadVideoPageState extends State<UploadVideoPage> {
  static const _categories = [
    'divertissement',
    'musique',
    'danse',
    'cuisine',
    'mode',
    'business',
    'education',
    'sport',
    'actualites',
    'humour',
    'lifestyle',
    'tech',
  ];
  static const _languages = [
    ('francais', 'Français'),
    ('anglais', 'English'),
    ('bambara', 'Bambara'),
    ('wolof', 'Wolof'),
    ('hausa', 'Hausa'),
  ];
  static const _visibilityOptions = [
    ('public', 'Public'),
    ('abonnes', 'Abonnés'),
    ('prive', 'Privé'),
  ];

  File? _videoFile;
  VideoPlayerController? _preview;
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _uploading = false;
  double _progress = 0;
  String _source = 'gallery';
  String _category = 'divertissement';
  String _language = 'francais';
  String _visibility = 'public';
  bool _hideLikes = false;
  bool _commentsDisabled = false;

  @override
  void dispose() {
    _preview?.dispose();
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickVideo(ImageSource source) async {
    final picker = ImagePicker();
    final xfile = await picker.pickVideo(
      source: source,
      maxDuration: const Duration(minutes: 10),
    );
    if (xfile == null) return;

    final file = File(xfile.path);
    final ctrl = VideoPlayerController.file(file);
    await ctrl.initialize();

    _preview?.dispose();
    if (!mounted) return;
    setState(() {
      _videoFile = file;
      _preview = ctrl;
    });
    await ctrl.play();
  }

  Future<void> _upload() async {
    final videoFile = _videoFile;
    if (videoFile == null) return;

    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ajoutez un titre avant de publier'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _uploading = true;
      _progress = 0;
    });

    try {
      final filename = videoFile.uri.pathSegments.isNotEmpty
          ? videoFile.uri.pathSegments.last
          : 'video.mp4';

      final presignRes = await ApiClient.dio.post('/upload/presign', data: {
        'kind': 'video',
        'filename': filename,
        'contentType': 'video/mp4',
      });

      final uploadData = presignRes.data['data'] as Map<String, dynamic>;
      final uploadUrl = uploadData['uploadUrl'] as String;
      final fileUrl = uploadData['file_url'] as String;

      await Dio().put(
        uploadUrl,
        data: videoFile.openRead(),
        options: Options(
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': await videoFile.length(),
          },
        ),
        onSendProgress: (sent, total) {
          if (!mounted || total <= 0) return;
          setState(() => _progress = sent / total * 0.9);
        },
      );

      final payload = <String, dynamic>{
        'title': title,
        'description':
            _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'video_url': fileUrl,
        'thumbnail_url': fileUrl,
        'category': _category,
        'language': _language,
        'visibility': _visibility,
        'media_type': 'video',
        'hide_likes': _hideLikes,
        'comments_disabled': _commentsDisabled,
        'comment_visibility': _commentsDisabled ? 'none' : 'everyone',
      }..removeWhere((key, value) => value == null);

      await ApiClient.dio.post('/videos', data: payload);

      if (!mounted) return;
      setState(() => _progress = 1);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Video publiee avec succes'),
          backgroundColor: Color(0xFF2563EB),
        ),
      );
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      final message =
          error is DioException ? _dioErrorMessage(error) : error.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _uploading = false);
      }
    }
  }

  String _dioErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final nestedError = data['error'];
      if (nestedError is Map<String, dynamic> &&
          nestedError['message'] is String) {
        return nestedError['message'] as String;
      }
      if (data['message'] is String) return data['message'] as String;
      if (data['error'] is String) return data['error'] as String;
    }
    return error.message ?? 'Erreur pendant la publication';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text(
          'Nouvelle video',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (_videoFile != null && !_uploading)
            TextButton(
              onPressed: _upload,
              child: const Text(
                'Publier',
                style: TextStyle(
                  color: Color(0xFF2563EB),
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            if (_preview != null && _preview!.value.isInitialized)
              AspectRatio(
                aspectRatio: _preview!.value.aspectRatio,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    VideoPlayer(_preview!),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          if (_preview!.value.isPlaying) {
                            _preview!.pause();
                          } else {
                            _preview!.play();
                          }
                        });
                      },
                      child: Container(
                        color: Colors.transparent,
                        child: Icon(
                          _preview!.value.isPlaying
                              ? Icons.pause
                              : Icons.play_arrow,
                          color: Colors.white54,
                          size: 64,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                height: 280,
                color: const Color(0xFF0F172A),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _SourceBtn(
                          icon: Icons.photo_library_outlined,
                          label: 'Galerie',
                          selected: _source == 'gallery',
                          onTap: () {
                            setState(() => _source = 'gallery');
                            _pickVideo(ImageSource.gallery);
                          },
                        ),
                        const SizedBox(width: 24),
                        _SourceBtn(
                          icon: Icons.videocam_outlined,
                          label: 'Camera',
                          selected: _source == 'camera',
                          onTap: () {
                            setState(() => _source = 'camera');
                            _pickVideo(ImageSource.camera);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Choisissez ou filmez votre video',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Titre',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _titleCtrl,
                    maxLength: 200,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Titre de la video',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFF0F172A),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Description',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descCtrl,
                    maxLines: 4,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Décrivez votre vidéo, ajoutez du contexte...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFF0F172A),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _category,
                          dropdownColor: const Color(0xFF0F172A),
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Catégorie',
                            border: OutlineInputBorder(),
                          ),
                          items: _categories
                              .map((category) => DropdownMenuItem(
                                    value: category,
                                    child: Text(category),
                                  ))
                              .toList(),
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _category = value);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _language,
                          dropdownColor: const Color(0xFF0F172A),
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Langue',
                            border: OutlineInputBorder(),
                          ),
                          items: _languages
                              .map((entry) => DropdownMenuItem(
                                    value: entry.$1,
                                    child: Text(entry.$2),
                                  ))
                              .toList(),
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _language = value);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _visibility,
                    dropdownColor: const Color(0xFF0F172A),
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Visibilité',
                      border: OutlineInputBorder(),
                    ),
                    items: _visibilityOptions
                        .map((entry) => DropdownMenuItem(
                              value: entry.$1,
                              child: Text(entry.$2),
                            ))
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _visibility = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    value: _hideLikes,
                    onChanged: (value) => setState(() => _hideLikes = value),
                    title: const Text(
                      'Masquer le compteur de likes',
                      style: TextStyle(color: Colors.white),
                    ),
                    subtitle: const Text(
                      'Option visible dans Create de la PWA',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                    ),
                    activeColor: const Color(0xFF2563EB),
                  ),
                  SwitchListTile(
                    value: _commentsDisabled,
                    onChanged: (value) =>
                        setState(() => _commentsDisabled = value),
                    title: const Text(
                      'Désactiver les commentaires',
                      style: TextStyle(color: Colors.white),
                    ),
                    subtitle: const Text(
                      'Empêche les réponses sur cette vidéo',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                    ),
                    activeColor: const Color(0xFF2563EB),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Description',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descCtrl,
                    maxLines: 4,
                    maxLength: 500,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Decrivez votre video... #hashtags',
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
              ),
            ),
            if (_uploading)
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    LinearProgressIndicator(
                      value: _progress,
                      backgroundColor: const Color(0xFF1E293B),
                      color: const Color(0xFF2563EB),
                      minHeight: 6,
                      borderRadius: BorderRadius.circular(3),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Publication en cours... ${(_progress * 100).toStringAsFixed(0)}%',
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            if (_videoFile != null && !_uploading)
              Padding(
                padding: const EdgeInsets.all(16),
                child: ElevatedButton(
                  onPressed: _upload,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Publier la video',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SourceBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SourceBtn({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 112,
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF2563EB) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
