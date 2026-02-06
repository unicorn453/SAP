namespace com.sap.workshop.shipment;

using { cuid, managed } from '@sap/cds/common';

// ============================================
// WORKERS (Internal Schwarz IT Employees)
// ============================================
entity Workers {
    key workerID: String(50);
    email: String(200);
    firstName: String(100);
    lastName: String(100);
    department: String(100);
    position: String(100);
    rank: Integer; // 1=Junior, 2=Mid, 3=Senior, 4=Manager, 5=Executive
    isActive: Boolean default true;
    createdAt: DateTime;
    modifiedAt: DateTime;
}

// ============================================
// EXTERNAL PARTNERS (Vendors/Suppliers/Farmers)
// ============================================
entity ExternalPartners {
    key partnerID: String(50);
    companyName: String(200);
    contactEmail: String(200);
    contactPerson: String(200);
    partnerType: String(50); // SUPPLIER, VENDOR, MANUFACTURER, FARMER, OTHER
    isActive: Boolean default true;
    createdAt: DateTime;
    modifiedAt: DateTime;
}

// ============================================
// SHIPMENT DOCUMENTS (Keep your existing + enhancements)
// ============================================
entity ShipmentDocuments : managed {
    key ID: UUID;
    requestNumber: String(20); // REQ-20260205-EI-0001
    
    // Sender info
    senderName: String(200);
    senderEmail: String(200);
    senderType: String(20); // INTERNAL or EXTERNAL
    senderWorkerID: String(50); // If internal sender
    senderPartnerID: String(50); // If external sender
    
    // Receiver info
    recipientEmail: String(200);
    recipientType: String(20); // INTERNAL or EXTERNAL
    recipientWorkerID: String(50); // If internal receiver
    
    // Document metadata
    documentName: String(255);
    documentSize: Integer;
    mimeType: String(100);
    storagePath: String(500);
    senderMessage: String(500); // Optional message from sender
    
    // Status tracking
    status: String(50) default 'PENDING';
    uploadedAt: DateTime;
    downloadedAt: DateTime;
    receivedAt: DateTime;
    expiresAt: DateTime;
    
    // Security tracking
    linkClickCount: Integer default 0;
    linkClickedAt: DateTime;
    workerIDAttempts: Integer default 0;
    workerVerifiedAt: DateTime;
    codeVerifiedAt: DateTime;
    downloadAttempts: Integer default 0;
    
    isLocked: Boolean default false;
    lockedAt: DateTime;
    lockedReason: String(200);
    
    // Receipt confirmation
    receiptConfirmed: Boolean default false;
    receiptConfirmedAt: DateTime;
    receiptNote: String(500);
    wrongFileReported: Boolean default false;
    
    // Revision tracking
    isRevision: Boolean default false;
    revisionNumber: Integer default 0;
}

// ============================================
// TRANSFER REQUEST TRACKING (for request number generation)
// ============================================
entity TransferRequests {
    key ID: UUID;
    requestNumber: String(50);
    transferType: String(2);  // EI, IE, II, EE
    shipment: Association to ShipmentDocuments;
    createdAt: DateTime;
}

// ============================================
// UPLOAD TOKENS (Keep your existing)
// ============================================
entity UploadTokens {
    key token: String(64);
    createdAt: DateTime;
    expiresAt: DateTime;
    used: Boolean default false;
    shipmentID: UUID;
    ipAddress: String(50);
}

// ============================================
// DOWNLOAD TOKENS (Keep your existing + enhancements)
// ============================================
entity DownloadTokens {
    key token: String(64);
    encryptedPayload: String(500);
    shipment_ID: UUID;
    createdAt: DateTime;
    expiresAt: DateTime;
    downloadCount: Integer default 0;
    maxDownloads: Integer default 2;
    ipAddress: String(50);
    emailSent: Boolean default false;
    sentTo: String(200);
    
    // Email tracking
    emailSentAt: DateTime;
    emailOpenedAt: DateTime;
    linkClickCount: Integer default 0;
    maxClicks: Integer default 2;
}

// ============================================
// VERIFICATION CODES (NEW - for 6-digit codes)
// ============================================
entity VerificationCodes {
    key codeID: UUID;
    code: String(6); // 6-digit code
    tokenID: String(64);
    workerID: String(50);
    createdAt: DateTime;
    expiresAt: DateTime;
    isUsed: Boolean default false;
    usedAt: DateTime;
    attemptCount: Integer default 0;
    maxAttempts: Integer default 2;
    resendCount: Integer default 0;
    maxResends: Integer default 2;
}

// ============================================
// AUDIT LOG (FIXED - added partnerID + metadata)
// ============================================
entity AuditLog {
    key ID: UUID;
    requestNumber: String(50);
    shipmentID: UUID;
    workerID: String(50);
    partnerID: String(50);        // ← ADDED THIS (was missing!)
    action: String(100);
    timestamp: DateTime;
    ipAddress: String(50);
    userAgent: String(500);       // ← ADDED THIS
    success: Boolean;
    errorMessage: String(500);
    metadata: String(2000);       // ← ADDED THIS
}