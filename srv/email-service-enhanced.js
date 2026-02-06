require('dotenv').config();
const nodemailer = require('nodemailer');
const config = require('./config');

// ============================================
// EMAIL TRANSPORTER SETUP
// ============================================

let transporter;

if (config.DEMO_MODE && config.DEMO_EMAIL_TO_CONSOLE) {
    // DEMO MODE: Log emails to console instead of sending
    console.log('📧 Email Service: DEMO MODE - Emails will be logged to console');
    transporter = null;
} else {
    // PRODUCTION MODE: Use real SMTP
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

// ============================================
// HELPER: Send Email
// ============================================

async function sendEmail(to, subject, html, text) {
    if (config.DEMO_MODE && config.DEMO_EMAIL_TO_CONSOLE) {
        // Demo mode: Just log to console
        console.log('\n' + '='.repeat(60));
        console.log('📧 EMAIL (DEMO MODE - NOT ACTUALLY SENT)');
        console.log('='.repeat(60));
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('-'.repeat(60));
        console.log(text);
        console.log('='.repeat(60) + '\n');
        return true;
    }
    
    try {
        const info = await transporter.sendMail({
            from: config.EMAIL_FROM,
            to: to,
            subject: subject,
            html: html,
            text: text
        });
        
        console.log('✅ Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Email failed:', error.message);
        return false;
    }
}

// ============================================
// SCENARIO A: EXTERNAL → INTERNAL
// ============================================

/**
 * Email 1: Send file access link to internal employee (Thomas)
 * This is the main notification email with encrypted link
 */
async function sendFileAccessEmail(params) {
    const {
        requestNumber,
        recipientEmail,
        recipientName,
        senderName,
        senderEmail,
        fileName,
        fileSize,
        senderMessage,
        accessLink,
        expiresAt
    } = params;
    
    const subject = `[${requestNumber}] Secure File from ${senderName}`;
    
    const text = `
Hi ${recipientName || recipientEmail},

You have received a secure file from an external sender.

═══════════════════════════════════════
REQUEST DETAILS
═══════════════════════════════════════
Request Number:    ${requestNumber}
From:              ${senderName}
Sender Email:      ${senderEmail}
File Name:         ${fileName}
File Size:         ${formatFileSize(fileSize)}
Sent:              ${formatDateTime(new Date())}
Expires:           ${formatDateTime(expiresAt)}
═══════════════════════════════════════

${senderMessage ? `MESSAGE FROM SENDER:\n"${senderMessage}"\n\n═══════════════════════════════════════\n\n` : ''}
ACCESS SECURE FILE:
${accessLink}

SECURITY VERIFICATION REQUIRED:
✓ Your Worker ID
✓ 6-digit verification code (sent after Worker ID verified)

⚠️ This link expires after 2 clicks or 5 minutes from first access.

If you did not expect this file, DO NOT click the link.
Report suspicious emails: ${config.EMAIL_SECURITY}

═══════════════════════════════════════

Questions? Contact sender: ${senderEmail}
Technical support: ${config.EMAIL_SUPPORT}

This email was sent to ${recipientEmail}
Request #${requestNumber}

───────────────────────────────────────────────────
Schwarz IT Secure File Transfer System
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .button { display: inline-block; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔐 Schwarz IT Secure File Transfer</h2>
        </div>
        
        <div class="content">
            <h3>You have received a secure file</h3>
            
            <table class="info-table">
                <tr><td>Request Number:</td><td>${requestNumber}</td></tr>
                <tr><td>From:</td><td>${senderName}</td></tr>
                <tr><td>Sender Email:</td><td>${senderEmail}</td></tr>
                <tr><td>File Name:</td><td>${fileName}</td></tr>
                <tr><td>File Size:</td><td>${formatFileSize(fileSize)}</td></tr>
                <tr><td>Sent:</td><td>${formatDateTime(new Date())}</td></tr>
                <tr><td>Expires:</td><td>${formatDateTime(expiresAt)}</td></tr>
            </table>
            
            ${senderMessage ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Message from sender:</strong><br>
                "${senderMessage}"
            </div>
            ` : ''}
            
            <div style="text-align: center;">
                <a href="${accessLink}" class="button">ACCESS SECURE FILE</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ SECURITY NOTICE:</strong><br>
                This file requires multi-factor authentication:<br>
                ✓ Your Worker ID<br>
                ✓ 6-digit verification code (sent after ID verified)<br><br>
                This link expires after 2 clicks or 5 minutes from first access.
            </div>
            
            <p style="font-size: 12px; color: #666;">
                If you did not expect this file, <strong>DO NOT click the link</strong>.<br>
                Report suspicious emails: ${config.EMAIL_SECURITY}
            </p>
        </div>
        
        <div class="footer">
            Questions? Contact sender: ${senderEmail}<br>
            Technical support: ${config.EMAIL_SUPPORT}<br><br>
            Request #${requestNumber}
        </div>
    </div>
</body>
</html>
    `.trim();
    
    return await sendEmail(recipientEmail, subject, html, text);
}

/**
 * Email 2: Send 6-digit verification code to employee
 * Sent after Worker ID is verified
 */
async function sendVerificationCodeEmail(params) {
    const {
        requestNumber,
        recipientEmail,
        recipientName,
        verificationCode,
        fileName
    } = params;
    
    const subject = `[${requestNumber}] Verification Code`;
    
    const text = `
Hi ${recipientName},

Your verification code for secure file access:

        ╔═══════════════╗
        ║               ║
        ║    ${verificationCode}     ║
        ║               ║
        ╚═══════════════╝

Request: ${requestNumber}
File: ${fileName}

⏰ This code expires in 60 seconds.

Do not share this code with anyone.

If you didn't request this code, ignore this email
and report to: ${config.EMAIL_SECURITY}

───────────────────────────────────────────────────
Schwarz IT Secure File Transfer System
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .code-box { background: #0066cc; color: white; padding: 30px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; border-radius: 10px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>🔐 Verification Code</h2>
        
        <p>Hi ${recipientName},</p>
        
        <p>Your verification code for secure file access:</p>
        
        <div class="code-box">${verificationCode}</div>
        
        <p><strong>Request:</strong> ${requestNumber}<br>
        <strong>File:</strong> ${fileName}</p>
        
        <div class="warning">
            <strong>⏰ This code expires in 60 seconds.</strong><br>
            Do not share this code with anyone.
        </div>
        
        <p style="font-size: 12px; color: #666;">
            If you didn't request this code, ignore this email and report to: ${config.EMAIL_SECURITY}
        </p>
        
        <div class="footer">
            Schwarz IT Secure File Transfer System
        </div>
    </div>
</body>
</html>
    `.trim();
    
    return await sendEmail(recipientEmail, subject, html, text);
}

/**
 * Email 3: Reminder to confirm receipt (sent 5 min after download)
 */
async function sendReceiptReminderEmail(params) {
    const {
        requestNumber,
        recipientEmail,
        recipientName,
        fileName,
        senderName,
        confirmLink
    } = params;
    
    const subject = `[${requestNumber}] Please Confirm Receipt`;
    
    const text = `
Hi ${recipientName},

You downloaded this file 5 minutes ago:

File: ${fileName}
From: ${senderName}
Request: ${requestNumber}

Please confirm receipt so the sender knows you 
received the correct file:

${confirmLink}

This helps us maintain accurate delivery records.

If the file was incorrect or corrupted:
${confirmLink.replace('/confirm', '/report-issue')}

───────────────────────────────────────────────────
Schwarz IT Secure File Transfer System
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 15px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
        .button-secondary { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h2>⏰ Confirmation Reminder</h2>
        
        <p>Hi ${recipientName},</p>
        
        <p>You downloaded this file 5 minutes ago:</p>
        
        <p><strong>File:</strong> ${fileName}<br>
        <strong>From:</strong> ${senderName}<br>
        <strong>Request:</strong> ${requestNumber}</p>
        
        <p>Please confirm receipt so the sender knows you received the correct file:</p>
        
        <div style="text-align: center;">
            <a href="${confirmLink}" class="button">✅ Confirm Receipt</a>
            <a href="${confirmLink.replace('/confirm', '/report-issue')}" class="button button-secondary">⚠️ Report Issue</a>
        </div>
        
        <p style="font-size: 12px; color: #666;">
            This helps us maintain accurate delivery records.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return await sendEmail(recipientEmail, subject, html, text);
}

/**
 * Email 4: Confirmation to sender (file was received)
 */
async function sendSenderConfirmationEmail(params) {
    const {
        requestNumber,
        senderEmail,
        senderName,
        recipientEmail,
        recipientName,
        fileName,
        receivedAt,
        receiptNote
    } = params;
    
    const subject = `[${requestNumber}] File Received ✅`;
    
    const text = `
Hi ${senderName},

Good news! Your file has been successfully received.

═══════════════════════════════════════
TRANSFER COMPLETE
═══════════════════════════════════════
Request Number:     ${requestNumber}
File:               ${fileName}
Recipient:          ${recipientEmail}
Received By:        ${recipientName}
Confirmed:          ${formatDateTime(receivedAt)}
═══════════════════════════════════════

${receiptNote ? `RECIPIENT NOTE:\n"${receiptNote}"\n\n═══════════════════════════════════════\n\n` : ''}
Your file was successfully delivered and confirmed.

Need to send another file?
${config.APP_URL}

Questions? Reply to this email.

───────────────────────────────────────────────────
Schwarz IT Secure File Transfer System
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
        .info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">
            <h2>✅ File Received Successfully!</h2>
        </div>
        
        <p>Hi ${senderName},</p>
        
        <p>Your file has been successfully received and confirmed.</p>
        
        <table class="info-table">
            <tr><td>Request Number:</td><td>${requestNumber}</td></tr>
            <tr><td>File:</td><td>${fileName}</td></tr>
            <tr><td>Recipient:</td><td>${recipientEmail}</td></tr>
            <tr><td>Received By:</td><td>${recipientName}</td></tr>
            <tr><td>Confirmed:</td><td>${formatDateTime(receivedAt)}</td></tr>
        </table>
        
        ${receiptNote ? `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Recipient note:</strong><br>
            "${receiptNote}"
        </div>
        ` : ''}
        
        <div style="text-align: center;">
            <a href="${config.APP_URL}" class="button">Send Another File</a>
        </div>
        
        <p style="font-size: 12px; color: #666;">
            Questions? Reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return await sendEmail(senderEmail, subject, html, text);
}

/**
 * Email 5: Wrong file reported - notify sender
 */
async function sendWrongFileNotificationEmail(params) {
    const {
        requestNumber,
        senderEmail,
        senderName,
        recipientEmail,
        fileName,
        issueNote,
        uploadCorrectedLink
    } = params;
    
    const subject = `[${requestNumber}] File Issue Reported ⚠️`;
    
    const text = `
Hi ${senderName},

The recipient reported an issue with your file:

Request: ${requestNumber}
File: ${fileName}
Recipient: ${recipientEmail}

ISSUE REPORTED:
"${issueNote}"

Would you like to send a corrected file?

${uploadCorrectedLink}

Or contact the recipient directly:
${recipientEmail}

───────────────────────────────────────────────────
Schwarz IT Secure File Transfer System
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; padding: 15px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="warning">
            <h2>⚠️ File Issue Reported</h2>
        </div>
        
        <p>Hi ${senderName},</p>
        
        <p>The recipient reported an issue with your file:</p>
        
        <p><strong>Request:</strong> ${requestNumber}<br>
        <strong>File:</strong> ${fileName}<br>
        <strong>Recipient:</strong> ${recipientEmail}</p>
        
        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Issue reported:</strong><br>
            "${issueNote}"
        </div>
        
        <p>Would you like to send a corrected file?</p>
        
        <div style="text-align: center;">
            <a href="${uploadCorrectedLink}" class="button">Upload Corrected File</a>
        </div>
        
        <p style="font-size: 12px; color: #666;">
            Or contact the recipient directly: ${recipientEmail}
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return await sendEmail(senderEmail, subject, html, text);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    sendFileAccessEmail,
    sendVerificationCodeEmail,
    sendReceiptReminderEmail,
    sendSenderConfirmationEmail,
    sendWrongFileNotificationEmail
};