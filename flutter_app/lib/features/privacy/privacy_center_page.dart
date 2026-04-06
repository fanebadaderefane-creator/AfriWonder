import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';

class PrivacyCenterPage extends StatefulWidget {
  const PrivacyCenterPage({super.key});

  @override
  State<PrivacyCenterPage> createState() => _PrivacyCenterPageState();
}

class _PrivacyCenterPageState extends State<PrivacyCenterPage> {
  Map<String, dynamic>? _cookies;
  Map<String, dynamic>? _deletionStatus;
  List<Map<String, dynamic>> _securityLogs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final responses = await Future.wait([
        ApiClient.dio.get('/privacy/cookies/preferences'),
        ApiClient.dio.get('/privacy/deletion-status'),
        ApiClient.dio.get('/privacy/security-logs'),
      ]);
      if (!mounted) return;
      setState(() {
        _cookies = Map<String, dynamic>.from(
            responses[0].data['data'] as Map? ?? const {});
        _deletionStatus = Map<String, dynamic>.from(
            responses[1].data['data'] as Map? ?? const {});
        final logsPayload = responses[2].data['data'];
        final logs = logsPayload is Map<String, dynamic>
            ? logsPayload['logs']
            : logsPayload;
        _securityLogs =
            List<Map<String, dynamic>>.from(logs as List? ?? const []);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _exportData() async {
    try {
      await ApiClient.dio
          .post('/privacy/export-data', data: {'format': 'json'});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande d’export envoyée')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Export impossible: $error'),
            backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _requestDeletion() async {
    try {
      await ApiClient.dio.post('/privacy/delete-account',
          data: {'reason': 'Requested from Flutter app'});
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande de suppression enregistrée')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Suppression impossible: $error'),
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
        title: const Text('Privacy Center'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Card(
                  title: 'Cookies',
                  child: Text(
                    'Analytics: ${(_cookies?['analytics'] ?? false) == true ? 'activé' : 'désactivé'}\n'
                    'Marketing: ${(_cookies?['marketing'] ?? false) == true ? 'activé' : 'désactivé'}\n'
                    'Fonctionnel: ${(_cookies?['functional'] ?? false) == true ? 'activé' : 'désactivé'}',
                    style: const TextStyle(color: Color(0xFFCBD5E1)),
                  ),
                ),
                const SizedBox(height: 16),
                _Card(
                  title: 'Données personnelles',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Suppression demandée: ${(_deletionStatus?['pending'] ?? false) == true ? 'oui' : 'non'}',
                        style: const TextStyle(color: Color(0xFFCBD5E1)),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          ElevatedButton(
                            onPressed: _exportData,
                            child: const Text('Exporter mes données'),
                          ),
                          OutlinedButton(
                            onPressed: _requestDeletion,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.redAccent,
                              side: const BorderSide(color: Colors.redAccent),
                            ),
                            child: const Text('Supprimer mon compte'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _Card(
                  title: 'Logs de sécurité',
                  child: _securityLogs.isEmpty
                      ? const Text(
                          'Aucun log disponible.',
                          style: TextStyle(color: Color(0xFF94A3B8)),
                        )
                      : Column(
                          children: _securityLogs.take(6).map((log) {
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                (log['action'] ?? log['type'] ?? 'Activité')
                                    .toString(),
                                style: const TextStyle(color: Colors.white),
                              ),
                              subtitle: Text(
                                (log['created_at'] ?? '').toString(),
                                style:
                                    const TextStyle(color: Color(0xFF94A3B8)),
                              ),
                            );
                          }).toList(),
                        ),
                ),
              ],
            ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
