import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from 'framer-motion';
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function CreateCourse() {
  const [user, setUser] = useState(null);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: 'tech',
    level: 'debutant',
    language: 'francais',
    price: 0,
    duration_hours: 1,
    lessons: [],
    what_you_learn: [],
    certificate: false
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        window.location.href = '/';
      }
    };
    getUser();
  }, []);

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous d\'abord');
        return;
      }
      await api.entities.Course.create({
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level,
        language: courseData.language,
        price: courseData.price,
        duration_hours: courseData.duration_hours,
        lessons: courseData.lessons,
        what_you_learn: courseData.what_you_learn,
        certificate: courseData.certificate,
        instructor_id: user.id,
        instructor_name: user.full_name || user.email?.split('@')[0],
        instructor_avatar: user.profile_image,
        thumbnail: 'https://images.unsplash.com/photo-1516534775068-bb57314e0a49?w=400',
        is_published: false,
        enrolled_count: 0,
        rating: 0,
        reviews_count: 0
      });
    },
    onSuccess: () => {
      toast.success('Cours créé! Publiez-le à partir de votre profil.');
      setTimeout(() => {
        window.location.href = '/Courses';
      }, 1500);
    }
  });

  const addLesson = () => {
    setCourseData({
      ...courseData,
      lessons: [...courseData.lessons, {
        title: '',
        description: '',
        video_url: '',
        duration_minutes: 0,
        order: courseData.lessons.length
      }]
    });
  };

  const removeLesson = (index) => {
    setCourseData({
      ...courseData,
      lessons: courseData.lessons.filter((_, i) => i !== index)
    });
  };

  const updateLesson = (index, field, value) => {
    const newLessons = [...courseData.lessons];
    newLessons[index][field] = value;
    setCourseData({ ...courseData, lessons: newLessons });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Créer un cours</h1>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Informations basiques</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Titre du cours *</label>
            <Input
              placeholder="Ex: Développement Web Moderne"
              value={courseData.title}
              onChange={(e) => setCourseData({...courseData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <Textarea
              placeholder="Décrivez votre cours..."
              value={courseData.description}
              onChange={(e) => setCourseData({...courseData, description: e.target.value})}
              className="h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={courseData.category}
                onChange={(e) => setCourseData({...courseData, category: e.target.value})}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="business">Business</option>
                <option value="tech">Tech</option>
                <option value="langues">Langues</option>
                <option value="artisanat">Artisanat</option>
                <option value="sante">Santé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Niveau</label>
              <select
                value={courseData.level}
                onChange={(e) => setCourseData({...courseData, level: e.target.value})}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Prix (FCFA)</label>
              <Input
                type="number"
                placeholder="0 pour gratuit"
                value={courseData.price}
                onChange={(e) => setCourseData({...courseData, price: Number(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Durée (heures)</label>
              <Input
                type="number"
                value={courseData.duration_hours}
                onChange={(e) => setCourseData({...courseData, duration_hours: Number(e.target.value)})}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={courseData.certificate}
              onChange={(e) => setCourseData({...courseData, certificate: e.target.checked})}
            />
            <span>Certificat de fin de cours</span>
          </label>
        </div>

        {/* Lessons */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Leçons ({courseData.lessons.length})</h2>
            <Button
              onClick={addLesson}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {courseData.lessons.map((lesson, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-gray-50 rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <span className="font-medium text-sm">Leçon {i + 1}</span>
                  <button
                    onClick={() => removeLesson(i)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Input
                  placeholder="Titre de la leçon"
                  value={lesson.title}
                  onChange={(e) => updateLesson(i, 'title', e.target.value)}
                  className="text-sm"
                />

                <Input
                  placeholder="URL de la vidéo (YouTube, Vimeo...)"
                  value={lesson.video_url}
                  onChange={(e) => updateLesson(i, 'video_url', e.target.value)}
                  className="text-sm"
                />

                <Input
                  type="number"
                  placeholder="Durée en minutes"
                  value={lesson.duration_minutes}
                  onChange={(e) => updateLesson(i, 'duration_minutes', Number(e.target.value))}
                  className="text-sm"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* What you'll learn */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Ce que vous apprendrez</h2>
            <Button
              onClick={() => setCourseData({
                ...courseData,
                what_you_learn: [...courseData.what_you_learn, '']
              })}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {courseData.what_you_learn.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Objectif ${i + 1}`}
                  value={item}
                  onChange={(e) => {
                    const newItems = [...courseData.what_you_learn];
                    newItems[i] = e.target.value;
                    setCourseData({...courseData, what_you_learn: newItems});
                  }}
                  className="text-sm"
                />
                <button
                  onClick={() => setCourseData({
                    ...courseData,
                    what_you_learn: courseData.what_you_learn.filter((_, idx) => idx !== i)
                  })}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-_t border-gray-100 p-4">
        <Button
          onClick={() => createCourseMutation.mutate()}
          disabled={createCourseMutation.isPending || !courseData.title || !courseData.description}
          className="w-full bg-green-500 hover:bg-green-600 h-12"
        >
          {createCourseMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Créer le cours
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

