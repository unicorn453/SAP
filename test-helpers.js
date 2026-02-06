const helpers = require('./srv/auth-helpers');
const config = require('./srv/config');

console.log('🔧 Auth Helpers Test\n');

// Test 1: Token Encryption/Decryption
console.log('=== Test 1: Token Encryption ===');
const testPayload = {
    requestNumber: 'REQ-20260205-EI-0001',
    recipientEmail: 'thomas.weber@schwarzit.com',
    expiresAt: new Date().toISOString()
};

const encrypted = helpers.encryptToken(testPayload);
console.log('✅ Encrypted token:', encrypted.substring(0, 50) + '...');

const decrypted = helpers.decryptToken(encrypted);
console.log('✅ Decrypted payload:', decrypted);
console.log('✅ Match:', JSON.stringify(testPayload) === JSON.stringify(decrypted));

// Test 2: 6-Digit Code Generation
console.log('\n=== Test 2: Verification Code ===');
const code1 = helpers.generate6DigitCode();
const code2 = helpers.generate6DigitCode();
const code3 = helpers.generate6DigitCode();
console.log('✅ Code 1:', code1, '(length:', code1.length + ')');
console.log('✅ Code 2:', code2, '(length:', code2.length + ')');
console.log('✅ Code 3:', code3, '(length:', code3.length + ')');
console.log('✅ All codes are unique:', code1 !== code2 && code2 !== code3);

// Test 3: Answer Hashing
console.log('\n=== Test 3: Security Answer Hashing ===');
const answer = 'FarmSupply GmbH';
const hash = helpers.hashAnswer(answer);
console.log('✅ Original:', answer);
console.log('✅ Hashed:', hash);
console.log('✅ Verify correct answer:', helpers.verifyHashedAnswer('FarmSupply GmbH', hash));
console.log('✅ Verify wrong answer:', helpers.verifyHashedAnswer('Wrong Company', hash));
console.log('✅ Case insensitive:', helpers.verifyHashedAnswer('farmsupply gmbh', hash));

// Test 4: IP & User Agent (mock request)
console.log('\n=== Test 4: Request Info Extraction ===');
const mockReq = {
    headers: {
        'x-forwarded-for': '192.168.1.100',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
};
console.log('✅ Client IP:', helpers.getClientIP(mockReq));
console.log('✅ User Agent:', helpers.getUserAgent(mockReq));

console.log('\n✅ All helper functions working!\n');