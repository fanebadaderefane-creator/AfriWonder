import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { toast } from "sonner";

export default function VideoExport({ _videoId, videoTitle, videoUrl, className = '' }) {
  const [open, setOpen] = useState(false);
  const [quality, setQuality] = useState('720p');
  const [format, setFormat] = useState('mp4');
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Create a blob download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloaded(true);
      toast.success('Vidéo téléchargée!');

      setTimeout(() => {
        setOpen(false);
        setDownloaded(false);
        setQuality('720p');
        setFormat('mp4');
      }, 2000);
    } catch (_error) {
      toast.error('Erreur de téléchargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Download className="w-4 h-4 mr-1" />
        Exporter
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          {!downloaded ? (
            <>
              <DialogHeader>
                <DialogTitle>Exporter la vidéo</DialogTitle>
                <DialogDescription>
                  Téléchargez cette vidéo sur votre appareil
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Qualité</label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360p">360p (Faible bande passante)</SelectItem>
                      <SelectItem value="480p">480p (Standard)</SelectItem>
                      <SelectItem value="720p">720p (Haute qualité)</SelectItem>
                      <SelectItem value="1080p">1080p (Ultra HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Format</label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (Compatible)</SelectItem>
                      <SelectItem value="webm">WebM (Web)</SelectItem>
                      <SelectItem value="mkv">MKV (Haute qualité)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    💡 Les formats HD/4K peuvent être volumineux. Assurez-vous d'avoir assez d'espace.
                  </p>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Télécharger
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <DialogTitle className="sr-only">Téléchargement lancé</DialogTitle>
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900">Téléchargement lancé!</h3>
              <p className="text-sm text-gray-500 text-center mt-1">
                Votre vidéo se télécharge. Vous pouvez fermer cette fenêtre.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}