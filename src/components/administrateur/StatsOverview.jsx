import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, Briefcase, Calendar, Car, UtensilsCrossed, Stethoscope,
  Building2, Landmark, Newspaper, CreditCard, UserCheck, GraduationCap,
  TrendingUp, AlertCircle
} from "lucide-react";

export default function StatsOverview({ data }) {
  const {
    allUsers, allProviders, events, transport, restaurants,
    healthProviders, properties, jobs, formations, news,
    crowdfunding, microcredit, insurance, pendingProviders,
    payments
  } = data;

  const totalRevenue = payments.filter(p => p.status === "completed").reduce((s, p) => s + (p.amount || 0), 0);

  const mainStats = [
    { label: "Utilisateurs", value: allUsers.length, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Prestataires", value: allProviders.length, icon: Briefcase, color: "text-green-600 bg-green-50" },
    { label: "En attente", value: pendingProviders, icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
    { label: "Revenus (FCFA)", value: totalRevenue.toLocaleString(), icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  ];

  const moduleStats = [
    { label: "Événements", value: events.length, icon: Calendar, color: "bg-purple-100 text-purple-700" },
    { label: "Chauffeurs", value: transport.length, icon: Car, color: "bg-blue-100 text-blue-700" },
    { label: "Restaurants", value: restaurants.length, icon: UtensilsCrossed, color: "bg-orange-100 text-orange-700" },
    { label: "Santé", value: healthProviders.length, icon: Stethoscope, color: "bg-teal-100 text-teal-700" },
    { label: "Immobilier", value: properties.length, icon: Building2, color: "bg-slate-100 text-slate-700" },
    { label: "Emplois", value: jobs.length, icon: Briefcase, color: "bg-indigo-100 text-indigo-700" },
    { label: "Formations", value: formations.length, icon: GraduationCap, color: "bg-emerald-100 text-emerald-700" },
    { label: "Articles", value: news.length, icon: Newspaper, color: "bg-gray-100 text-gray-700" },
    { label: "Crowdfunding", value: crowdfunding.length, icon: Users, color: "bg-rose-100 text-rose-700" },
    { label: "Microcrédit", value: microcredit.length, icon: CreditCard, color: "bg-violet-100 text-violet-700" },
    { label: "Assurances", value: insurance.length, icon: Landmark, color: "bg-sky-100 text-sky-700" },
    { label: "Paiements", value: payments.length, icon: TrendingUp, color: "bg-green-100 text-green-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mainStats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Statistiques par module</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {moduleStats.map((s, i) => (
            <div key={i} className={`rounded-2xl p-4 ${s.color} text-center`}>
              <s.icon className="w-5 h-5 mx-auto mb-1.5" />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by payment method */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenus par méthode de paiement</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["orange_money", "moov_money", "bank_card", "cash"].map(method => {
              const methodPayments = payments.filter(p => p.payment_method === method && p.status === "completed");
              const total = methodPayments.reduce((s, p) => s + (p.amount || 0), 0);
              const labels = { orange_money: "Orange Money", moov_money: "Moov Money", bank_card: "Carte bancaire", cash: "Espèces" };
              const colors = { orange_money: "bg-orange-50 border-orange-200", moov_money: "bg-blue-50 border-blue-200", bank_card: "bg-green-50 border-green-200", cash: "bg-gray-50 border-gray-200" };
              return (
                <div key={method} className={`rounded-xl border p-4 ${colors[method]}`}>
                  <p className="text-xs text-muted-foreground">{labels[method]}</p>
                  <p className="text-lg font-bold mt-1">{total.toLocaleString()} FCFA</p>
                  <p className="text-xs text-muted-foreground">{methodPayments.length} transactions</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
