// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Award, Medal, ChevronRight, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/navigation/BottomNav";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function GamificationHub() {
  const navigate = useNavigate();
  const items = [
    { 
      route: "Achievements", 
      title: "Succès & Accomplissements", 
      desc: "Découvrez tous vos badges et accomplissements débloqués", 
      Icon: Trophy,
      color: "from-[#f97316] to-[#ea580c]",
      count: "6 badges débloqués"
    },
    { 
      route: "Leaderboard", 
      title: "Classement", 
      desc: "Consultez le classement des meilleurs créateurs et contributeurs", 
      Icon: Medal,
      color: "from-blue-400 to-indigo-500",
      count: "Top 10 visible"
    },
    { 
      route: "BadgesProfile", 
      title: "Mes Badges", 
      desc: "Votre collection personnelle de badges et récompenses", 
      Icon: Award,
      color: "from-purple-400 to-pink-500",
      count: "6 badges gagnés"
    },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 pb-20">
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gamification</h1>
            <p className="text-xs text-gray-500">Débloquez des badges et montez en niveau</p>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {items.map(({ route, title, desc, Icon, color, count }, index) => (
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-500/50" 
              onClick={() => navigate(createPageUrl(route))}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900">{title}</div>
                    <div className="text-xs font-normal text-[#f97316] mt-1">{count}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">{desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-[#f97316]/10 border-[#f97316]/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-[#f97316]">
                <Trophy className="w-5 h-5" />
                Comment ça marche ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>• Gagnez des points en utilisant la plateforme</p>
              <p>• Débloquez des badges en accomplissant des actions</p>
              <p>• Montez en niveau pour débloquer de nouveaux privilèges</p>
              <p>• Comparez-vous aux autres dans le classement</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
