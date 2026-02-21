import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';

const VERIFICATION_TYPES = {
  email: { label: 'Email', icon: '✉️' },
  phone: { label: 'Téléphone', icon: '📱' },
  id: { label: 'Pièce d\'identité', icon: '🆔' },
  business: { label: 'Compte professionnel', icon: '💼' }
};

const DOCUMENT_TYPES = {
  passport: 'Passeport',
  national_id: 'Carte d\'identité',
  drivers_license: 'Permis de conduire',
  business_license: 'Licence commerciale'
};

export default function UserVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState('email');
  const [documentType, setDocumentType] = useState('national_id');
  const [file, setFile] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const { data: verifications = [] } = useQuery({
    queryKey: ['user-verifications', user?.id],
    queryFn: () => api.entities.UserVerification.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async () => {
      if (selectedType === 'id' && !file) {
        throw new Error('Document requis');
      }

      let documentUrl = null;
      if (file) {
        const uploaded = await api.upload.video({ file });
        documentUrl = uploaded.file_url;
      }

      const verification = await api.entities.UserVerification.create({
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        verification_type: selectedType,
        document_type: selectedType === 'id' ? documentType : null,
        document_url: documentUrl,
        status: 'pending',
        submitted_date: new Date().toISOString()
      });

      return verification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-verifications', user?.id] });
      toast.success('Vérification soumise pour examen');
      setFile(null);
    }
  });

  const getVerificationStatus = (type) => {
    const verification = verifications.find(v => v.verification_type === type);
    if (!verification) return null;
    return verification;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Vérification du compte</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">
              ✓ Vérifier votre compte augmente la confiance et déverrouille des fonctionnalités premium.
            </p>
          </CardContent>
        </Card>

        {/* Verification Types */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(VERIFICATION_TYPES).map(([key, data]) => {
            const status = getVerificationStatus(key);
            const statusColor = status?.status === 'approved' ? 'bg-green-100' :
              status?.status === 'rejected' ? 'bg-red-100' :
              status?.status === 'pending' ? 'bg-yellow-100' : '';

            return (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedType === key ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'
                } ${statusColor}`}
              >
                <div className="text-2xl mb-1">{data.icon}</div>
                <p className="font-semibold text-sm">{data.label}</p>
                {status && (
                  <div className="mt-2 flex items-center gap-1">
                    {status.status === 'approved' && (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">Vérifié</span>
                      </>
                    )}
                    {status.status === 'pending' && (
                      <>
                        <Clock className="w-3 h-3 text-yellow-600" />
                        <span className="text-xs text-yellow-600">En attente</span>
                      </>
                    )}
                    {status.status === 'rejected' && (
                      <>
                        <AlertCircle className="w-3 h-3 text-red-600" />
                        <span className="text-xs text-red-600">Rejeté</span>
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Document Upload for ID */}
        {selectedType === 'id' && !getVerificationStatus('id') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pièce d'identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Type de document</label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0])}
                  accept={`${FILE_ACCEPT_IMAGES},.pdf,application/pdf`}
                  className="hidden"
                  id="doc-upload"
                />
                <label htmlFor="doc-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">{file ? file.name : 'Cliquez pour télécharger'}</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF (max 10 MB)</p>
                </label>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                ℹ️ Les documents sont traités dans les 24-48h. Assurez-vous qu'ils sont clairs et lisibles.
              </div>

              <Button
                onClick={() => submitVerificationMutation.mutate()}
                disabled={submitVerificationMutation.isPending || !file}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {submitVerificationMutation.isPending ? 'Soumission...' : 'Soumettre'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Simpler Types */}
        {selectedType !== 'id' && !getVerificationStatus(selectedType) && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-700 mb-4">
                {selectedType === 'email' && 'Un email de confirmation sera envoyé à votre adresse.'}
                {selectedType === 'phone' && 'Un code sera envoyé à votre téléphone.'}
                {selectedType === 'business' && 'Informations pour compte professionnel.'}
              </p>
              <Button
                onClick={() => submitVerificationMutation.mutate()}
                disabled={submitVerificationMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {submitVerificationMutation.isPending ? 'Envoi...' : 'Commencer la vérification'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Verified Status */}
        {getVerificationStatus(selectedType) && getVerificationStatus(selectedType).status === 'approved' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Vérifié</p>
                <p className="text-sm text-green-800">Votre compte a obtenu le badge ✓</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

