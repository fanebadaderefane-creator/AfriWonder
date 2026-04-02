import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:afriwonder_mobile/features/shell/bootstrap_screen.dart';

void main() {
  testWidgets('affiche le chargement initial du shell', (WidgetTester tester) async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: BootstrapScreen(apiBaseUrl: 'http://localhost:3000/api'),
        ),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
