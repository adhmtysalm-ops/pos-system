export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const enc = new TextEncoder();
  let salt: Uint8Array;
  if (saltHex) {
    salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const currentSaltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${currentSaltHex}:${hashHex}`;
}

export function requireSuperAdmin(c: any) {
  const p = c.get('jwtPayload')
  if (p.role !== 'superadmin') return c.json({ error: 'Unauthorized – superadmin only' }, 403)
  return null
}

export function getEgyptTime() {
  const d = new Date()
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const timeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { dateStr, timeStr }
}
