import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Share2, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

async function downloadCertificatePdf(certificateId) {
  try {
    const blob = await api.certificates.getPdfBlob(certificateId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificat-${certificateId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Téléchargement du PDF démarré');
  } catch (e) {
    toast.error(e?.response?.data?.error?.message || 'Erreur téléchargement PDF');
  }
}

export default function Certificates() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: () => api.certificates.list(),
    enabled: !!user?.id
  });

  const shareCertificate = async (cert) => {
    try {
      const verifyUrl = `${window.location.origin}/VerifyCertificate?token=${encodeURIComponent(cert.verification_token || '')}`;
      await navigator.share({
        title: `Certificat: ${cert.course_title}`,
        text: `J'ai complété le cours "${cert.course_title}" sur AfriWonder. Vérifier: ${verifyUrl}`,
        url: verifyUrl
      });
      toast.success('Lien partagé');
    } catch (_err) {
      toast.error('Erreur lors du partage');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Mes certificats</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {certificates.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Aucun certificat pour le moment</p>
            <p className="text-sm text-gray-400">Complétez des cours pour gagner des certificats</p>
          </div>
        ) : (
          certificates.map((cert, idx) => (
            <motion.div key={cert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="w-10 h-10 text-white" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{cert.course_title}</h3>
                      <p className="text-sm text-gray-600">Par {cert.instructor_name}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-100 text-green-800">Complété</Badge>
                        <span className="text-xs text-gray-500">
                          {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('fr-FR') : '—'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mt-2">
                        N° vérification: {cert.verification_token}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 justify-center">
                      <Button
                        size="sm"
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={() => downloadCertificatePdf(cert.id)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareCertificate(cert)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Partager
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

