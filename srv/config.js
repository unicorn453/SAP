module.exports = {
  
  // ============================================
  // FILE UPLOAD SETTINGS
  // ============================================
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  
  ALLOWED_FILE_TYPES: [
    '.pdf', '.doc', '.docx', 
    '.xlsx', '.xls', '.csv', 
    '.zip', '.txt'
  ],
  
  BLOCKED_FILE_TYPES: [
    '.exe', '.sh', '.bat', '.cmd', 
    '.app', '.dmg', '.msi', '.dll',
    '.scr', '.vbs', '.js' // Block executable scripts
  ],
  
  // ============================================
  // TOKEN & CODE EXPIRATION SETTINGS
  // ============================================
  UPLOAD_TOKEN_EXPIRY: 5 * 60 * 1000,           // 5 minutes
  DOWNLOAD_LINK_EXPIRY: 5 * 60 * 1000,          // 5 min from first click
  DOWNLOAD_LINK_EXPIRY_TOTAL: 7 * 24 * 60 * 60 * 1000, // 7 days total
  VERIFICATION_CODE_EXPIRY: 60 * 1000,          // 60 seconds
  
  // ============================================
  // ATTEMPT LIMITS (Scenario A Security)
  // ============================================
  MAX_LINK_CLICKS: 2,              // Link can be clicked 2 times max
  MAX_WORKER_ID_ATTEMPTS: 2,       // Can try Worker ID 2 times
  MAX_CODE_ATTEMPTS: 2,            // Can try verification code 2 times
  MAX_DOWNLOAD_ATTEMPTS: 2,        // Can download 2 times
  MAX_CODE_RESENDS: 1,             // Can resend code 1 time
  
  // ============================================
  // REVISION SETTINGS (Wrong File Workflow)
  // ============================================
  MAX_REVISIONS: 3, // REV01, REV02, REV03
  
  // ============================================
  // CONFIRMATION SETTINGS
  // ============================================
  RECEIPT_REMINDER_DELAY: 5 * 60 * 1000,        // 5 minutes (send reminder)
  RECEIPT_AUTO_CONFIRM_DELAY: 15 * 60 * 1000,   // 15 minutes (auto-confirm if no response)
  
  // ============================================
  // FILE RETENTION
  // ============================================
  FILE_RETENTION_DAYS: 365,  // 1 year in storage
  
  // ============================================
  // EMAIL SETTINGS
  // ============================================
  EMAIL_FROM: 'Schwarz IT File Transfer <noreply@schwarzit.com>',
  EMAIL_SUPPORT: 'support@schwarzit.com',
  EMAIL_SECURITY: 'security@schwarzit.com',
  
  // ============================================
  // SECURITY SETTINGS
  // ============================================
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_KEY || 'demo-key-change-in-production-very-secret-key-32chars',
  TOKEN_ENCRYPTION_ALGORITHM: 'aes-256-cbc',
  
  // Rate limiting (requests per IP per 15 minutes)
  IP_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100                    // Max 100 requests per IP
  },
  
  // ============================================
  // REQUEST NUMBER SETTINGS
  // ============================================
  REQUEST_NUMBER_PREFIX: 'REQ',
  REQUEST_NUMBER_DAILY_RESET: true, // Counter resets each day (0001, 0002...)
  
  // Transfer type codes
  TRANSFER_TYPES: {
    'EI': 'External → Internal',  // Supplier → Schwarz IT
    'IE': 'Internal → External',  // Schwarz IT → Supplier
    'II': 'Internal → Internal',  // Department → Department
    'EE': 'External → External'   // Supplier → Supplier (future)
  },
  
  // ============================================
  // RANK-BASED SECURITY (Future Phases)
  // ============================================
  RANK_POLICIES: {
    1: { 
      label: 'Junior',
      layers: 3  // Standard: Link + Worker ID + Code
    },
    2: { 
      label: 'Mid-level',
      layers: 3
    },
    3: { 
      label: 'Senior',
      layers: 3
    },
    4: { 
      label: 'Manager',
      requireSupervisorApproval: true,  // Future feature
      layers: 4
    },
    5: { 
      label: 'Executive',
      requireSMSVerification: true,     // Future feature
      layers: 5
    }
  },
  
  // ============================================
  // DEPARTMENT POLICIES (Future Phases)
  // ============================================
  DEPARTMENT_POLICIES: {
    'Finance': {
      maxFileSize: 50 * 1024 * 1024, // 50MB stricter
      allowedTypes: ['.pdf', '.xlsx', '.xls'],
      retentionDays: 2555, // 7 years for compliance
      auditLevel: 'FULL'
    },
    'IT': {
      maxFileSize: 100 * 1024 * 1024,
      allowedTypes: ['.pdf', '.doc', '.docx', '.zip', '.log', '.txt'],
      retentionDays: 365,
      auditLevel: 'STANDARD'
    },
    'HR': {
      maxFileSize: 50 * 1024 * 1024,
      allowedTypes: ['.pdf', '.doc', '.docx'],
      retentionDays: 1825, // 5 years
      auditLevel: 'FULL'
    },
    'Logistics': {
      maxFileSize: 100 * 1024 * 1024,
      allowedTypes: ['.pdf', '.xlsx', '.csv', '.zip'],
      retentionDays: 365,
      auditLevel: 'STANDARD'
    },
    'Marketing': {
      maxFileSize: 100 * 1024 * 1024,
      allowedTypes: ['.pdf', '.jpg', '.png', '.zip', '.doc'],
      retentionDays: 365,
      auditLevel: 'STANDARD'
    }
  },
  
  // ============================================
  // VALIDATION DOMAINS (for recipient email)
  // ============================================
  VALID_INTERNAL_DOMAINS: [
    '@schwarzit.com',
    '@schwarz-gruppe.com',  // Sister company
    '@lidl.com',            // Sister company
    '@kaufland.com',         // Sister company
    '@gmail.com'
  ],
  
  // ============================================
  // APP URLS (adjust based on deployment)
  // ============================================
  APP_URL: process.env.APP_URL || 'http://localhost:4004',
  RECEIVER_URL: process.env.RECEIVER_URL || 'http://localhost:4004/receive',
  TRACKING_URL: process.env.TRACKING_URL || 'http://localhost:4004/track',
  
  // ============================================
  // DEMO MODE
  // ============================================
