'use strict';

/**
 * Organisation EAS active — videovocalafriwonder (quota builds gratuits).
 * La keystore Play (FA:AC:66…) reste locale — indépendante de l’org Expo.
 */
const ACTIVE_EAS_ORG = {
  owner: 'videovocalafriwonder',
  slug: 'afriwonder-production',
  expoAccount: 'videovocalafriwonder',
  label: 'videovocalafriwonder',
};

/** Orgs / projets dont le quota est épuisé — ne plus cibler pour eas build. */
const BLOCKED_OWNERS = [
  'abdoulayefane-afriwonder-production',
  'fanebadaderefane',
  'fbf-global',
  'fbf_global',
  'global-production',
];

const BLOCKED_PROJECT_IDS = [
  '54406371-5aa5-4bf1-8f80-b64b9f1e72fc',
  '5d875c26-f610-4105-a241-1dc03c4edcc8',
  'f4715a6b-9779-4ec1-841a-9dd7cb73e2b3',
  'fca8d6ba-0ea4-4918-8e31-3264d31de669',
];

module.exports = {
  ACTIVE_EAS_ORG,
  BLOCKED_OWNERS,
  BLOCKED_PROJECT_IDS,
};
