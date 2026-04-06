import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

class OfflineCenterPage extends StatefulWidget {
  const OfflineCenterPage({super.key});

  @override
  State<OfflineCenterPage> createState() => _OfflineCenterPageState();
}

class _OfflineCenterPageState extends State<OfflineCenterPage> {
  String _status = 'Vérification...';

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
  }

  Future<void> _checkConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    if (!mounted) return;
    setState(() {
      _status = result.map((e) => e.name).join(', ');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Mode hors ligne'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'État réseau',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _status,
                  style: const TextStyle(color: Color(0xFFCBD5E1)),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _checkConnectivity,
                  child: const Text('Rafraîchir'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Le client Flutter remplace les mécanismes PWA par une stratégie native de reprise réseau, cache local et synchronisation. Cette page sert de centre utilisateur pour l’état hors ligne pendant la migration vers la parité complète.',
              style: TextStyle(color: Color(0xFFCBD5E1), height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
