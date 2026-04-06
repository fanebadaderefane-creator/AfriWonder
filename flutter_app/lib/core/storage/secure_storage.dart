import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const _keyAccessToken = 'aw_access_token';
  static const _keyRefreshToken = 'aw_refresh_token';
  static const _keyUserId = 'aw_user_id';

  static Future<String?> getAccessToken() =>
      _storage.read(key: _keyAccessToken);
  static Future<String?> getRefreshToken() =>
      _storage.read(key: _keyRefreshToken);
  static Future<String?> getUserId() => _storage.read(key: _keyUserId);

  static Future<void> saveUserId(String userId) =>
      _storage.write(key: _keyUserId, value: userId);

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? userId,
  }) async {
    await Future.wait([
      _storage.write(key: _keyAccessToken, value: accessToken),
      _storage.write(key: _keyRefreshToken, value: refreshToken),
      if (userId != null) _storage.write(key: _keyUserId, value: userId),
    ]);
  }

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
