import { lazy } from 'react';

const L = (importer, exportName) =>
  lazy(() => importer().then((m) => ({ default: m[exportName] })));

/** Sections = une route logique `/MessagingCdcHub?section=…` (audit : 4 entrées UX, contenu CDC regroupé). */
export const MESSAGING_CDC_LAZY_PANELS = {
  'text-features': L(() => import('./MessagingCdcTextFeatures'), 'MessagingCdcTextFeaturesPanel'),
  'media-share': L(() => import('./MessagingCdcMediaAndShare'), 'MessagingCdcMediaAndSharePanel'),
  status: L(() => import('./MessagingCdcStatus'), 'MessagingCdcStatusPanel'),
  channels: L(() => import('./MessagingCdcChannels'), 'MessagingCdcChannelsPanel'),
  communities: L(() => import('./MessagingCdcCommunities'), 'MessagingCdcCommunitiesPanel'),
  'groups-advanced': L(() => import('./MessagingCdcGroupsAdvanced'), 'MessagingCdcGroupsAdvancedPanel'),
  calls: L(() => import('./MessagingCdcCalls'), 'MessagingCdcCallsPanel'),
  scheduled: L(() => import('./MessagingCdcScheduled'), 'MessagingCdcScheduledPanel'),
  privacy: L(() => import('./MessagingCdcPrivacy'), 'MessagingCdcPrivacyPanel'),
  'security-account': L(() => import('./MessagingCdcSecurityAccount'), 'MessagingCdcSecurityAccountPanel'),
  moderation: L(() => import('./MessagingCdcModeration'), 'MessagingCdcModerationPanel'),
  'multi-device': L(() => import('./MessagingCdcMultiDevice'), 'MessagingCdcMultiDevicePanel'),
  customize: L(() => import('./MessagingCdcCustomize'), 'MessagingCdcCustomizePanel'),
  'pro-tools': L(() => import('./MessagingCdcProTools'), 'MessagingCdcProToolsPanel'),
  premium: L(() => import('./MessagingCdcPremium'), 'MessagingCdcPremiumPanel'),
};
