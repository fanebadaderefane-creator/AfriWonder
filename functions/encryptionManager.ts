import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

// Encrypt sensitive data
export function encryptData(data) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      data: encrypted,
      iv: iv.toString("hex")
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// Decrypt sensitive data
export function decryptData(encrypted, iv) {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      ENCRYPTION_KEY,
      Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Hash password (bcrypt-like)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");

  return `${salt}$${hash}`;
}

// Verify password
export function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split("$");
    const verification = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");

    return hash === verification;
  } catch (error) {
    return false;
  }
}

// Generate secure random token
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

// Create JWT-like token
export function createSecureToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ENCRYPTION_KEY)
    .update(`${header}.${payloadStr}`)
    .digest("base64url");

  return `${header}.${payloadStr}.${signature}`;
}

// Verify secure token
export function verifySecureToken(token) {
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", ENCRYPTION_KEY)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch (error) {
    return null;
  }
}

// Hash payment card (PCI compliance)
export function hashCardData(cardNumber) {
  return crypto.createHash("sha256").update(cardNumber).digest("hex");
}

// Mask sensitive data for display
export function maskData(data, visibleChars = 4) {
  if (typeof data !== "string" || data.length <= visibleChars) {
    return "*".repeat(data.length);
  }

  const masked = "*".repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}