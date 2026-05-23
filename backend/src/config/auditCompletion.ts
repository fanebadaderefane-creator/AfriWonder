/**
 * Statut d’alignement dépôt vs audits (Jour 1, Semaine 1, infra, Flutter, critères).
 * `true` = présent dans le repo / automatisé. `false` = action manuelle ou hors code.
 * Ne pas interpréter comme « production validée ».
 */
export const AUDIT_REPO_COMPLETION = {
  reference: 'Audits AfriWonder — développeur + roadmap pages 16–17',
  updated: '2026-04-02',
  legend: {
    true: 'Présent dans le dépôt ou vérifiable par script CI',
    false: 'Hors dépôt (compte, store, design, mesure prod) ou non applicable',
  },
  jour1_securite: {
    branche_cleanup_documentee: true,
    detect_secrets_workflow: true,
    doppler_yaml: true,
    github_secret_scanning_settings: false,
    rotation_tokens_manuelle: false,
    env_example_racine: true,
    env_example_backend: true,
    env_example_flutter: true,
    env_example_sdk: true,
  },
  /** Validation Zod : schémas métier prioritaires + validateBody sur (quasi) toutes les routes JSON mutantes. */
  validation_zod_api: {
    auth_orders_payments_upload: true,
    privacy_messages_live: true,
    videos_comments_admin: true,
    cart_products_notifications: true,
    addresses_ads_airtime: true,
    /** Toutes les routes POST/PUT/PATCH JSON passent par validateBody (schéma métier ou jsonObjectBody fallback). Excl. multer, webhooks Buffer. */
    mutating_json_body_zod_middleware: true,
    reste_routes_monorepo: false,
  },
  semaine1_structure: {
    docs_dossier: true,
    backend_render_dockerfile: true,
    ci_deploy_render: true,
    flutter_app_renomme: true,
    architecture_md: true,
    railway_supprime: true,
  },
  infra_no_code: {
    sentry_frontend: true,
    sentry_backend: true,
    posthog_frontend: true,
    resend_backend: true,
    supabase_chemins_api: true,
    supabase_storage_ou_r2: true,
    figma_fichier_equipe: false,
    readme_unifie: true,
  },
  flutter_mois2_3: {
    riverpod: true,
    go_router: true,
    dio: true,
    hive_offline: true,
    firebase_push: true,
    fastlane_fichiers: true,
    feed_vertical_code: true,
    retrofit_codegen: false,
    tests_android_go_device: false,
  },
  criteres_succes: {
    lighthouse_ci_seuils: true,
    lighthouse_prod_mesure: false,
    api_sla_200ms_instrumente: true,
    secrets_historique_git_zero: false,
    couverture_tests_frontend_70: false,
    couverture_tests_backend_80: false,
    flutter_ios_android_versions: false,
    offline_teste_manuel: false,
    orange_wave_sandbox: false,
    revue_securite_prod: false,
  },
  phases_16_17: {
    phase1_fondation_code: true,
    phase2_mvp_code: true,
    phase3_flutter_partiel: true,
    phase4_croissance_code: true,
    levée_fonds: false,
  },
} as const;
