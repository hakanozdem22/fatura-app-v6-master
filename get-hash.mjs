import fs from 'fs';
import crypto from 'crypto';

const filePath = 'dist-electron-builder/fatura-app Setup 8.0.1.exe';
const fileBuffer = fs.readFileSync(filePath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const hexHash = hashSum.digest('hex');
const base64Hash = Buffer.from(hexHash, 'hex').toString('base64');

console.log('SHA512 (Base64):', base64Hash);
console.log('Size:', fileBuffer.length);
