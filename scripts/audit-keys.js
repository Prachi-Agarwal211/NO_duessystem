
require('dotenv').config();

function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (e) {
        return null;
    }
}

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📦 Key Audit Results:');
console.log('---');

if (anonKey) {
    const p = decodeJWT(anonKey);
    console.log(`Anon Key Role: ${p?.role || 'unknown'}`);
} else {
    console.log('Anon Key: MISSING');
}

if (serviceKey) {
    const p = decodeJWT(serviceKey);
    console.log(`Service Key Role: ${p?.role || 'unknown'}`);
    if (p?.role === 'anon') {
        console.log('⚠️ WARNING: SERVICE_ROLE_KEY is actually an ANON key!');
    }
} else {
    console.log('Service Key: MISSING');
}
