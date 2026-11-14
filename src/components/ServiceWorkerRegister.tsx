'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencieux : si l'enregistrement échoue, la PWA n'est simplement pas installable.
      });
    }
  }, []);
  return null;
}