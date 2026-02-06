const crypto = require('crypto');
const config = require('./config');

// ============================================
// REQUEST NUMBER GENERATION
// ============================================

/**
 * Generate unique request number: REQ-20260205-EI-0001
 * @param {string} transferType - EI, IE, II, or EE
 * @param {object} db - Database connection
 * @returns {Promise<string>} Request number
 */
async function generateRequestNumber(transferType, db) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // 20260205
    
    // Get today's count for this transfer type
    const prefix = `${config.REQUEST_NUMBER_PREFIX}-${dateStr}-${transferType}`;
    
    if (config.REQUEST_NUMBER_DAILY_RESET) {
        // Find highest number for today
        const result = await db.run(
            `SELECT requestNumber FROM com_sap_workshop_shipment_TransferRequests 
             WHERE requestNumber LIKE '${prefix}-%' 
             ORDER BY requestNumber DESC 
             LIMIT 1`
        );
        
        let nextNumber = 1;
        if (result && result.length > 0) {
            const lastNumber = result[0].requestNumber.split('-').pop();
            nextNumber = parseInt(lastNumber) + 1;
        }
        
        const paddedNumber = String(nextNumber).padStart(4, '0'); // 0001
        return `${prefix}-${paddedNumber}`;
    } else {
        // Global counter (never resets)
        const result = await db.run(
            `SELECT requestNumber FROM com_sap_workshop_shipment_TransferRequests 
             ORDER BY createdAt DESC 
             LIMIT 1`
        );
        
        let nextNumber = 1;
        if (result && result.length > 0) {
            const lastNumber = result[0].requestNumber.split('-').pop();
            nextNumber = parseInt(lastNumber) + 1;
        }
        
        const paddedNumber = String(nextNumber).padStart(4, '0');
        return `${prefix}-${paddedNumber}`;
    }
}

// ============================================
// TOKEN ENCRYPTION/DECRYPTION
// ============================================

/**
 * Encrypt token payload for URL
 * @param {object} payload - Data to encrypt
 * @returns {string} Encrypted string
 */