//   DEMO_MODE: process.env.DEMO_MODE === 'true' || true,

  DEMO_MODE: false,

  // If demo mode, use console.log instead of real emails
  DEMO_EMAIL_TO_CONSOLE: false,
  
  // ============================================
  // ERROR MESSAGES (Generic for security)
  // ============================================
  ERROR_MESSAGES: {
    INVALID_TOKEN: 'Invalid or expired link',
    INVALID_CREDENTIALS: 'Invalid credentials',
    MAX_ATTEMPTS: 'Too many attempts. File locked.',
    FILE_LOCKED: 'File is locked for security reasons',
    EXPIRED: 'Link has expired',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access'
  },
  
  // ============================================
  // SUCCESS MESSAGES
  // ============================================
  SUCCESS_MESSAGES: {
    FILE_UPLOADED: 'File sent successfully!',
    WORKER_VERIFIED: 'Worker ID verified',
    CODE_VERIFIED: 'Verification code accepted',
    DOWNLOAD_COMPLETE: 'File downloaded successfully',
    RECEIPT_CONFIRMED: 'Receipt confirmed. Sender notified.'
  },
  
  // ============================================
  // VERIFICATION CODE SETTINGS
  // ============================================
  VERIFICATION_CODE_LENGTH: 6,      // 6 digits
  VERIFICATION_CODE_NUMERIC: true,  // Only numbers (482916)
  
  // ============================================
  // ENCRYPTION HELPERS
  // ============================================
  getEncryptionKey() {
    return Buffer.from(this.TOKEN_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  },
  
  // ============================================
  // HELPER: Check if email is internal
  // ============================================
  isInternalEmail(email) {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    return this.VALID_INTERNAL_DOMAINS.some(domain => 
      emailLower.endsWith(domain.toLowerCase())
    );
  },
  
  // ============================================
  // HELPER: Get transfer type from emails
  // ============================================
  getTransferType(senderEmail, recipientEmail) {
    const senderInternal = this.isInternalEmail(senderEmail);
    const recipientInternal = this.isInternalEmail(recipientEmail);
    
    if (!senderInternal && recipientInternal) return 'EI';  // External → Internal
    if (senderInternal && !recipientInternal) return 'IE';  // Internal → External
    if (senderInternal && recipientInternal) return 'II';   // Internal → Internal
    return 'EE'; // External → External
  },
  
  // ============================================
  // HELPER: Get file extension
  // ============================================
  getFileExtension(filename) {
    return '.' + filename.split('.').pop().toLowerCase();
  },
  
  // ============================================
  // HELPER: Validate file type
  // ============================================
  isFileTypeAllowed(filename) {
    const ext = this.getFileExtension(filename);
    
    // Check if blocked
    if (this.BLOCKED_FILE_TYPES.includes(ext)) {
      return { allowed: false, reason: 'File type blocked for security' };
    }
    
    // Check if allowed
    if (!this.ALLOWED_FILE_TYPES.includes(ext)) {
      return { allowed: false, reason: 'File type not allowed' };
    }
    
    return { allowed: true };
  },
  
  // ============================================
  // HELPER: Get MIME type from filename
  // ============================================
  getMimeType(filename) {
    const ext = this.getFileExtension(filename).replace('.', '');
    const mimeTypes = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'csv': 'text/csv',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'log': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
};