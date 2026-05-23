import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Trophy, Users, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ChallengesPage() {
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const queryClient = useQueryClient();

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => api.entities.Challenge.list('-start_date')
  });

  const { data: userChallenges } = useQuery({
    queryKey: ['user-challenges'],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.Contribution.filter({ contributor_id: user.id });
    }
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId) => {
      const user = await api.auth.me();
      const _challenge = challenges.find(c => c.id === challengeId);

      await api.entities.Contribution.create({
        challenge_id: challengeId,
        contributor_id: user.id,
        contributor_name: user.full_name,
        status: 'active',
        progress: 0
      });

      return challengeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      toast.success('Défi rejoint!');
    }
  });

  const activeChallenges = challenges?.filter(c =>
    new Date(c.start_date) <= new Date() &&
    new Date(c.end_date) >= new Date()
  ) || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto p-4 safe-area-pb"
    >
      <h1 className="text-3xl font-bold mb-8">Défis</h1>

      {selectedChallenge ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <Button
            onClick={() => setSelectedChallenge(null)}
            variant="outline"
          >
            ← Retour
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedChallenge.title}</CardTitle>
                  <p className="text-gray-600 mt-1">{selectedChallenge.description}</p>
                </div>
                <Badge className="bg-orange-100 text-orange-800">
                  {selectedChallenge.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Participants</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedChallenge.participants || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Récompense</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{selectedChallenge.reward_points} pts
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Fin</p>
                  <p className="text-sm font-bold">
                    {new Date(selectedChallenge.end_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-semibold mb-2">Règles du défi</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  {selectedChallenge.rules?.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => joinChallengeMutation.mutate(selectedChallenge.id)}
                className="w-full bg-orange-500 hover:bg-orange-600"
                size="lg"
              >
                <Zap className="w-4 h-4 mr-2" />
                Participer au défi
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeChallenges.map(challenge => {
            const isParticipating = userChallenges?.some(c => c.challenge_id === challenge.id);
            const daysLeft = Math.ceil(
              (new Date(challenge.end_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            return (
              <motion.div
                key={challenge.id}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedChallenge(challenge)}
                className="cursor-pointer"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <div className="h-24 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 relative">
                    <Badge className="absolute top-3 left-3 bg-white text-orange-600">
                      <Zap className="w-3 h-3 mr-1 inline" />
                      {challenge.difficulty}
                    </Badge>
                    <Badge className="absolute top-3 right-3 bg-white/90">
                      {daysLeft}j restants
                    </Badge>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {challenge.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progression</span>
                        <span className="font-bold text-orange-600">
                          {Math.floor(Math.random() * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.random() * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        {challenge.participants || 0} participants
                      </span>
                      <span className="flex items-center gap-1 text-green-600 font-bold">
                        <Trophy className="w-4 h-4" />
                        +{challenge.reward_points} pts
                      </span>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        joinChallengeMutation.mutate(challenge.id);
                      }}
                      disabled={isParticipating}
                      className="w-full"
                      variant={isParticipating ? 'outline' : 'default'}
                    >
                      {isParticipating ? 'En cours' : 'Rejoindre'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

