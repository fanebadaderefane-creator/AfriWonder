/**
 * Lazy-loaded pages pour réduire le bundle initial et améliorer les temps de chargement.
 * Seules les pages les plus lourdes sont chargées à la demande.
 */
import { lazy } from 'react';

export const lazyPages = {
  Create: lazy(() => import('@/pages/Create')),
  Chat: lazy(() => import('@/pages/Chat')),
  Inbox: lazy(() => import('@/pages/Inbox')),
  GroupChat: lazy(() => import('@/pages/GroupChat')),
  Profile: lazy(() => import('@/pages/Profile')),
  Search: lazy(() => import('@/pages/Search')),
  LiveStream: lazy(() => import('@/pages/LiveStream')),
  LiveView: lazy(() => import('@/pages/LiveView')),
  Analytics: lazy(() => import('@/pages/Analytics')),
  ModerationDashboard: lazy(() => import('@/pages/ModerationDashboard')),
  AdminDashboard: lazy(() => import('@/pages/AdminDashboard')),
  CreateCourse: lazy(() => import('@/pages/CreateCourse')),
  CourseDetails: lazy(() => import('@/pages/CourseDetails')),
  EventDetails: lazy(() => import('@/pages/EventDetails')),
  ArticleDetails: lazy(() => import('@/pages/ArticleDetails')),
  Marketplace: lazy(() => import('@/pages/Marketplace')),
  Checkout: lazy(() => import('@/pages/Checkout')),
  DirectCall: lazy(() => import('@/pages/DirectCall')),
  FeedPosts: lazy(() => import('@/pages/FeedPosts')),
};
