import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Medal, ChevronRight } from "lucide-react";
import BottomNav from "@/components/navigation/BottomNav";

export default function GamificationHub() {
  const navigate = useNavigate();
  const items = [
    { route: "Achievements", title: "Succès", desc: "Vos succès.", Icon: Trophy },
    { route: "Leaderboard", title: "Classement", desc: "Classement créateurs.", Icon: Medal },
    { route: "BadgesProfile", title: "Badges", desc: "Badges et niveaux.", Icon: Award },
  ];
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3">
        <h1 className="text-lg font-bold">Gamification</h1>
      </div>
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {items.map(({ route, title, desc, Icon }) => (
          <Card key={route} className="cursor-pointer" onClick={() => navigate("/" + route)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <Icon className="w-6 h-6 text-amber-500" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex justify-between">
              <p className="text-sm text-gray-600">{desc}</p>
              <ChevronRight className="w-5 h-5" />
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
