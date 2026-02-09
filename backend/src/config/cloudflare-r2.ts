import { S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const r2Client = endpoint && accessKeyId && secretAccessKey
  ? new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'afriwonder';

// URL publique R2
// Option 1: Custom domain (recommandé pour production) : https://cdn.afriwonder.com
// Option 2: URL R2 dev (activée) : https://pub-e025f1eec1f248ef91c99a64d9cbb328.r2.dev
// Option 3: URL R2 directe : https://<account-id>.r2.cloudflarestorage.com/<bucket-name>
// 
// ⚠️ L'URL R2 dev est activée mais limitée en débit (non recommandée pour production)
// ⚠️ Pour utiliser un custom domain, configurez-le dans Cloudflare R2 Dashboard :
//   1. Allez dans R2 > votre bucket > Settings > Custom Domains
//   2. Ajoutez votre custom domain (ex: cdn.afriwonder.com)
//   3. Cloudflare configurera automatiquement le DNS
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

