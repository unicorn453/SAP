const config = require('./srv/config');

console.log('🔧 Configuration Test\n');

// Test 1: File limits
console.log('✅ Max file size:', config.MAX_FILE_SIZE / 1024 / 1024, 'MB');
console.log('✅ Allowed types:', config.ALLOWED_FILE_TYPES);

// Test 2: Attempt limits
console.log('\n✅ Max link clicks:', config.MAX_LINK_CLICKS);
console.log('✅ Max Worker ID attempts:', config.MAX_WORKER_ID_ATTEMPTS);
console.log('✅ Max code attempts:', config.MAX_CODE_ATTEMPTS);

// Test 3: Email validation
console.log('\n✅ Is thomas.weber@schwarzit.com internal?', 
  config.isInternalEmail('thomas.weber@schwarzit.com'));
console.log('✅ Is contact@farmsupply.com internal?', 
  config.isInternalEmail('contact@farmsupply.com'));

// Test 4: Transfer type detection
console.log('\n✅ Transfer type (external → internal):', 
  config.getTransferType('contact@farmsupply.com', 'thomas.weber@schwarzit.com'));
console.log('✅ Transfer type (internal → internal):', 
  config.getTransferType('lisa.becker@schwarzit.com', 'thomas.weber@schwarzit.com'));

// Test 5: File validation
console.log('\n✅ Is invoice.pdf allowed?', 
  config.isFileTypeAllowed('invoice.pdf'));
console.log('✅ Is malware.exe allowed?', 
  config.isFileTypeAllowed('malware.exe'));

// Test 6: MIME types
console.log('\n✅ MIME type for invoice.pdf:', 
  config.getMimeType('invoice.pdf'));
console.log('✅ MIME type for data.xlsx:', 
  config.getMimeType('data.xlsx'));

console.log('\n✅ Configuration loaded successfully!\n');