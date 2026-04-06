import 'package:flutter/material.dart';

import '../../core/api/dio_client.dart';
import '../../shared/widgets/premium_ui.dart';

class RechargeWalletPage extends StatefulWidget {
  const RechargeWalletPage({super.key});

  @override
  State<RechargeWalletPage> createState() => _RechargeWalletPageState();
}

class _RechargeWalletPageState extends State<RechargeWalletPage> {
  final _amountCtrl = TextEditingController(text: '1000');
  final _phoneCtrl = TextEditingController();
  bool _submitting = false;
  String _method = 'wallet';

  static const _presets = [1000, 2500, 5000, 10000, 25000];

  @override
  void dispose() {
    _amountCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = num.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) return;
    setState(() => _submitting = true);
    try {
      if (_method == 'wallet') {
        await ApiClient.dio.post('/payments/wallet/deposit', data: {
          'amount': amount,
          'description': 'Recharge dédiée Flutter',
        });
      } else {
        await ApiClient.dio.post('/live/wallet/recharge', data: {
          'amount': amount,
          'phone': _phoneCtrl.text.trim(),
        });
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Recharge initiée')),
      );
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Recharge impossible: $error'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final needsPhone = _method != 'wallet';
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(title: const Text('Recharger le wallet')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
        children: [
          PremiumSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const PremiumSectionHeader(
                  title: 'Recharge dédiée',
                  subtitle:
                      'Écran séparé comme dans la PWA pour recharger rapidement votre solde.',
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _presets.map((amount) {
                    final selected = _amountCtrl.text.trim() == '$amount';
                    return PremiumChoiceChip(
                      label: '$amount F',
                      selected: selected,
                      onTap: () => setState(() => _amountCtrl.text = '$amount'),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _amountCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Montant',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _method,
                  dropdownColor: const Color(0xFF0F172A),
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Mode de recharge',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(
                        value: 'wallet', child: Text('Dépôt Wallet')),
                    DropdownMenuItem(
                        value: 'orange_money', child: Text('Orange Money')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => _method = value);
                  },
                ),
                if (needsPhone) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Téléphone',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: Text(_submitting ? 'Traitement...' : 'Recharger'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