function encryptToken(payload) {
    const iv = crypto.randomBytes(16);
    const key = config.getEncryptionKey();
    
    const cipher = crypto.createCipheriv(config.TOKEN_ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted data
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt token payload from URL
 * @param {string} encryptedData - Encrypted string
 * @returns {object} Decrypted payload
 */
function decryptToken(encryptedData) {
    try {
        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = config.getEncryptionKey();
        
        const decipher = crypto.createDecipheriv(config.TOKEN_ENCRYPTION_ALGORITHM, key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('❌ Token decryption failed:', error.message);
        return null;
    }
}

// ============================================
// VERIFICATION CODE GENERATION
// ============================================

/**
 * Generate 6-digit verification code
 * @returns {string} 6-digit code (e.g., "482916")
 */
function generate6DigitCode() {
    if (config.VERIFICATION_CODE_NUMERIC) {
        // Generate 6-digit numeric code
        return String(Math.floor(100000 + Math.random() * 900000));
    } else {
        // Generate 6-character alphanumeric code
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }
}

// ============================================
// WORKER ID VALIDATION
// ============================================

/**
 * Verify Worker ID matches recipient email
 * @param {string} workerID - Worker ID entered by user
 * @param {string} expectedEmail - Email from download token
 * @param {object} db - Database connection
 * @returns {Promise<object>} Validation result
 */
async function verifyWorkerID(workerID, expectedEmail, db) {
    // Query Workers table
    const worker = await db.run(
        `SELECT * FROM com_sap_workshop_shipment_Workers 
         WHERE workerID = ?`,
        [workerID]
    );
    
    if (!worker || worker.length === 0) {
        return {
            valid: false,
            reason: 'WORKER_NOT_FOUND',
            message: config.ERROR_MESSAGES.INVALID_CREDENTIALS
        };
    }
    
    const workerData = worker[0];
    
    // Check if worker is active
    if (!workerData.isActive) {
        return {
            valid: false,
            reason: 'WORKER_DEACTIVATED',
            message: config.ERROR_MESSAGES.INVALID_CREDENTIALS
        };
    }
    
    // Check if email matches
    if (workerData.email.toLowerCase() !== expectedEmail.toLowerCase()) {
        return {
            valid: false,
            reason: 'EMAIL_MISMATCH',
            message: config.ERROR_MESSAGES.INVALID_CREDENTIALS
        };
    }
    
    // All checks passed
    return {
        valid: true,
        worker: {
            workerID: workerData.workerID,
            firstName: workerData.firstName,
            lastName: workerData.lastName,
            email: workerData.email,
            department: workerData.department,
            position: workerData.position,
            rank: workerData.rank
        }
    };
}

// ============================================
// SECURITY QUESTION VALIDATION (Future - Scenario B)
// ============================================

/**
 * Verify security question answers (for external receivers)
 * @param {string} answer1 - User's answer to question 1
 * @param {string} expectedAnswer1 - Correct answer (hashed)
 * @param {string} answer2 - User's answer to question 2
 * @param {string} expectedAnswer2 - Correct answer (hashed)
 * @returns {object} Validation result
 */
function verifySecurityAnswers(answer1, expectedAnswer1, answer2, expectedAnswer2) {
    // Normalize answers (lowercase, trim, remove special chars)
    const normalize = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    
    const normalized1 = normalize(answer1);
    const normalized2 = normalize(answer2);
    
    const expectedNorm1 = normalize(expectedAnswer1);
    const expectedNorm2 = normalize(expectedAnswer2);
    
    // Calculate Levenshtein distance (allow small typos)
    const distance1 = levenshteinDistance(normalized1, expectedNorm1);
    const distance2 = levenshteinDistance(normalized2, expectedNorm2);
    
    const threshold1 = Math.floor(expectedNorm1.length * 0.15); // 15% error tolerance
    const threshold2 = Math.floor(expectedNorm2.length * 0.15);
    
    const answer1Valid = distance1 <= threshold1;
    const answer2Valid = distance2 <= threshold2;
    
    if (answer1Valid && answer2Valid) {
        return { valid: true };
    } else {
        return {
            valid: false,
            reason: 'INCORRECT_ANSWERS',
            message: config.ERROR_MESSAGES.INVALID_CREDENTIALS
        };
    }
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a 
 * @param {string} b 
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

// ============================================
// PASSWORD HASHING (for security answers)
// ============================================

/**
 * Hash a security answer
 * @param {string} answer - Plain text answer
 * @returns {string} Hashed answer
 */
function hashAnswer(answer) {
    const normalized = answer.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify hashed answer
 * @param {string} answer - User's answer
 * @param {string} hash - Stored hash
 * @returns {boolean}
 */
function verifyHashedAnswer(answer, hash) {
    return hashAnswer(answer) === hash;
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log action to audit trail
 * @param {object} params - Log parameters
 * @param {object} db - Database connection
 */
async function logAuditEvent(params, db) {
    const {
        requestNumber,
        shipmentID,
        workerID,
        partnerID,
        action,
        success,
        errorMessage,
        ipAddress,
        userAgent,
        metadata
    } = params;
    
    const logID = crypto.randomBytes(16).toString('hex');
    
    await db.run(
        `INSERT INTO com_sap_workshop_shipment_AuditLog 
         (ID, requestNumber, shipmentID, workerID, partnerID, action, timestamp, 
          ipAddress, userAgent, success, errorMessage, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            logID,
            requestNumber || null,
            shipmentID || null,
            workerID || null,
            partnerID || null,
            action,
            new Date().toISOString(),
            ipAddress || 'unknown',
            userAgent || 'unknown',
            success ? 1 : 0,
            errorMessage || null,
            metadata ? JSON.stringify(metadata) : null
        ]
    );
    
    console.log(`📝 Audit log: [${action}] ${success ? '✅' : '❌'}${errorMessage ? ' - ' + errorMessage : ''}`);
}

// ============================================
// IP ADDRESS EXTRACTION
// ============================================

/**
 * Get client IP address from request
 * @param {object} req - Express request object
 * @returns {string} IP address
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'unknown';
}

/**
 * Get user agent from request
 * @param {object} req - Express request object
 * @returns {string} User agent
 */
function getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Request numbers
    generateRequestNumber,
    
    // Token encryption
    encryptToken,
    decryptToken,
    
    // Verification codes
    generate6DigitCode,
    
    // Worker validation
    verifyWorkerID,
    
    // Security questions (future)
    verifySecurityAnswers,
    hashAnswer,
    verifyHashedAnswer,
    
    // Audit logging
    logAuditEvent,
    
    // Request helpers
    getClientIP,
    getUserAgent
};