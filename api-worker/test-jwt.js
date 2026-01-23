// 測試生成 JWT token
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long';
const userId = '89a982be-98e9-456c-bf59-55da3bfbb380';

// 簡單的 JWT 生成（用於測試）
function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

const header = {
  alg: 'HS256',
  typ: 'JWT'
};

const payload = {
  userId: userId,
  email: 'joey@cryptoxlab.com',
  role: 'superadmin',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
};

const encodedHeader = base64url(JSON.stringify(header));
const encodedPayload = base64url(JSON.stringify(payload));
const signature = crypto
  .createHmac('sha256', JWT_SECRET)
  .update(encodedHeader + '.' + encodedPayload)
  .digest('base64')
  .replace(/=+$/, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const token = encodedHeader + '.' + encodedPayload + '.' + signature;

console.log('JWT Token:');
console.log(token);
console.log('');
console.log('Test command:');
console.log(`curl http://localhost:8788/api/account/keys -H "Authorization: Bearer ${token}"`);
