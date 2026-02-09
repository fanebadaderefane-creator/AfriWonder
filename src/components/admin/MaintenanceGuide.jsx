import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function MaintenanceGuide() {
  const tasks = {
    before: [
      { title: 'Tester chaque flux (signup → order → live)', days: '3-5j', done: false },
      { title: 'Sécurité: changer clés API Stripe', days: '1j', done: false },
      { title: 'HTTPS + domaine custom activé', days: '1j', done: false },
      { title: 'Tester uploads + permissions', days: '1j', done: false }
    ],
    daily: [
      { title: 'Vérifier AdminDashboard (5 min)', severity: 'high' },
      { title: 'Traiter modérations pendantes', severity: 'high' },
      { title: 'Vérifier les disputes/retours', severity: 'medium' }
    ],
    weekly: [
      { title: 'Analytics + performances', severity: 'medium' },
      { title: 'Vérifier paiements Stripe', severity: 'high' },
      { title: 'Backup données critiques', severity: 'high' }
    ],
    emergencies: [
      { signal: 'Utilisateurs ne peuvent pas s\'inscrire', action: 'Vérifier Auth settings' },
      { signal: 'Paiements échouent', action: 'Vérifier Stripe Dashboard' },
      { signal: 'Chat/Lives down', action: 'Tester BD, puis mettre offline' },
      { signal: 'Spam massif', action: 'Bannir utilisateurs, alertes système' }
    ]
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Before Launch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Avant le 26 février (25 jours)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.before.map((task, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="flex-1">{task.title}</span>
              <Badge variant="outline" className="text-xs">{task.days}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Routine quotidienne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.daily.map((task, i) => (
            <div key={i} className={`p-2 rounded flex items-center gap-2 ${
              task.severity === 'high' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${
                task.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <span className="text-xs">{task.title}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weekly Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Routine hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.weekly.map((task, i) => (
            <div key={i} className={`p-2 rounded flex items-center gap-2 ${
              task.severity === 'high' ? 'bg-red-50' : 'bg-blue-50'
            }`}>
              <AlertCircle className={`w-4 h-4 ${
                task.severity === 'high' ? 'text-red-500' : 'text-blue-500'
              }`} />
              <span className="text-xs">{task.title}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Emergencies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-red-600">🆘 Quand ça va mal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.emergencies.map((item, i) => (
            <div key={i} className="p-2 bg-red-50 rounded border-l-4 border-red-500">
              <p className="text-xs font-semibold text-red-900">{item.signal}</p>
              <p className="text-xs text-red-700">→ {item.action}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">À monitorer chaque jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <p>✅ Aucune alerte rouge au dashboard?</p>
          <p>📈 Utilisateurs/Commandes en hausse?</p>
          <p>🚩 Signalements à traiter?</p>
          <p>🔧 Base de données opérationnelle?</p>
          <p>💳 Paiements Stripe OK?</p>
        </CardContent>
      </Card>

      {/* Priority */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-base">🎯 Priorités (par ordre)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs font-medium">
          <p>1️⃣ Sécurité (bans, signalements, vérifs)</p>
          <p>2️⃣ Paiements (bugs Stripe, disputes)</p>
          <p>3️⃣ Modération (spam, harcèlement)</p>
          <p>4️⃣ Features nouvelles (= plus tard)</p>
        </CardContent>
      </Card>
    </div>
  );
}