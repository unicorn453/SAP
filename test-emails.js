const emailService = require('./srv/email-service-enhanced');

console.log('📧 Email Service Test (Demo Mode)\n');

// Test 1: File Access Email (Email to Thomas)
console.log('=== Test 1: File Access Email ===');
emailService.sendFileAccessEmail({
    requestNumber: 'REQ-20260205-EI-0001',
    recipientEmail: 'thomas.weber@schwarzit.com',
    recipientName: 'Thomas Weber',
    senderName: 'FarmSupply GmbH',
    senderEmail: 'contact@farmsupply.com',
    fileName: 'invoice_march_2026.pdf',
    fileSize: 2457600, // 2.4 MB
    senderMessage: 'Hi Thomas, here is the March invoice as requested.',
    accessLink: 'http://localhost:4004/receive?t=abc123xyz',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
});

// Test 2: Verification Code Email
console.log('\n=== Test 2: Verification Code Email ===');
emailService.sendVerificationCodeEmail({
    requestNumber: 'REQ-20260205-EI-0001',
    recipientEmail: 'thomas.weber@schwarzit.com',
    recipientName: 'Thomas Weber',
    verificationCode: '482916',
    fileName: 'invoice_march_2026.pdf'
});

// Test 3: Receipt Reminder Email
console.log('\n=== Test 3: Receipt Reminder Email ===');
emailService.sendReceiptReminderEmail({
    requestNumber: 'REQ-20260205-EI-0001',
    recipientEmail: 'thomas.weber@schwarzit.com',
    recipientName: 'Thomas Weber',
    fileName: 'invoice_march_2026.pdf',
    senderName: 'FarmSupply GmbH',
    confirmLink: 'http://localhost:4004/confirm?token=abc123'
});

// Test 4: Sender Confirmation Email
console.log('\n=== Test 4: Sender Confirmation Email ===');
emailService.sendSenderConfirmationEmail({
    requestNumber: 'REQ-20260205-EI-0001',
    senderEmail: 'contact@farmsupply.com',
    senderName: 'FarmSupply GmbH',
    recipientEmail: 'thomas.weber@schwarzit.com',
    recipientName: 'Thomas Weber',
    fileName: 'invoice_march_2026.pdf',
    receivedAt: new Date(),
    receiptNote: 'File received, processing payment.'
});

// Test 5: Wrong File Notification
console.log('\n=== Test 5: Wrong File Notification ===');
emailService.sendWrongFileNotificationEmail({
    requestNumber: 'REQ-20260205-EI-0001',
    senderEmail: 'contact@farmsupply.com',
    senderName: 'FarmSupply GmbH',
    recipientEmail: 'thomas.weber@schwarzit.com',
    fileName: 'invoice_march_2026.pdf',
    issueNote: 'Expected March invoice, received February invoice',
    uploadCorrectedLink: 'http://localhost:4004/upload-correction?req=REQ-20260205-EI-0001'
});

console.log('\n✅ All email templates tested!\n');
console.log('Note: In DEMO MODE, emails are logged to console instead of being sent.\n');