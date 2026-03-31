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

  /// Aligné PWA Home « abonnements » : GET /videos puis filtre par créateurs suivis.
  Future<List<Map<String, dynamic>>> getFollowingFeedVideos({
    required String accessToken,
    required String userId,
    int page = 1,
    int limit = 25,
  }) async {
    final following = await getFollowingUsers(accessToken: accessToken, userId: userId);
    if (following.isEmpty) return [];

    final followingIds = following
        .map((u) => (u['id'] ?? '').toString())
        .where((id) => id.isNotEmpty)
        .toSet();

    final videos = await listVideos(accessToken: accessToken, page: page, limit: limit);
    return videos
        .where((v) => followingIds.contains((v['creator_id'] ?? '').toString()))
        .toList();
  }

  Future<List<Map<String, dynamic>>> getFollowingUsers({
    required String accessToken,
    required String userId,
    int page = 1,
    int limit = 100,
  }) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/users/$userId/following?page=$page&limit=$limit'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Impossible de charger les abonnements'));
    }
    final payload = data['data'];
    if (payload is! Map) return [];
    final raw = payload['following'];
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Future<List<Map<String, dynamic>>> listVideos({
    required String accessToken,
    int page = 1,
    int limit = 25,
  }) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/videos?page=$page&limit=$limit'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Impossible de charger les videos'));
    }
    final inner = data['data'];
    if (inner is Map && inner['videos'] is List) {
      final list = inner['videos'] as List<dynamic>;
      return list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return [];
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

  /// GET /api/search — recherche globale (auth optionnelle).
  Future<Map<String, dynamic>> searchGlobal({
    String? accessToken,
    required String q,
    String type = 'all',
    int page = 1,
    int limit = 20,
  }) async {
    final uri = Uri.parse('$baseUrl/search').replace(
      queryParameters: <String, String>{
        'q': q,
        'type': type,
        'page': '$page',
        'limit': '$limit',
      },
    );
    final headers = <String, String>{'Accept': 'application/json'};
    final t = accessToken?.trim();
    if (t != null && t.isNotEmpty) {
      headers['Authorization'] = 'Bearer $t';
    }
    final response = await _http.get(uri, headers: headers);
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Recherche impossible'));
    }
    return Map<String, dynamic>.from(data['data'] as Map? ?? const {});
  }

  /// GET /api/notifications
  Future<Map<String, dynamic>> getNotifications({
    required String accessToken,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/notifications?page=$page&limit=$limit'),
      headers: {'Authorization': 'Bearer $accessToken', 'Accept': 'application/json'},
    );
    final data = _decode(response);
    if (response.statusCode >= 400 || data['success'] != true) {
      throw Exception(_extractErrorMessage(data, fallback: 'Notifications indisponibles'));
    }
    return Map<String, dynamic>.from(data['data'] as Map? ?? const {});
  }

  Future<void> markNotificationRead({
    required String accessToken,
    required String notificationId,
  }) async {
    final response = await _http.put(
      Uri.parse('$baseUrl/notifications/$notificationId/read'),
      headers: {'Authorization': 'Bearer $accessToken', 'Accept': 'application/json'},
    );
    if (response.statusCode >= 400) {
      final data = _decode(response);
      throw Exception(_extractErrorMessage(data, fallback: 'Marquage lu impossible'));
    }
  }

  Future<void> markAllNotificationsRead({required String accessToken}) async {
    final response = await _http.put(
      Uri.parse('$baseUrl/notifications/read-all'),
      headers: {'Authorization': 'Bearer $accessToken', 'Accept': 'application/json'},
    );
    if (response.statusCode >= 400) {
      final data = _decode(response);
      throw Exception(_extractErrorMessage(data, fallback: 'Operation impossible'));
    }
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
