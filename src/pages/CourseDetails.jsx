import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Award, Download, CheckCircle, Heart, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function CourseDetailsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState(null);
  const [user, setUser] = useState(null);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [textOnlyMode, setTextOnlyMode] = useState(false);
  const [videoQuality, setVideoQuality] = useState(''); // '' | '240' | '720'
  const [lessonStreamUrl, setLessonStreamUrl] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCourseId(params.get('id'));
    
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {}
    };
    getUser();
  }, []);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.courses.getById(courseId),
    enabled: !!courseId
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', courseId, user?.id],
    queryFn: async () => {
      try {
        return await api.courses.getEnrollment(courseId);
      } catch (e) {
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: !!user?.id && !!courseId,
    retry: false
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const result = await api.courses.enroll(courseId, course?.price > 0 ? { phone: user?.phone } : {});
      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl;
        return result;
      }
      return result;
    },
    onSuccess: (data) => {
      if (!data?.paymentUrl) {
        queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, user?.id] });
        setIsEnrolled(true);
        toast.success('Inscription réussie!');
      }
    },
    onError: (e) => toast.error(e?.apiMessage || e?.message || 'Erreur inscription')
  });

  const markLessonCompleteMutation = useMutation({
    mutationFn: async () => {
      const lesson = course?.lessons?.[currentLessonIdx];
      if (!lesson?.id || !enrollment?.id) throw new Error('Lesson or enrollment missing');
      return api.courses.completeLesson(enrollment.id, lesson.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, user?.id] });
      toast.success('Leçon marquée comme complétée!');
    }
  });

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      return api.courses.addReview(courseId, rating, review);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, user?.id] });
      toast.success('Merci pour votre avis!');
      setShowRating(false);
    }
  });

  const wishlistAddMutation = useMutation({
    mutationFn: () => api.courses.addWishlist(courseId),
    onSuccess: () => toast.success('Ajouté à la wishlist'),
    onError: (e) => toast.error(e?.response?.data?.error?.message || 'Erreur')
  });

  const currentLesson = course?.lessons?.[currentLessonIdx];
  const progress = enrollment ? (enrollment.progress_percentage ?? enrollment.progress ?? 0) : 0;
  const isCompleted = enrollment?.completed ?? (progress >= 100);
  const lastLessonIdx = enrollment?.last_lesson_id != null && course?.lessons?.length
    ? course.lessons.findIndex(l => l.id === enrollment.last_lesson_id)
    : -1;
  const completedLessons = lastLessonIdx >= 0 ? lastLessonIdx + 1 : 0;
  const isLessonCompleted = (idx) => lastLessonIdx >= 0 && idx <= lastLessonIdx;
  const totalDuration = course?.lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;
  const hasCertificate = !!enrollment?.certificate_id;

  // URL de stream protégée (vérif enrollment) — évite exposition directe
  useEffect(() => {
    if (!enrollment?.id || !currentLesson?.id) {
      setLessonStreamUrl(null);
      return;
    }
    let cancelled = false;
    api.courses.getLessonStream(enrollment.id, currentLesson.id, videoQuality || undefined)
      .then((r) => { if (!cancelled && r?.url) setLessonStreamUrl(r.url); })
      .catch(() => { if (!cancelled) setLessonStreamUrl(null); });
    return () => { cancelled = true; };
  }, [enrollment?.id, currentLesson?.id, videoQuality]);

  if (!course) return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const videoSrc = lessonStreamUrl || currentLesson?.video_url;
  const handleDownloadLesson = () => {
    if (videoSrc) window.open(videoSrc, '_blank');
    else toast.error('Vidéo non disponible');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto p-4 safe-area-pb pb-20">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player / Mode texte */}
        <div className="lg:col-span-2 space-y-4">
          {!textOnlyMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {!isEnrolled && !enrollment ? (
                <div className="text-center text-white">
                  <Play className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Inscrivez-vous pour voir ce cours</p>
                </div>
              ) : videoSrc ? (
                <video src={videoSrc} controls autoPlay className="w-full h-full" controlsList="nodownload" />
              ) : currentLesson?.video_url ? (
                <video src={currentLesson.video_url} controls autoPlay className="w-full h-full" controlsList="nodownload" />
              ) : (
                <Play className="w-16 h-16 text-white opacity-50" />
              )}
            </motion.div>
          )}

          {enrollment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between flex-wrap gap-2">
                  <span>{currentLesson?.title}</span>
                  {isLessonCompleted(currentLessonIdx) && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{currentLesson?.description || 'Aucune description.'}</p>

                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    variant={textOnlyMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTextOnlyMode((v) => !v)}
                    className={textOnlyMode ? 'bg-orange-500' : ''}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Mode texte seulement
                  </Button>
                  {(videoSrc || currentLesson?.video_url) && (
                    <Button variant="outline" size="sm" onClick={handleDownloadLesson}>
                      <Download className="w-4 h-4 mr-1" />
                      Télécharger la leçon
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {currentLessonIdx > 0 && (
                    <Button onClick={() => setCurrentLessonIdx(currentLessonIdx - 1)} variant="outline">
                      ← Précédente
                    </Button>
                  )}
                  {!isLessonCompleted(currentLessonIdx) && (
                    <Button
                      onClick={() => markLessonCompleteMutation.mutate()}
                      disabled={markLessonCompleteMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ✓ Marquer comme complétée
                    </Button>
                  )}
                  {currentLessonIdx < course.lessons.length - 1 && (
                    <Button onClick={() => setCurrentLessonIdx(currentLessonIdx + 1)} className="bg-blue-500 hover:bg-blue-600">
                      Suivante →
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 h-fit sticky top-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">{course.creator?.full_name || course.creator?.username || course.instructor_name}</p>
                </div>
                {user && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => wishlistAddMutation.mutate()}
                    disabled={wishlistAddMutation.isPending}
                    title="Ajouter à la wishlist"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!enrollment && !isEnrolled && (
                <Button
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {course.price > 0 ? `Acheter - ${course.price.toLocaleString()} FCFA` : 'S\'inscrire gratuitement'}
                </Button>
              )}
              
              {(enrollment || isEnrolled) && (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold">Progression</span>
                      <span className="text-sm font-bold text-blue-600">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>📚 {completedLessons}/{course.lessons.length} leçons</p>
                    <p>⏱️ {totalDuration} minutes</p>
                  </div>

                  {isCompleted && !hasCertificate && (
                    <p className="text-xs text-gray-500">Certificat généré à la fin du cours.</p>
                  )}
                  {isCompleted && (
                    <Button onClick={() => setShowRating(true)} className="w-full bg-green-600 hover:bg-green-700">
                      <Award className="w-4 h-4 mr-2" />
                      Évaluer ce cours
                    </Button>
                  )}
                  {hasCertificate && (
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <Award className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-green-600">Certificat obtenu</p>
                      <Link to={createPageUrl('Certificates')} className="text-xs text-green-500 hover:underline flex items-center justify-center gap-1 mt-1">
                        <Download className="w-3 h-3" /> Voir mes certificats
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {enrollment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contenu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-96 overflow-y-auto">
                {course.lessons?.map((lesson, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentLessonIdx(idx)}
                    className={`w-full text-left p-2 rounded transition-colors text-sm ${
                      idx === currentLessonIdx ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLessonCompleted(idx) ? <span className="text-green-600">✓</span> : <span className="text-gray-400">○</span>}
                      <span className="flex-1">{lesson.title}</span>
                      <span className="text-xs text-gray-500">{lesson.duration_minutes}m</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRating && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-end z-50">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Évaluer ce cours</h3>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="text-4xl">
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Votre avis..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm h-20"
            />
            <div className="flex gap-2">
              <Button onClick={() => setShowRating(false)} variant="outline" className="flex-1">Annuler</Button>
              <Button
                onClick={() => submitRatingMutation.mutate()}
                disabled={submitRatingMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Envoyer l'avis
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

