import { randomBytes } from 'crypto';

const key = randomBytes(32).toString('base64');
console.log('\n🔑 CONFIG_ENCRYPTION_KEY générée :\n');
console.log(key);
console.log('\n⚠️  Copiez-la dans .env.local ET dans Vercel Environment Variables.\n');
