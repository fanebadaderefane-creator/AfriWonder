class Video {
  final String id;
  final String videoUrl;
  final String? thumbnailUrl;
  final String? title;
  final String? description;
  final String creatorId;
  final String? locationLabel;
  final String? musicTitle;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final int viewsCount;
  final bool isLiked;
  final VideoUser author;

  const Video({
    required this.id,
    required this.videoUrl,
    this.thumbnailUrl,
    this.title,
    this.description,
    this.creatorId = '',
    this.locationLabel,
    this.musicTitle,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.viewsCount = 0,
    this.isLiked = false,
    required this.author,
  });

  factory Video.fromJson(Map<String, dynamic> j) {
    final userRaw = j['user'];
    Map<String, dynamic> userMap;
    if (userRaw is Map<String, dynamic>) {
      userMap = userRaw;
    } else {
      final cid = j['creator_id']?.toString() ?? '';
      final uname = (j['username'] as String?)?.trim();
      final cname = (j['creator_name'] as String?)?.trim();
      userMap = {
        'id': cid,
        'username': (uname != null && uname.isNotEmpty)
            ? uname
            : (cname != null && cname.isNotEmpty)
                ? cname.replaceAll(RegExp(r'\s+'), '').toLowerCase()
                : '',
        'avatar_url': (j['creator_avatar'] ?? j['profile_image']) as String?,
        'is_following': j['is_following'] as bool? ?? false,
      };
    }

    int readInt(dynamic a, dynamic b) {
      if (a is int) return a;
      if (a is num) return a.round();
      if (b is int) return b;
      if (b is num) return b.round();
      return 0;
    }

    return Video(
      id: j['id'].toString(),
      videoUrl: (j['video_url'] ??
          j['playback_url'] ??
          j['hls_url'] ??
          j['stream_url'] ??
          '') as String,
      thumbnailUrl: j['thumbnail_url'] as String?,
      title: j['title'] as String?,
      description: j['description'] as String?,
      creatorId: (j['creator_id'] ?? userMap['id'] ?? '').toString(),
      locationLabel: (j['location_label'] ??
              j['location'] ??
              j['region'] ??
              j['creator_location'])
          ?.toString(),
      musicTitle:
          (j['music_title'] ?? j['audio_title'] ?? j['soundtrack'])?.toString(),
      likesCount: readInt(j['likes_count'], j['likes']),
      commentsCount: readInt(j['comments_count'], null),
      sharesCount: readInt(j['shares_count'], j['shares']),
      viewsCount: readInt(j['views_count'], j['views']),
      isLiked: j['is_liked'] as bool? ?? false,
      author: VideoUser.fromJson(userMap),
    );
  }
}

class VideoUser {
  final String id;
  final String username;
  final String? avatarUrl;
  final bool isFollowing;

  const VideoUser({
    required this.id,
    required this.username,
    this.avatarUrl,
    this.isFollowing = false,
  });

  factory VideoUser.fromJson(Map<String, dynamic> j) => VideoUser(
        id: j['id']?.toString() ?? '',
        username: j['username'] as String? ?? '',
        avatarUrl: j['avatar_url'] as String?,
        isFollowing: j['is_following'] as bool? ?? false,
      );
}
