import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { CSVService } from "@/lib/csvService";

export default function BulkUploadManager({ onUpload }) {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleCSVUpload = async (file) => {
    try {
      setError(null);
      const rows = await CSVService.parseCSV(file);
      
      // Validate required fields
      const validation = CSVService.validateCSV(rows, ["title", "video_url"]);
      if (!validation.isValid) {
        setError(validation.errors[0]);
        return;
      }

      setVideos(
        rows.map((row, idx) => ({
          id: idx,
          title: row.title,
          description: row.description || "",
          video_url: row.video_url,
          thumbnail_url: row.thumbnail_url || "",
          category: row.category || "other",
          tags: row.tags?.split(",").map(t => t.trim()) || [],
          visibility: row.visibility || "public",
          status: "pending"
        }))
      );
    } catch (_err) {
      setError(err._message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      handleCSVUpload(file);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        await onUpload(video);
        
        setVideos(prev => {
          const updated = [...prev];
          updated[i].status = "success";
          return updated;
        });

        setProgress(Math.round(((i + 1) / videos.length) * 100));
      }
    } catch (_error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const addManualVideo = () => {
    setVideos([
      ...videos,
      {
        id: Date.now(),
        title: "",
        description: "",
        video_url: "",
        thumbnail_url: "",
        category: "other",
        tags: [],
        visibility: "public",
        status: "pending"
      }
    ]);
  };

  const removeVideo = (id) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  const updateVideo = (id, field, value) => {
    setVideos(
      videos.map(v => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Téléchargement en masse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Import */}
        <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-2">
            Importez un fichier CSV
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Colonnes requises: title, video_url, description, thumbnail_url, category
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Choisir un fichier CSV
          </Button>
        </div>

        {/* Manual Add */}
        <Button onClick={addManualVideo} variant="outline" className="w-full">
          + Ajouter manuellement
        </Button>

        {/* Videos List */}
        {videos.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {videos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Vidéo {idx + 1}</h4>
                  <div className="flex items-center gap-2">
                    {video.status === "success" && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {video.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <button
                      onClick={() => removeVideo(video.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="Titre"
                    value={video.title}
                    onChange={(e) => updateVideo(video.id, "title", e.target.value)}
                  />
                  <Input
                    placeholder="URL de la vidéo"
                    value={video.video_url}
                    onChange={(e) => updateVideo(video.id, "video_url", e.target.value)}
                  />
                  <Input
                    placeholder="Description"
                    value={video.description}
                    onChange={(e) => updateVideo(video.id, "description", e.target.value)}
                  />
                  <Select
                    value={video.category}
                    onValueChange={(value) => updateVideo(video.id, "category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Musique</SelectItem>
                      <SelectItem value="education">Éducation</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {videos.length > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-orange-500 h-2 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Téléchargement en cours... {progress}%
                </>
              ) : (
                `Télécharger ${videos.length} vidéo(s)`
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}