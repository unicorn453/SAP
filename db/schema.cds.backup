namespace com.sap.workshop.shipment;

using { cuid, managed } from '@sap/cds/common';

// Simplified Shipment document - only essential data
entity ShipmentDocuments : managed {
    key ID: UUID;
    
    // Supplier info (minimal)
    supplierID: String(100);          // NEW: Supplier ID
    recipientEmail: String(200);       // NEW: Email to send token to
    
    // Document info only
    documentName: String(255);
    documentSize: Integer;
    mimeType: String(100);
    storagePath: String(500);
    
    // Status tracking
    downloadedAt: DateTime;
    receivedAt: DateTime;              // NEW: When company confirms receipt
    status: String(20) default 'PENDING';  // PENDING, DOWNLOADED, RECEIVED
}

// Upload tokens for suppliers
entity UploadTokens {
    key token: String(64);
    createdAt: DateTime;
    expiresAt: DateTime;
    used: Boolean default false;
    shipmentID: UUID;
    ipAddress: String(50);
}

// Download tokens for company
entity DownloadTokens {
    key token: String(64);
    shipment: Association to ShipmentDocuments;
    createdAt: DateTime;
    expiresAt: DateTime;
    downloadCount: Integer default 0;
    maxDownloads: Integer default 5;
    ipAddress: String(50);
    emailSent: Boolean default false;   // NEW: Track if email was sent
    sentTo: String(200);                // NEW: Email address it was sent to
}