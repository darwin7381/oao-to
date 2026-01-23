const crypto = require('crypto');

const JWT_SECRET = 'oao-to-dev-jwt-secret-key-for-local-development-2026-secure-random-string';

function base64url(source) {
  let encoded = Buffer.from(source).toString('base64');
  return encoded.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const header = { alg: 'HS256', typ: 'JWT' };
const payload = {
  userId: '89a982be-98e9-456c-bf59-55da3bfbb380',
  email: 'joey@cryptoxlab.com',
  role: 'superadmin',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30) // 30 days
};

const encodedHeader = base64url(JSON.stringify(header));
const encodedPayload = base64url(JSON.stringify(payload));
const signature = crypto
  .createHmac('sha256', JWT_SECRET)
  .update(encodedHeader + '.' + encodedPayload)
  .digest('base64')
  .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

const token = encodedHeader + '.' + encodedPayload + '.' + signature;
console.log(token);
