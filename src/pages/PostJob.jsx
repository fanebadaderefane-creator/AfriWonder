import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from '../components/navigation/BottomNav';

export default function PostJob() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    category: 'tech',
    type: 'temps_plein',
    location: '',
    remote: false,
    salary_min: 0,
    salary_max: 0,
    experience_required: 'debutant',
    education_required: 'bac',
    skills: [],
    responsibilities: [],
    benefits: [],
    deadline: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/', { replace: true });
      }
    };
    getUser();
  }, [navigate]);

  const postJobMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous d\'abord');
        return;
      }
      const res = await api.jobs.create({
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        jobType: jobData.type,
        location: jobData.location,
        salaryMin: jobData.salary_min,
        salaryMax: jobData.salary_max,
        country: jobData.country,
        expiresAt: jobData.deadline ? new Date(jobData.deadline) : undefined,
        isPremium: jobData.is_premium,
        isUrgent: jobData.is_urgent,
        phone: jobData.phone,
      });
      if (res?.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
      return res;
    },
    onSuccess: () => {
      toast.success('Offre publiée !');
      setTimeout(() => { navigate('/Jobs'); }, 1500);
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  const addArrayField = (field) => {
    setJobData({
      ...jobData,
      [field]: [...(jobData[field] || []), '']
    });
  };

  const removeArrayField = (field, index) => {
    setJobData({
      ...jobData,
      [field]: jobData[field].filter((_, i) => i !== index)
    });
  };

  const updateArrayField = (field, index, value) => {
    const newArray = [...jobData[field]];
    newArray[index] = value;
    setJobData({ ...jobData, [field]: newArray });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Publier une offre</h1>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h2 className="font-bold">Informations basiques</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Titre du poste *</label>
            <Input
              placeholder="Ex: Développeur React Senior"
              value={jobData.title}
              onChange={(e) => setJobData({...jobData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <Textarea
              placeholder="Décrivez le poste..."
              value={jobData.description}
              onChange={(e) => setJobData({...jobData, description: e.target.value})}
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={jobData.category}
                onChange={(e) => setJobData({...jobData, category: e.target.value})}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="tech">Tech</option>
                <option value="commerce">Commerce</option>
                <option value="sante">Santé</option>
                <option value="education">Éducation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={jobData.type}
                onChange={(e) => setJobData({...jobData, type: e.target.value})}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="temps_plein">Temps plein</option>
                <option value="temps_partiel">Temps partiel</option>
                <option value="freelance">Freelance</option>
                <option value="stage">Stage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lieu</label>
            <Input
              placeholder="Ville ou pays"
              value={jobData.location}
              onChange={(e) => setJobData({...jobData, location: e.target.value})}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={jobData.remote}
              onChange={(e) => setJobData({...jobData, remote: e.target.checked})}
            />
            <span>Travail à distance</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Salaire min (FCFA)</label>
              <Input
                type="number"
                value={jobData.salary_min}
                onChange={(e) => setJobData({...jobData, salary_min: Number(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Salaire max (FCFA)</label>
              <Input
                type="number"
                value={jobData.salary_max}
                onChange={(e) => setJobData({...jobData, salary_max: Number(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date limite de candidature</label>
            <Input
              type="date"
              value={jobData.deadline}
              onChange={(e) => setJobData({...jobData, deadline: e.target.value})}
            />
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Compétences requises</h2>
            <Button
              onClick={() => addArrayField('skills')}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {jobData.skills.map((skill, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Compétence ${i + 1}`}
                  value={skill}
                  onChange={(e) => updateArrayField('skills', i, e.target.value)}
                  className="text-sm"
                />
                <button
                  onClick={() => removeArrayField('skills', i)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Responsibilities */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Responsabilités</h2>
            <Button
              onClick={() => addArrayField('responsibilities')}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {jobData.responsibilities.map((resp, i) => (
              <div key={i} className="flex gap-2">
                <Textarea
                  placeholder="Description de la responsabilité"
                  value={resp}
                  onChange={(e) => updateArrayField('responsibilities', i, e.target.value)}
                  className="text-sm h-16"
                />
                <button
                  onClick={() => removeArrayField('responsibilities', i)}
                  className="text-red-500 hover:text-red-700 h-fit mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Avantages</h2>
            <Button
              onClick={() => addArrayField('benefits')}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {jobData.benefits.map((benefit, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Avantage ${i + 1}`}
                  value={benefit}
                  onChange={(e) => updateArrayField('benefits', i, e.target.value)}
                  className="text-sm"
                />
                <button
                  onClick={() => removeArrayField('benefits', i)}
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
          onClick={() => postJobMutation.mutate()}
          disabled={postJobMutation.isPending || !jobData.title || !jobData.description}
          className="w-full bg-green-500 hover:bg-green-600 h-12"
        >
          {postJobMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Publier l'offre
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

