import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, Share2, Copy, QrCode, User, Wallet, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/navigation/BottomNav';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/AuthContext';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

function useProfileUrl(userId, type = 'profile') {
  if (!userId) return '';
  if (type === 'profile') return `${BASE_URL}/Profile?userId=${userId}`;
  if (type === 'payment') return `${BASE_URL}/Wallet?receive=${userId}`;
  if (type === 'shop') return `${BASE_URL}/SellerProfile?id=${userId}`;
  return `${BASE_URL}/Profile?userId=${userId}`;
}

export default function QRCodePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const svgRef = useRef(null);
  const [selectedType, setSelectedType] = useState('profile');

  const userId = user?.id || '';
  const username = user?.username || user?.full_name || '@username';
  const profileUrl = useProfileUrl(userId, selectedType);

  const qrTypes = [
    { id: 'profile', label: 'Mon Profil', icon: User, color: 'from-blue-500 to-cyan-500' },
    { id: 'payment', label: 'Recevoir paiement', icon: Wallet, color: 'from-green-500 to-emerald-500' },
    { id: 'shop', label: 'Ma Boutique', icon: ShoppingBag, color: 'from-blue-500 to-indigo-500' },
  ];

  const handleCopy = async () => {
    if (!profileUrl) {
      toast.error('Connectez-vous pour générer un QR Code');
      return;
    }
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Lien copié !');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleDownloadPng = () => {
    if (!svgRef.current || !profileUrl) return;
    const svg = svgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `qrcode-afriwonder-${selectedType}.png`;
      a.click();
      toast.success('Image téléchargée');
    };
    img.src = url;
  };

  const handleShare = async () => {
    if (!profileUrl) {
      toast.error('Connectez-vous pour partager');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon profil AfriWonder',
          text: `Suivez-moi sur AfriWonder: ${username}`,
          url: profileUrl,
        });
        toast.success('Partagé !');
      } catch (e) {
        if (e.name !== 'AbortError') toast.error('Partage annulé ou indisponible');
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">Mon QR Code</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Card className="p-8 flex flex-col items-center">
          <div
            className="w-56 h-56 bg-white border-4 border-gray-100 rounded-3xl flex items-center justify-center mb-4 p-3 transition-transform duration-200 hover:scale-[1.02]"
            ref={svgRef}
          >
            {profileUrl ? (
              <QRCodeSVG
                value={profileUrl}
                size={200}
                level="M"
                includeMargin={false}
                className="w-full h-full"
              />
            ) : (
              <QrCode className="w-40 h-40 text-gray-300" />
            )}
          </div>
          <p className="text-gray-700 font-medium">{username}</p>
          <p className="text-xs text-gray-400">
            {selectedType === 'profile' && 'Scannez pour accéder au profil'}
            {selectedType === 'payment' && 'Scannez pour envoyer un paiement'}
            {selectedType === 'shop' && 'Scannez pour voir la boutique'}
          </p>

          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            <Button variant="outline" onClick={handleCopy} disabled={!profileUrl}>
              <Copy className="w-4 h-4 mr-2" />
              Copier le lien
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={!profileUrl}>
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            <Button variant="outline" onClick={handleDownloadPng} disabled={!profileUrl}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger PNG
            </Button>
          </div>
        </Card>

        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Type de QR Code</h2>
          <div className="space-y-3">
            {qrTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <Card
                  key={type.id}
                  className={`p-4 flex items-center gap-4 cursor-pointer transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{type.label}</h3>
                  </div>
                  <QrCode className="w-5 h-5 text-gray-400" />
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
