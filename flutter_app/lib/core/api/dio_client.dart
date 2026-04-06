import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static late final Dio dio;

  static void init() {
    final baseUrl = dotenv.env['API_URL'] ?? 'https://api.afriwonder.com/api';

    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.addAll([
      _AuthInterceptor(),
      LogInterceptor(requestBody: false, responseBody: false),
    ]);
  }
}

class _AuthInterceptor extends Interceptor {
  bool _isRefreshing = false;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await SecureStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      final refreshed = await _refreshToken();
      _isRefreshing = false;

      if (refreshed) {
        final newToken = await SecureStorage.getAccessToken();
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final response = await ApiClient.dio.fetch(err.requestOptions);
        return handler.resolve(response);
      }

      // Refresh échoué — vider les tokens
      await SecureStorage.clearAll();
    }
    handler.next(err);
  }

  Future<bool> _refreshToken() async {
    try {
      final refresh = await SecureStorage.getRefreshToken();
      if (refresh == null) return false;

      final res = await Dio().post(
        '${ApiClient.dio.options.baseUrl}/auth/refresh',
        data: {'refreshToken': refresh},
      );
      final data = res.data['data'];
      await SecureStorage.saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
