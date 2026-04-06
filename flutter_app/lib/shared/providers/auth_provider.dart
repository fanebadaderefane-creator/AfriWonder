import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/socket_service.dart';
import '../../core/auth/auth_service.dart';
import '../../core/push/push_service.dart';
import '../models/user.dart';

class AuthState {
  final AppUser? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isAuthenticated => user != null;

  AuthState copyWith({AppUser? user, bool? isLoading, String? error}) =>
      AuthState(
        user: user ?? this.user,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AuthNotifier extends AsyncNotifier<AppUser?> {
  Future<void> _syncAuthenticatedServices() async {
    await SocketService.syncSession();
    await PushService.syncDeviceToken();
  }

  @override
  Future<AppUser?> build() async {
    final data = await AuthService.me();
    if (data == null) {
      await SocketService.syncSession();
      return null;
    }
    await _syncAuthenticatedServices();
    return AppUser.fromJson(data);
  }

  Future<void> login(
      {required String identifier, required String password}) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final data =
          await AuthService.login(identifier: identifier, password: password);
      await _syncAuthenticatedServices();
      return AppUser.fromJson(data);
    });
  }

  Future<void> register({
    required String fullName,
    required String username,
    required String email,
    required String password,
    String? phone,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final data = await AuthService.register(
        fullName: fullName,
        username: username,
        email: email,
        password: password,
        phone: phone,
      );
      await _syncAuthenticatedServices();
      return AppUser.fromJson(data);
    });
  }

  Future<void> logout() async {
    await AuthService.logout();
    await SocketService.syncSession();
    state = const AsyncValue.data(null);
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AppUser?>(
  AuthNotifier.new,
);
