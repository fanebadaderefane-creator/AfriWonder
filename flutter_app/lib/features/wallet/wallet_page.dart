import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({super.key});

  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  Map<String, dynamic>? _wallet;
  bool _loading = true;
  bool _submitting = false;
  final _depositCtrl = TextEditingController(text: '1000');
  final _withdrawCtrl = TextEditingController(text: '1000');
  final _pinCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _depositCtrl.dispose();
    _withdrawCtrl.dispose();
    _pinCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.dio.get('/payments/wallet');
      if (!mounted) return;
      setState(() {
        _wallet =
            Map<String, dynamic>.from(res.data['data'] as Map? ?? const {});
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _submitDeposit() async {
    final amount = num.tryParse(_depositCtrl.text.trim());
    if (amount == null || amount <= 0) return;
    await _runWalletAction(() async {
      await ApiClient.dio.post('/payments/wallet/deposit', data: {
        'amount': amount,
        'description': 'Recharge mobile Flutter',
      });
    }, successMessage: 'Recharge lancée');
  }

  Future<void> _submitWithdraw() async {
    final amount = num.tryParse(_withdrawCtrl.text.trim());
    if (amount == null || amount <= 0) return;
    await _runWalletAction(() async {
      await ApiClient.dio.post('/payments/wallet/withdraw', data: {
        'amount': amount,
        'description': 'Retrait mobile Flutter',
        if (_pinCtrl.text.trim().isNotEmpty) 'pin': _pinCtrl.text.trim(),
      });
    }, successMessage: 'Retrait demandé');
  }

  Future<void> _runWalletAction(
    Future<void> Function() action, {
    required String successMessage,
  }) async {
    setState(() => _submitting = true);
    try {
      await action();
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(successMessage)),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Opération impossible: $error'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final balance = _wallet?['balance'] ?? _wallet?['available_balance'] ?? 0;
    final currency = (_wallet?['currency'] ?? 'XOF').toString();
    final isPinned = _wallet?['pin_enabled'] == true;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('Wallet'),
        actions: [
          IconButton(
            onPressed: () => context.push('/wallet/recharge'),
            icon: const Icon(Icons.add_card_outlined),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Solde disponible',
                        style: TextStyle(color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '$balance $currency',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isPinned
                            ? 'Code PIN configuré'
                            : 'Configurez un code PIN pour sécuriser vos paiements',
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => context.push('/wallet/recharge'),
                        icon: const Icon(Icons.add_card_outlined),
                        label: const Text('Recharge dédiée'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _ActionCard(
                  title: 'Recharger le wallet',
                  controller: _depositCtrl,
                  hint: 'Montant',
                  buttonLabel: 'Déposer',
                  busy: _submitting,
                  onPressed: _submitDeposit,
                ),
                const SizedBox(height: 16),
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
                        'Retrait',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _withdrawCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          labelText: 'Montant',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _pinCtrl,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          labelText: 'PIN (si configuré)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submitWithdraw,
                          child:
                              Text(_submitting ? 'Traitement...' : 'Retirer'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.title,
    required this.controller,
    required this.hint,
    required this.buttonLabel,
    required this.busy,
    required this.onPressed,
  });

  final String title;
  final TextEditingController controller;
  final String hint;
  final String buttonLabel;
  final bool busy;
  final VoidCallback onPressed;

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
          TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: hint,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: busy ? null : onPressed,
              child: Text(busy ? 'Traitement...' : buttonLabel),
            ),
          ),
        ],
      ),
    );
  }
}
