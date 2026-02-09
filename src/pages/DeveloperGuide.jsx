import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Code, Database, Server, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/navigation/BottomNav';

export default function DeveloperGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Guide Développeur</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Backend API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="bg-gray-100 px-3 py-1 rounded">
                http://localhost:3000/api
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Routes Principales</h3>
              <ul className="space-y-1 text-sm">
                <li>• POST /auth/register</li>
                <li>• POST /auth/login</li>
                <li>• GET /videos</li>
                <li>• GET /products</li>
                <li>• POST /orders</li>
                <li>• GET /payments/wallet</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Base de Données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Le projet utilise Prisma ORM avec PostgreSQL (Supabase).
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold">Entités : 43</h3>
              <p className="text-sm text-gray-600">
                User, Video, Product, Order, Wallet, Transaction, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• <strong>Frontend</strong> : React 18 + Vite</p>
            <p>• <strong>Backend</strong> : Express + TypeScript</p>
            <p>• <strong>Database</strong> : Prisma + Supabase</p>
            <p>• <strong>Auth</strong> : JWT</p>
            <p>• <strong>UI</strong> : Tailwind + Radix UI</p>
            <p>• <strong>State</strong> : TanStack Query</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Démarrage Rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">Backend</h3>
              <code className="bg-gray-900 text-green-400 px-3 py-2 rounded block">
                cd backend && npm run dev
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Frontend</h3>
              <code className="bg-gray-900 text-green-400 px-3 py-2 rounded block">
                npm run dev
              </code>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Pour plus d'informations, consultez les fichiers README.md
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

