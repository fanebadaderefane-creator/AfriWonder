import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const SHEET_HEIGHT_RATIO = 0.7;
const COMMENT_SAVE_KEY = 'afw_saved_comments';

function getVideoUrlFromId(videoId) {
  if (!videoId) return '';
  const base =
    process.env.EXPO_PUBLIC_APP_URL ||
    process.env.EXPO_PUBLIC_WEB_URL ||
    'https://afriwonder.com';
  return `${String(base).replace(/\/$/, '')}/VideoView?id=${videoId}`;
}

function getAuthorName(item) {
  const u = item.user;
  if (u) return u.full_name || u.fullName || u.username || 'Utilisateur';
  return item.user_name ?? item.author_name ?? 'Utilisateur';
}

function getCommentContent(item) {
  return item.content || item.text || '';
}

export default function CommentsScreen({ route, navigation }) {
  const { videoId, title } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [actionComment, setActionComment] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [savedComments, setSavedComments] = useState(new Set());

  const sheetHeight = Dimensions.get('window').height * SHEET_HEIGHT_RATIO;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    SecureStore.getItemAsync(COMMENT_SAVE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setSavedComments(new Set(arr.map((id) => String(id))));
          }
        } catch (_) {
          // ignore
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!videoId) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await api.videos.getComments(videoId, { page: 1, limit: 50 });
        const list = res?.comments ?? (Array.isArray(res) ? res : []);
        if (mounted) setComments(list);
      } catch {
        if (mounted) setComments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [videoId]);

  const handleSubmit = async () => {
    const content = input.trim();
    if (!content || submitting || !videoId) return;
    setSubmitting(true);
    try {
      if (editingCommentId) {
        const updated = await api.videos.updateComment(editingCommentId, content);
        const updatedId = String(updated?.id ?? editingCommentId);
        setComments((prev) =>
          prev.map((c) =>
            String(c.id) === updatedId
              ? { ...c, ...updated, content: updated?.content ?? content }
              : c
          )
        );
        setEditingCommentId(null);
      } else {
        const created = await api.videos.comment(videoId, content, null);
        setComments((prev) => [created, ...prev]);
      }
      setInput('');
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = (comment) => {
    if (!comment || !user?.id) return false;
    const authorId =
      comment.user?.id ||
      comment.user_id ||
      comment.userId ||
      comment.author_id ||
      comment.authorId;
    return authorId && String(authorId) === String(user.id);
  };

  const isSavedComment = (comment) => {
    if (!comment?.id) return false;
    return savedComments.has(String(comment.id));
  };

  const openActionsForComment = (comment) => {
    setActionComment(comment);
    setShowActions(true);
  };

  const closeActions = () => {
    setShowActions(false);
    setActionComment(null);
  };

  const handleEditComment = () => {
    if (!actionComment) return;
    if (!isOwner(actionComment)) {
      Alert.alert('Action non autorisée', 'Vous ne pouvez modifier que vos propres commentaires.');
      return;
    }
    setInput(getCommentContent(actionComment));
    setEditingCommentId(String(actionComment.id));
    closeActions();
  };

  const handleDeleteComment = async () => {
    if (!actionComment?.id) return;
    if (!isOwner(actionComment)) {
      Alert.alert('Action non autorisée', 'Vous ne pouvez supprimer que vos propres commentaires.');
      return;
    }
    const commentId = String(actionComment.id);
    try {
      await api.videos.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => String(c.id) !== commentId));
      closeActions();
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer le commentaire pour le moment.');
    }
  };

  const handleShareComment = async () => {
    if (!actionComment) return;
    const content = getCommentContent(actionComment);
    const url = getVideoUrlFromId(videoId);
    try {
      await Share.share({
        message: content ? `${content}\n\n${url}` : url,
        title: 'Commentaire AfriWonder',
      });
      closeActions();
    } catch {
      Alert.alert('Erreur', 'Impossible de partager ce commentaire.');
    }
  };

  const handleToggleSaveComment = async () => {
    if (!actionComment?.id) return;
    const id = String(actionComment.id);
    setSavedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      SecureStore.setItemAsync(COMMENT_SAVE_KEY, JSON.stringify(Array.from(next))).catch(
        () => {}
      );
      return next;
    });
    closeActions();
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.overlay} onPress={() => navigation.goBack()} />
      <View style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {comments.length ? `${comments.length} commentaire${comments.length > 1 ? 's' : ''}` : 'Commentaires'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {title ? (
          <Text style={styles.videoTitle} numberOfLines={2}>
            {title}
          </Text>
        ) : null}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {getAuthorName(item)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={styles.commentAuthor}>
                          {getAuthorName(item)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => openActionsForComment(item)}
                          style={styles.commentMenuButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="ellipsis-vertical"
                            size={16}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.commentText}>{getCommentContent(item)}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>Soyez le premier à commenter !</Text>
                  </View>
                }
                contentContainerStyle={styles.commentsList}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>

          {editingCommentId && (
            <View style={styles.editBanner}>
              <Text style={styles.editBannerText}>Modification du commentaire</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingCommentId(null);
                  setInput('');
                }}
                style={styles.editBannerClose}
              >
                <Ionicons name="close" size={14} color="#4B5563" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ajouter un commentaire…"
              placeholderTextColor="#6B7280"
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.sendButton}
              activeOpacity={0.8}
              disabled={submitting || !input.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={submitting || !input.trim() ? '#9CA3AF' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
      {actionComment && showActions && (
        <View style={styles.actionsRoot}>
          <Pressable style={styles.actionsOverlay} onPress={closeActions} />
          <View
            style={[
              styles.actionsSheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Text style={styles.actionsTitle}>Ajouter un commentaire</Text>
            <TouchableOpacity
              style={styles.actionsRow}
              onPress={handleEditComment}
              activeOpacity={0.7}
            >
              <View style={styles.actionsIconCircle}>
                <Ionicons name="pencil" size={18} color="#111827" />
              </View>
              <Text style={styles.actionsLabel}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsRow}
              onPress={handleShareComment}
              activeOpacity={0.7}
            >
              <View style={styles.actionsIconCircle}>
                <Ionicons name="share-social-outline" size={18} color="#111827" />
              </View>
              <Text style={styles.actionsLabel}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsRow}
              onPress={handleDeleteComment}
              activeOpacity={0.7}
            >
              <View style={styles.actionsIconCircle}>
                <Ionicons name="trash-outline" size={18} color="#b91c1c" />
              </View>
              <Text style={[styles.actionsLabel, styles.actionsLabelDanger]}>
                Supprimer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsRow}
              onPress={handleToggleSaveComment}
              activeOpacity={0.7}
            >
              <View style={styles.actionsIconCircle}>
                <Ionicons
                  name={isSavedComment(actionComment) ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color="#111827"
                />
              </View>
              <Text style={styles.actionsLabel}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  sheet: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    color: '#4B5563',
    fontSize: 13,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  commentsList: {
    paddingBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  commentBody: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  commentMenuButton: {
    paddingLeft: 8,
  },
  commentText: {
    color: '#374151',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    color: '#111827',
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D5DB',
  },
  editBannerText: {
    fontSize: 12,
    color: '#374151',
  },
  editBannerClose: {
    padding: 4,
  },
  actionsRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  actionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  actionsSheet: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionsLabel: {
    fontSize: 15,
    color: '#111827',
  },
  actionsLabelDanger: {
    color: '#b91c1c',
  },
});
