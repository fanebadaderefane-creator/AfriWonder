import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, ShoppingBag, Wrench, Heart } from "lucide-react";
import BottomNav from "@/components/navigation/BottomNav";

export default function ProjectPresentation() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Présentation du projet</h1>
      </div>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              AfriWonder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>Plateforme tout-en-un : vidéo courte, live, marketplace, services, transport, food delivery, télémedecine, immobilier, billetterie, wallet, assurance, actualités, formations, emploi, civic et microcrédit.</p>
            <p>Architecture modulaire prête pour une forte croissance.</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {[{ icon: Video, label: "Vidéo & social" }, { icon: ShoppingBag, label: "Marketplace" }, { icon: Wrench, label: "Services" }].map(({ icon: Icon, label }) => (
            <Card key={label}>
              <CardContent className="pt-4 flex items-center gap-2">
                <Icon className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
