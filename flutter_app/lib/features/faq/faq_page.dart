import 'package:flutter/material.dart';

class FaqPage extends StatelessWidget {
  const FaqPage({super.key});

  static const _faqs = [
    (
      'Qu’est-ce qu’AfriWonder ?',
      'AfriWonder est une super-app sociale et commerce pensée pour des usages mobiles fluides, avec vidéo, messagerie, live, marketplace et wallet.',
    ),
    (
      'Comment créer un compte ?',
      'Depuis l’écran de connexion, choisissez l’inscription puis renseignez vos informations. Le backend reste partagé avec la PWA.',
    ),
    (
      'Comment contacter le support ?',
      'Utilisez la page Support dans les paramètres pour créer et suivre vos tickets.',
    ),
    (
      'Puis-je utiliser AfriWonder hors ligne ?',
      'Certaines surfaces peuvent être consultées avec cache local, mais les flux temps réel, le wallet et les opérations live demandent une connexion.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      appBar: AppBar(
        backgroundColor: const Color(0xFF020617),
        title: const Text('FAQ'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: _faqs.map((faq) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: ExpansionTile(
              collapsedIconColor: Colors.white70,
              iconColor: Colors.white,
              title: Text(
                faq.$1,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w600),
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Text(
                    faq.$2,
                    style:
                        const TextStyle(color: Color(0xFFCBD5E1), height: 1.5),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
