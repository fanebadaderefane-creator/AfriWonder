import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RevenueSharing({ videoId, onSetup }) {
  const [collaborators, setCollaborators] = useState([]);
  const [newCollaborator, setNewCollaborator] = useState({ name: "", email: "", percentage: 0 });
  const [saving, setSaving] = useState(false);

  const totalPercentage = collaborators.reduce((sum, c) => sum + c.percentage, 0);

  const addCollaborator = () => {
    if (!newCollaborator.name || !newCollaborator.email || newCollaborator.percentage === 0) {
      toast.error("Remplissez tous les champs");
      return;
    }

    if (totalPercentage + newCollaborator.percentage > 100) {
      toast.error("Le total ne peut pas dépasser 100%");
      return;
    }

    setCollaborators([
      ...collaborators,
      {
        id: Date.now(),
        name: newCollaborator.name,
        email: newCollaborator.email,
        percentage: newCollaborator.percentage
      }
    ]);

    setNewCollaborator({ name: "", email: "", percentage: 0 });
  };

  const removeCollaborator = (id) => {
    setCollaborators(collaborators.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (collaborators.length === 0) {
      toast.error("Ajoutez au moins un collaborateur");
      return;
    }

    setSaving(true);
    try {
      await onSetup(videoId, collaborators);
      toast.success("Partage de revenus configuré");
    } catch (_error) {
      toast.error("Erreur lors de la configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fractionnement des revenus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Collaborator Form */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900">Ajouter un collaborateur</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Nom"
              value={newCollaborator.name}
              onChange={(e) => setNewCollaborator({ ...newCollaborator, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={newCollaborator.email}
              onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Pourcentage (%)"
                type="number"
                min="0"
                max="100"
                value={newCollaborator.percentage}
                onChange={(e) => setNewCollaborator({ ...newCollaborator, percentage: parseInt(e.target.value) || 0 })}
              />
            </div>
            <Button onClick={addCollaborator} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Collaborators List */}
        {collaborators.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Collaborateurs configurés</h3>
            {collaborators.map((collab, _index) => (
              <motion.div
                key={collab.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{collab.name}</p>
                  <p className="text-xs text-gray-500">{collab.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-800">
                    {collab.percentage}%
                  </Badge>
                  <button
                    onClick={() => removeCollaborator(collab.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {collaborators.length > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">Répartition totale</span>
              <span className={totalPercentage === 100 ? "text-green-600" : "text-gray-600"}>
                {totalPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  totalPercentage === 100 ? "bg-green-500" : "bg-orange-500"
                }`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Save Button */}
        {collaborators.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={saving || totalPercentage !== 100}
            className="w-full"
          >
            {saving ? "Configuration..." : "Configurer le partage"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}