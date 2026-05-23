import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
];

export default function SubtitleGenerator({ videoId, videoUrl, videoTitle, className = '' }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [subtitles, setSubtitles] = useState(null);

  const generateSubtitles = async () => {
    setLoading(true);
    try {
      // Call LLM to extract audio and generate subtitles
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Extract transcription from this video and generate subtitles in ${language} language. Format as SRT (SubRip) with timestamps. Video URL: ${videoUrl}`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            subtitles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _index: { type: 'number' },
                  startTime: { type: 'string' },
                  endTime: { type: 'string' },
                  text: { type: 'string' }
                }
              }
            },
            srtContent: { type: 'string' }
          }
        }
      });

      if (result.subtitles && result.subtitles.length > 0) {
        setSubtitles(result);
        
        // Save to database
        await api.videos.update(videoId, {
          subtitles: result.srtContent,
          subtitle_language: language
        });

        toast.success('Sous-titres générés!');
      } else {
        toast.error('Impossible de générer les sous-titres');
      }
    } catch (_error) {
      toast.error('Erreur: ' + error._message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSubtitles = () => {
    if (!subtitles?.srtContent) return;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(subtitles.srtContent));
    element.setAttribute('download', `${videoTitle}.srt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('Sous-titres _téléchargés');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <FileText className="w-4 h-4 mr-1" />
        Sous-titres
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {!subtitles ? (
            <>
              <DialogHeader>
                <DialogTitle>Générer des sous-titres</DialogTitle>
                <DialogDescription>
                  Créez automatiquement des sous-titres avec l'IA
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Langue</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      La génération peut prendre quelques minutes selon la durée de la vidéo.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={generateSubtitles}
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Générer
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>✓ Sous-titres générés</DialogTitle>
              </DialogHeader>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {subtitles.subtitles?.length || 0} sous-titres générés
                  </span>
                </div>
                <p className="text-xs text-green-700">
                  Langue: {languages.find(l => l.code === language)?.name}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="text-xs text-gray-600 space-y-2">
                  {subtitles.subtitles?.slice(0, 5).map((sub, idx) => (
                    <div key={idx} className="border-l-2 border-blue-500 pl-2">
                      <p className="font-mono text-gray-500">{sub.startTime} → {sub.endTime}</p>
                      <p className="text-gray-900">{sub.text}</p>
                    </div>
                  ))}
                  {subtitles.subtitles?.length > 5 && (
                    <p className="text-center text-gray-500 italic">... et {subtitles.subtitles.length - 5} de plus</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setSubtitles(null);
                  }}
                  className="flex-1"
                >
                  Fermer
                </Button>
                <Button
                  onClick={downloadSubtitles}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


