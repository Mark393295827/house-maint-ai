import crypto from 'crypto';

// Use a standardized 256-bit environment key or fallback for local dev
const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', 
  'utf-8'
).slice(0, 32); 

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string returning a compound base64 string
 * Format: base64(iv:auth_tag:encrypted)
 */
export function encryptAddress(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine all parts into a single string
  const payload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  
  return Buffer.from(payload).toString('base64');
}

/**
 * Decrypts the formatted string safely
 */
export function decryptAddress(compoundBase64: string): string | null {
  if (!compoundBase64) return null;
  
  try {
    const payload = Buffer.from(compoundBase64, 'base64').toString('utf8');
    const [ivHex, authTagHex, encryptedHex] = payload.split(':');
    
    if (!ivHex || !authTagHex || !encryptedHex) return null;
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      ENCRYPTION_KEY, 
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt address payload', error);
    return null; // Return null on auth failure (prevent error leakage)
  }
}
