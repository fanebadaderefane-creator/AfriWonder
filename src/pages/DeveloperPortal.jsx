import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Code, Key } from "lucide-react";
import BottomNav from "@/components/navigation/BottomNav";

export default function DeveloperPortal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Portail Développeur</h1>
      </div>
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate("/DeveloperGuide")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5" />
              Guide développeur
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-gray-600">
            Documentation API, backend et bonnes pratiques.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code className="w-5 h-5" />
              API & Intégrations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-gray-600">
            Endpoints REST, webhooks et clés API (voir guide).
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
