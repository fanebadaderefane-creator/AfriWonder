import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final Map<String, dynamic> user;
}

class BackendClient {
  BackendClient({required this.baseUrl}) : _http = http.Client();

  final String baseUrl;
  final http.Client _http;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _accessKey = 'afw_access_token';
  static const _refreshKey = 'afw_refresh_token';

  Future<AuthSession> login({
    required String identifier,
    required String password,
  }) async {
    final response = await _http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'identifier': identifier.trim(),
        'password': password,
      }),
    );

    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Echec de connexion'));
    }

    final payload = Map<String, dynamic>.from(data['data'] as Map);
    final accessToken = (payload['accessToken'] ?? '').toString();
    final refreshToken = (payload['refreshToken'] ?? '').toString();
    final user = Map<String, dynamic>.from(payload['user'] as Map? ?? const {});
    if (accessToken.isEmpty || refreshToken.isEmpty) {
      throw Exception('Tokens manquants dans la reponse login');
    }

    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user,
    );
  }

  Future<AuthSession?> restoreSession() async {
    final accessToken = await _storage.read(key: _accessKey);
    final refreshToken = await _storage.read(key: _refreshKey);
    if (accessToken == null || refreshToken == null) return null;

    try {
      final me = await getMe(accessToken);
      return AuthSession(accessToken: accessToken, refreshToken: refreshToken, user: me);
    } catch (_) {
      final renewed = await refresh(refreshToken);
      final me = await getMe(renewed.accessToken);
      return AuthSession(
        accessToken: renewed.accessToken,
        refreshToken: renewed.refreshToken,
        user: me,
      );
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }

  Future<AuthSession> refresh(String refreshToken) async {
    final response = await _http.post(
      Uri.parse('$baseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Session expiree'));
    }

    final payload = Map<String, dynamic>.from(data['data'] as Map);
    final newAccess = (payload['accessToken'] ?? '').toString();
    final newRefresh = (payload['refreshToken'] ?? '').toString();
    if (newAccess.isEmpty || newRefresh.isEmpty) {
      throw Exception('Tokens manquants dans la reponse refresh');
    }
    await _storage.write(key: _accessKey, value: newAccess);
    await _storage.write(key: _refreshKey, value: newRefresh);

    return AuthSession(
      accessToken: newAccess,
      refreshToken: newRefresh,
      user: const {},
    );
  }

  Future<Map<String, dynamic>> getMe(String accessToken) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Impossible de recuperer le profil'));
    }
    return Map<String, dynamic>.from(data['data'] as Map? ?? const {});
  }

  Future<List<Map<String, dynamic>>> getFeed(String accessToken) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/feed?page=1&limit=10'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    final data = _decode(response);
    if (response.statusCode >= 400) {
      throw Exception(_extractErrorMessage(data, fallback: 'Impossible de charger le feed'));
    }

    final raw = data['data'] ?? data;
    List<dynamic> list = const [];
    if (raw is List) {
      list = raw;
    } else if (raw is Map<String, dynamic>) {
      if (raw['items'] is List) list = raw['items'] as List<dynamic>;
    }

    return list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .where((item) {
          final type = (item['type'] ?? 'video').toString();
          if (type != 'video' && item['video'] == null) return false;
          return true;
        })
        .map((item) {
          final video = (item['video'] is Map) ? Map<String, dynamic>.from(item['video']) : item;
          return video;
        })
        .toList();
  }

  Future<Map<String, dynamic>> toggleLike({
    required String accessToken,
    required String videoId,
  }) async {
    final response = await _http.post(
      Uri.parse('$baseUrl/videos/$videoId/like'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'type': 'like'}),
    );
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Like impossible'));
    }
    return Map<String, dynamic>.from(data['data'] as Map? ?? const {});
  }

  Future<Map<String, dynamic>> toggleFollow({
    required String accessToken,
    required String creatorId,
  }) async {
    final response = await _http.post(
      Uri.parse('$baseUrl/users/$creatorId/follow'),
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Follow impossible'));
    }
    return Map<String, dynamic>.from(data['data'] as Map? ?? const {});
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.body.trim().isEmpty) return {};
    final dynamic decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'data': decoded};
  }

  String _extractErrorMessage(Map<String, dynamic> data, {required String fallback}) {
    final error = data['error'];
    if (error is Map && error['message'] != null) return error['message'].toString();
    if (data['message'] != null) return data['message'].toString();
    return fallback;
  }
}
