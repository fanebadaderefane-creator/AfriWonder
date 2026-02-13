import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * StartLive redirige vers LiveStream (écran unifié).
 * Les anciens liens /StartLive fonctionnent toujours.
 */
export default function StartLive() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('LiveStream'), { replace: true });
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
