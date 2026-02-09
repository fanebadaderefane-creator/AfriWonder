import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from "sonner";

export default function ProductDescriptionGenerator({ 
  productName, 
  category, 
  attributes = {},
  onGenerated 
}) {
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState('');

  const generateDescription = async () => {
    if (!productName) {
      toast.error('Entrez un nom de produit');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Génère une description de produit professionnelle et attrayante pour un marketplace africain.

Produit: ${productName}
Catégorie: ${category || 'non spécifiée'}
Attributs: ${Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}

Exigences:
- Description en français
- 3-4 paragraphes
- Met en avant les bénéfices et caractéristiques
- Ton professionnel mais accessible
- Adapté au contexte africain
- Pas de placeholder ni emoji`;

      const result = await api.integrations.Core.InvokeLLM({
        prompt
      });

      setDescription(result);
      toast.success('Description générée !');
    } catch (_error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Génération IA
        </h3>
        <Button
          onClick={generateDescription}
          disabled={generating || !productName}
          size="sm"
          variant="outline"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Générer
            </>
          )}
        </Button>
      </div>

      {description && (
        <div className="space-y-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                onGenerated(description);
                toast.success('Description appliquée');
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Utiliser cette description
            </Button>
            <Button
              onClick={generateDescription}
              variant="outline"
              disabled={generating}
            >
              Régénérer
            </Button>
          </div>
        </div>
      )}

      {!description && (
        <p className="text-sm text-gray-500">
          Cliquez sur "Générer" pour créer une description professionnelle automatiquement
        </p>
      )}
    </Card>
  );
}


