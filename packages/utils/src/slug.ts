/**
 * Slug generation — uses CSPRNG, not Math.random()
 * Base62 alphabet: 0-9 A-Z a-z
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateSlug(length = 8): string {
  const bytes = new Uint8Array(length * 2); // extra bytes to handle modulo bias
  crypto.getRandomValues(bytes);

  let result = '';
  let i = 0;
  while (result.length < length && i < bytes.length) {
    const byte = bytes[i++];
    // Reject values >= 248 to avoid modulo bias (248 = floor(256/62)*62)
    if (byte < 248) {
      result += ALPHABET[byte % 62];
    }
  }

  // Fallback: if we ran out of random bytes, recurse
  if (result.length < length) {
    return result + generateSlug(length - result.length);
  }

  return result;
}

/**
 * Validate a custom slug — alphanumeric + hyphens, 3-50 chars
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-]{3,50}$/.test(slug);
}
