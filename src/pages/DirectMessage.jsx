/**
 * Messages directs — Alias vers Inbox (liste des conversations)
 * La conversation elle-même est dans Chat.jsx
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DirectMessage() {
  return <Navigate to={createPageUrl('Inbox')} replace />;
}
