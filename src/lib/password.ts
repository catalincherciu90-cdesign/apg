import bcrypt from 'bcryptjs';

// Hash-urile generate de PHP folosesc prefixul `$2y$`. Algoritmul este identic
// cu `$2b$`, doar eticheta difera, asa ca o normalizam pentru bcryptjs.
function normalize(hash: string): string {
  return hash.startsWith('$2y$') ? '$2b$' + hash.slice(4) : hash;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, normalize(hash));
  } catch {
    return false;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}
