namespace com.sap.workshop.shipment;

using { cuid, managed } from '@sap/cds/common';

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
    uploadTokens: Association to many UploadTokens on uploadTokens.shipmentID = partnerID;
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
    supplier: Association to ExternalPartners;
}