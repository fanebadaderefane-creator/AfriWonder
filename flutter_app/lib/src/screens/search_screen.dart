import 'dart:async';

import 'package:flutter/material.dart';
import 'package:afriwonder_mobile/src/services/backend_client.dart';

/// Recherche globale branchée sur GET /api/search (vidéos, utilisateurs, produits).
class SearchScreen extends StatefulWidget {
  const SearchScreen({
    super.key,
    required this.client,
    required this.accessToken,
  });

  final BackendClient client;
  final String accessToken;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _result;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _scheduleSearch(String raw) {
    _debounce?.cancel();
    final q = raw.trim();
    if (q.isEmpty) {
      setState(() {
        _result = null;
        _error = null;
        _loading = false;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 450), () => _runSearch(q));
  }

  Future<void> _runSearch(String q) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.client.searchGlobal(
        accessToken: widget.accessToken,
        q: q,
        type: 'all',
        page: 1,
        limit: 15,
      );
      if (!mounted) return;
      setState(() {
        _result = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
        _result = null;
      });
    }
  }

  List<Map<String, dynamic>> _asMapList(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final videos = _asMapList(_result?['videos']);
    final users = _asMapList(_result?['users']);
    final products = _asMapList(_result?['products']);

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Retour',
        ),
        titleSpacing: 0,
        title: TextField(
          controller: _controller,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Rechercher vidéos, personnes, produits…',
            hintStyle: TextStyle(color: Colors.white38),
            border: InputBorder.none,
            isDense: true,
          ),
          onChanged: _scheduleSearch,
          onSubmitted: (v) => _scheduleSearch(v),
        ),
        actions: [
          if (_controller.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear_rounded),
              onPressed: () {
                _controller.clear();
                _scheduleSearch('');
              },
              tooltip: 'Effacer',
            ),
        ],
      ),
      body: _loading && _result == null
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFEC4899)))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70)),
                  ),
                )
              : _controller.text.trim().isEmpty
                  ? const Center(
                      child: Text(
                        'Tapez un mot-clé, un @pseudo ou un #hashtag',
                        style: TextStyle(color: Colors.white54),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.only(bottom: 24),
                      children: [
                        if (_loading)
                          const LinearProgressIndicator(
                            color: Color(0xFFEC4899),
                            backgroundColor: Colors.white10,
                          ),
                        if (videos.isNotEmpty) _sectionTitle('Vidéos'),
                        ...videos.map(_videoTile),
                        if (users.isNotEmpty) _sectionTitle('Personnes'),
                        ...users.map(_userTile),
                        if (products.isNotEmpty) _sectionTitle('Produits'),
                        ...products.map(_productTile),
                        if (!_loading &&
                            videos.isEmpty &&
                            users.isEmpty &&
                            products.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(32),
                            child: Text(
                              'Aucun résultat pour cette recherche.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.white54),
                            ),
                          ),
                      ],
                    ),
    );
  }

  Widget _sectionTitle(String t) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Text(
        t,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _videoTile(Map<String, dynamic> v) {
    final title = (v['title'] ?? 'Vidéo').toString();
    final creator = (v['creator_name'] ?? v['username'] ?? '').toString();
    return ListTile(
      leading: const CircleAvatar(
        backgroundColor: Colors.white10,
        child:
            Icon(Icons.play_circle_outline_rounded, color: Colors.pinkAccent),
      ),
      title: Text(title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white)),
      subtitle: creator.isNotEmpty
          ? Text(creator, style: const TextStyle(color: Colors.white54))
          : null,
    );
  }

  Widget _userTile(Map<String, dynamic> u) {
    final name = (u['full_name'] ?? u['username'] ?? '').toString();
    final handle = (u['username'] ?? '').toString();
    return ListTile(
      leading: const CircleAvatar(
        backgroundColor: Colors.white10,
        child: Icon(Icons.person_rounded, color: Colors.white70),
      ),
      title: Text(name.isNotEmpty ? name : handle,
          style: const TextStyle(color: Colors.white)),
      subtitle: handle.isNotEmpty
          ? Text('@$handle', style: const TextStyle(color: Colors.white54))
          : null,
    );
  }

  Widget _productTile(Map<String, dynamic> p) {
    final name = (p['name'] ?? 'Produit').toString();
    final price = p['price'];
    String? priceLabel;
    if (price != null) priceLabel = price.toString();
    return ListTile(
      leading: const CircleAvatar(
        backgroundColor: Colors.white10,
        child: Icon(Icons.shopping_bag_outlined, color: Colors.blueAccent),
      ),
      title: Text(name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white)),
      subtitle: priceLabel != null
          ? Text(priceLabel, style: const TextStyle(color: Colors.white54))
          : null,
    );
  }
}
