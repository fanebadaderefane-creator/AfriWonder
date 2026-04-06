class AppUser {
  final String id;
  final String email;
  final String fullName;
  final String? username;
  final String? avatarUrl;
  final String? bio;
  final int followersCount;
  final int followingCount;
  final bool isVerified;

  const AppUser({
    required this.id,
    required this.email,
    required this.fullName,
    this.username,
    this.avatarUrl,
    this.bio,
    this.followersCount = 0,
    this.followingCount = 0,
    this.isVerified = false,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'].toString(),
        email: j['email'] as String,
        fullName: j['full_name'] as String,
        username: j['username'] as String?,
        avatarUrl: j['avatar_url'] as String?,
        bio: j['bio'] as String?,
        followersCount: j['followers_count'] as int? ?? 0,
        followingCount: j['following_count'] as int? ?? 0,
        isVerified: j['is_verified'] as bool? ?? false,
      );
}
