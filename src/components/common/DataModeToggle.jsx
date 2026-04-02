import React from 'react';
import { Wifi, WifiOff, Zap, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const dataModes = [
  { 
    id: 'auto', 
    label: 'Auto', 
    description: 'S\'adapte au réseau (~0.8 Go/h en vidéo)',
    icon: Zap
  },
  { 
    id: 'lite', 
    label: 'Lite', 
    description: 'Économise les données (~0.3 Go/h en vidéo)',
    icon: WifiOff
  },
  { 
    id: 'hd', 
    label: 'HD', 
    description: 'Meilleure qualité (~1.5 Go/h en vidéo)',
    icon: Wifi
  },
];

export default function DataModeToggle({ 
  mode = 'auto', 
  onChange,
  showOfflineDownload = true,
  onDownloadForOffline
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-3">Mode données</h3>
      
      <div className="space-y-2">
        {dataModes.map((dataMode) => {
          const Icon = dataMode.icon;
          const isActive = mode === dataMode.id;
          
          return (
            <motion.button
              key={dataMode.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(dataMode.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                isActive 
                  ? "bg-blue-50 border-2 border-blue-500" 
                  : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isActive ? "bg-blue-500" : "bg-gray-200"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-white" : "text-gray-500"
                )} />
              </div>
              <div className="text-left flex-1">
                <p className={cn(
                  "font-medium",
                  isActive ? "text-blue-600" : "text-gray-700"
                )}>
                  {dataMode.label}
                </p>
                <p className="text-xs text-gray-400">{dataMode.description}</p>
              </div>
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </motion.button>
          );
        })}
      </div>

      {showOfflineDownload && (
        <button
          onClick={onDownloadForOffline}
          className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium">Télécharger pour hors-ligne</span>
        </button>
      )}

      <p className="text-center text-xs text-gray-400 mt-3">
        Mode Lite : vidéos compressées, images basse résolution (économie data)
      </p>
    </div>
  );
}