import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Clé dérivée du secret (à mettre en .env)
const getKey = (salt: Buffer): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || 'fallback-secret-change-me';
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
};

// Chiffrer données sensibles (numéros tél, adresses, etc)
export const encrypt = (text: string): string => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Format: salt:iv:tag:encrypted (tous en hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex')
  ].join(':');
};

// Déchiffrer
export const decrypt = (encryptedData: string): string => {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Format de données chiffrées invalide');
  }
  
  const [saltHex, ivHex, tagHex, encryptedHex] = parts;
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const key = getKey(salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
};

// Hash one-way pour données sensibles (ex: PIN wallet)
export const hashData = (data: string): string => {
  const salt = process.env.WALLET_PIN_SALT || 'default-salt-change-me';
  return crypto
    .pbkdf2Sync(data, salt, 100000, 64, 'sha512')
    .toString('hex');
};

// Comparer hash
export const verifyHash = (data: string, hash: string): boolean => {
  const computedHash = hashData(data);
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(computedHash)
  );
};
