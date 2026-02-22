import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Complété", className: "bg-green-100 text-green-800" },
  failed: { label: "Échoué", className: "bg-red-100 text-red-800" },
  refunded: { label: "Remboursé", className: "bg-gray-100 text-gray-800" },
};
const METHOD_LABELS = { orange_money: "Orange Money", moov_money: "Moov Money", bank_card: "Carte", cash: "Espèces" };
const TYPE_LABELS = { subscription: "Abonnement", commission: "Commission", ticket: "Ticket", crowdfunding: "Crowdfunding" };

export default function PaymentsTable({ payments }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const filtered = payments.filter(p => {
    const matchSearch = !search || p.user_email?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (id, status) => {
    await api.admin.updatePayment(id, { status });
    queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    toast.success("Statut mis à jour");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Aucun paiement trouvé</div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white rounded-xl border hover:shadow-sm transition-all">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{p.user_email}</p>
                  <Badge className={STATUS_CONFIG[p.status]?.className || "bg-gray-100"}>{STATUS_CONFIG[p.status]?.label || p.status}</Badge>
                  {p.payment_type && <Badge variant="outline" className="text-xs">{TYPE_LABELS[p.payment_type] || p.payment_type}</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{p.amount?.toLocaleString()} FCFA</span>
                  {p.payment_method && <span>{METHOD_LABELS[p.payment_method] || p.payment_method}</span>}
                  {p.module && <span>{p.module}</span>}
                  {p.description && <span className="truncate max-w-xs">{p.description}</span>}
                  <span>{new Date(p.created_date).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
              {p.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(p.id, "completed")} className="rounded-lg bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, "failed")} className="rounded-lg text-red-600">
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeter
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
