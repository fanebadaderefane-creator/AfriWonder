import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';

class LegalDocumentsPage extends StatefulWidget {
  const LegalDocumentsPage({super.key});

  @override
  State<LegalDocumentsPage> createState() => _LegalDocumentsPageState();
}

class _LegalDocumentsPageState extends State<LegalDocumentsPage> {
  static const _documentTypes = [
    'terms_of_service',
    'privacy_policy',
    'data_protection'
  ];

  String _selectedType = _documentTypes.first;
  Map<String, dynamic>? _document;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.dio.get(
        '/legal/documents/$_selectedType',
        queryParameters: const {'language': 'fr'},
      );
      if (!mounted) return;
      setState(() {
        _document =
            Map<String, dynamic>.from(res.data['data'] as Map? ?? const {});
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _acceptCurrentDocument() async {
    final documentId = _document?['id'];
    if (documentId == null) return;
    try {
      await ApiClient.dio.post('/legal/accept', data: {
        'document_id': documentId,
        'document_type': _selectedType,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document accepté')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Acceptation impossible: $error'),
            backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Documents légaux'),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: _documentTypes.map((type) {
                final selected = type == _selectedType;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(type),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => _selectedType = type);
                      _load();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        (_document?['title'] ?? _selectedType).toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Version: ${(_document?['version'] ?? 'active').toString()}',
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        (_document?['content'] ?? 'Aucun contenu disponible.')
                            .toString(),
                        style: const TextStyle(
                            color: Color(0xFFE2E8F0), height: 1.5),
                      ),
                    ],
                  ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _acceptCurrentDocument,
            child: const Text('Accepter ce document'),
          ),
        ),
      ),
    );
  }
}
