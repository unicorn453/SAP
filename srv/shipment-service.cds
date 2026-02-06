using { com.sap.workshop.shipment as db } from '../db/schema';

service ShipmentService {
    
    // ===== NEW: Expose Workers and Partners (Read-only) =====
    @readonly entity Workers as projection on db.Workers;
    @readonly entity ExternalPartners as projection on db.ExternalPartners;
    
    // ===== Existing: Shipment Documents =====
    entity ShipmentDocuments as projection on db.ShipmentDocuments;
    
    // ===== NEW: Expose tokens and logs for debugging =====
    @readonly entity UploadTokens as projection on db.UploadTokens;
    @readonly entity DownloadTokens as projection on db.DownloadTokens;
    @readonly entity VerificationCodes as projection on db.VerificationCodes;
    @readonly entity AuditLog as projection on db.AuditLog;
    
    // ===== SUPPLIER ACTIONS (Anonymous) =====
    
    // Step 1: Supplier requests upload token
    action generateUploadToken() returns {
        token: String;
        uploadUrl: String;
        expiresAt: DateTime;
        message: String;
    };
    
    // Step 2: Supplier uploads document (simplified)
    action uploadDocument(
        token: String,
        supplierID: String,
        recipientEmail: String,
        documentName: String,
        documentContent: LargeBinary
    ) returns {
        success: Boolean;
        message: String;
        downloadToken: String;
        emailSent: Boolean;
    };
    
    // ===== COMPANY ACTIONS (Anonymous) =====
    
    // Step 1: Company retrieves document info using token
    action retrieveDocument(token: String) returns {
        shipmentID: UUID;
        supplierID: String;
        documentName: String;
        documentSize: Integer;
        mimeType: String;
        status: String;
        createdAt: DateTime;
    };
    
    // Step 2: Company downloads the actual document
    action downloadDocument(token: String) returns LargeBinary;
    
    // Step 3: Company confirms receipt
    action confirmReceipt(token: String) returns {
        success: Boolean;
        message: String;
        receivedAt: DateTime;
        confirmationSent: Boolean;
    };
    // ===== SCENARIO A ACTIONS (Enhanced 3-Layer Auth) =====
    
    action uploadDocumentScenarioA(
        senderName: String,
        senderEmail: String,
        recipientEmail: String,
        documentName: String,
        documentContent: LargeBinary,
        senderMessage: String
    ) returns {
        success: Boolean;
        message: String;
        requestNumber: String;
        expiresAt: DateTime;
        emailSent: Boolean;
    };
    
    action verifyDownloadToken(token: String) returns {
        success: Boolean;
        requestNumber: String;
        senderName: String;
        senderEmail: String;
        fileName: String;
        fileSize: Integer;
        senderMessage: String;
        recipientEmail: String;
        attemptsRemaining: {
            workerID: Integer;
            linkClicks: Integer;
        };
    };
    
    action verifyWorkerID(
        token: String,
        workerID: String
    ) returns {
        success: Boolean;
        message: String;
        workerName: String;
        department: String;
        position: String;
        codeSent: Boolean;
        codeExpiresIn: Integer;
        attemptsRemaining: Integer;
        locked: Boolean;
    };
    
    action verifyCode(
        token: String,
        code: String
    ) returns {
        success: Boolean;
        message: String;
        shipmentID: UUID;
        fileName: String;
        fileSize: Integer;
        downloadsRemaining: Integer;
        attemptsRemaining: Integer;
    };
    
    action downloadFileScenarioA(token: String) returns LargeBinary;
    
    action confirmReceiptScenarioA(
        token: String,
        receiptNote: String,
        wrongFile: Boolean
    ) returns {
        success: Boolean;
        message: String;
    };
}