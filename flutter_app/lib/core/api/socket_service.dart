import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../storage/secure_storage.dart';

class SocketService {
  static io.Socket? _socket;
  static String? _joinedUserId;

  static io.Socket get socket {
    assert(_socket != null, 'SocketService.connect() must be called first');
    return _socket!;
  }

  static Future<void> connect() async {
    final url = dotenv.env['SOCKET_URL'] ?? 'https://api.afriwonder.com';

    _socket = io.io(
      url,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) async {
      _log('connected');
      await syncSession();
    });
    _socket!.onDisconnect((_) => _log('disconnected'));
    _socket!.onError((e) => _log('error: $e'));
  }

  static Future<void> syncSession() async {
    final socket = _socket;
    if (socket == null || !socket.connected) return;

    final userId = await SecureStorage.getUserId();
    if (_joinedUserId != null && _joinedUserId != userId) {
      socket.emit('user:leave', _joinedUserId);
      _joinedUserId = null;
    }

    if (userId != null && userId.isNotEmpty) {
      socket.emit('user:join', userId);
      _joinedUserId = userId;
      return;
    }
  }

  static void disconnect() {
    if (_joinedUserId != null) {
      _socket?.emit('user:leave', _joinedUserId);
      _joinedUserId = null;
    }
    _socket?.disconnect();
    _socket = null;
  }

  static void emit(String event, [dynamic data]) => _socket?.emit(event, data);

  static void on(String event, void Function(dynamic) handler) =>
      _socket?.on(event, handler);

  static void off(String event) => _socket?.off(event);

  static void _log(String msg) =>
      // ignore: avoid_print
      print('[SocketService] $msg');
}
