import 'package:local_auth/local_auth.dart';
import '../api/dio_client.dart';
import '../storage/secure_storage.dart';

class AuthService {
  static final _localAuth = LocalAuthentication();

  // ── Login ───────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login({
    required String identifier,
    required String password,
  }) async {
    final res = await ApiClient.dio.post('/auth/login', data: {
      'identifier': identifier,
      'password': password,
    });
    final data = res.data['data'];
    await SecureStorage.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
      userId: data['user']['id'].toString(),
    );
    return data['user'] as Map<String, dynamic>;
  }

  // ── Register ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> register({
    required String fullName,
    required String username,
    required String email,
    required String password,
    String? phone,
  }) async {
    final res = await ApiClient.dio.post('/auth/register', data: {
      'full_name': fullName,
      'username': username,
      'email': email,
      'password': password,
      if (phone != null) 'phone': phone,
    });
    final data = res.data['data'];
    await SecureStorage.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
      userId: data['user']['id'].toString(),
    );
    return data['user'] as Map<String, dynamic>;
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  static Future<void> logout() async {
    try {
      await ApiClient.dio.post('/auth/logout');
    } catch (_) {}
    await SecureStorage.clearAll();
  }

  // ── Current user ─────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> me() async {
    final token = await SecureStorage.getAccessToken();
    if (token == null) return null;
    try {
      final res = await ApiClient.dio.get('/auth/me');
      final data = res.data['data'] as Map<String, dynamic>;
      final userId = data['id']?.toString();
      if (userId != null && userId.isNotEmpty) {
        await SecureStorage.saveUserId(userId);
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  // ── Biometric ────────────────────────────────────────────────────────────
  static Future<bool> canUseBiometrics() async {
    try {
      return await _localAuth.canCheckBiometrics &&
          await _localAuth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  static Future<bool> authenticateWithBiometrics() async {
    try {
      return await _localAuth.authenticate(
        localizedReason: 'Authentifiez-vous pour accéder à AfriWonder',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
