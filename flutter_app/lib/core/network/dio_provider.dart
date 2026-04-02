import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:afriwonder_mobile/app/app_router.dart';

/// Client HTTP Dio aligné audit (Dio + Retrofit côté API) — base URL sans `/` final.
final dioProvider = Provider<Dio>((ref) {
  final base = kApiBaseUrl.replaceAll(RegExp(r'/+$'), '');
  final dio = Dio(
    BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      headers: {'Content-Type': 'application/json'},
    ),
  );
  return dio;
});
