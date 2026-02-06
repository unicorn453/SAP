require('dotenv').config(); // Add this line
const cds = require('@sap/cds');
const crypto = require('crypto');
const { storeDocument, retrieveDocument } = require('./file-storage');
const { sendDownloadTokenEmail, sendReceiptConfirmationEmail } = require('./email-service'); // Add this line

module.exports = cds.service.impl(async function() {
    
    const { ShipmentDocuments } = this.entities;
    
    // ===== SUPPLIER: Generate Upload Token =====
    this.on('generateUploadToken', async (req) => {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes
        
        const db = await cds.connect.to('db');
        
        await db.run(INSERT.into('com.sap.workshop.shipment.UploadTokens').entries({
            token: token,
            createdAt: new Date(),
            expiresAt: expiresAt,
            used: false,
            ipAddress: req.http?.req?.ip || 'unknown'
        }));
        
        return {
            token: token,
            uploadUrl: `/shipment/upload/${token}`,
            expiresAt: expiresAt,
            message: 'Token generated. Valid for 5 minutes.'
        };
    });
    
    // ===== SUPPLIER: Upload Document (Simplified) =====
    this.on('uploadDocument', async (req) => {
        const { token, supplierID, recipientEmail, documentName, documentContent } = req.data;
        
        const db = await cds.connect.to('db');
        
        // 1. Verify upload token
        const tokenRecord = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.UploadTokens')
                .where({ token: token, used: false })
                .and('expiresAt >', new Date())
        );
            
        if (!tokenRecord) {
            return req.reject(403, 'Invalid or expired upload token');
        }
        
        // 2. Create shipment document
        const shipmentID = cds.utils.uuid();
        
        // 3. Store the actual file
        const buffer = Buffer.from(documentContent, 'base64');
        const storagePath = await storeDocument(shipmentID, documentName, buffer);
        
        // 4. Get file metadata
        const mimeType = getMimeType(documentName);
        const documentSize = buffer.length;
        
        // 5. Save to database (simplified fields only)
        await db.run(INSERT.into('com.sap.workshop.shipment.ShipmentDocuments').entries({
            ID: shipmentID,
            supplierID: supplierID,
            recipientEmail: recipientEmail,
            documentName: documentName,
            documentSize: documentSize,
            mimeType: mimeType,
            storagePath: storagePath,
            status: 'PENDING',
            createdAt: new Date(),
            modifiedAt: new Date()
        }));
        
        // 6. Generate download token for company
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60000); // 7 days
        
        await db.run(INSERT.into('com.sap.workshop.shipment.DownloadTokens').entries({
            token: downloadToken,
            shipment_ID: shipmentID,
            createdAt: new Date(),
            expiresAt: downloadExpiresAt,
            downloadCount: 0,
            maxDownloads: 5,
            ipAddress: req.http?.req?.ip || 'unknown',
            emailSent: false,
            sentTo: recipientEmail
        }));
        
        // 7. Mark upload token as used
        await db.run(
            UPDATE('com.sap.workshop.shipment.UploadTokens')
                .set({ used: true, shipmentID: shipmentID })
                .where({ token: token })
        );
        
        // 8. TODO: Send email to recipientEmail with downloadToken
        // For now, we'll just return it - you'll implement email service later
        //console.log(`📧 Email should be sent to: ${recipientEmail}`);
        //console.log(`📧 Download Token: ${downloadToken}`);
        
        // TODO: Implement email sending here
        // const emailSent = await sendEmailWithToken(recipientEmail, downloadToken);
        //const emailSent = false; // Placeholder until email service is ready
       // 8. Send email to recipientEmail with downloadToken
        console.log(`📧 Sending email to: ${recipientEmail}`);
        const emailSent = await sendDownloadTokenEmail(recipientEmail, downloadToken, supplierID);

        if (emailSent) {
            await db.run(
                UPDATE('com.sap.workshop.shipment.DownloadTokens')
                    .set({ emailSent: true })
                    .where({ token: downloadToken })
            );
        }

        return {
            success: true,
            message: emailSent ? 'Document uploaded and email sent successfully!' : 'Document uploaded but email failed.',
            downloadToken: downloadToken, // Remove this in production (only for testing)
            emailSent: emailSent
        };
    });
    
    // ===== COMPANY: Retrieve Document Info =====
    this.on('retrieveDocument', async (req) => {
        const { token } = req.data;
        
        const db = await cds.connect.to('db');
        
        // 1. Verify download token
        const tokenRecord = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                .where({ token: token })
                .and('expiresAt >', new Date())
        );
        
        if (!tokenRecord) {
            return req.reject(403, 'Invalid or expired download token');
        }
        
        // 2. Get shipment document
        const shipment = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                .where({ ID: tokenRecord.shipment_ID })
        );
        
        if (!shipment) {
            return req.reject(404, 'Document not found');
        }
        
        // 3. Return document metadata (no file content yet)
        return {
            shipmentID: shipment.ID,
            supplierID: shipment.supplierID,
            documentName: shipment.documentName,
            documentSize: shipment.documentSize,
            mimeType: shipment.mimeType,
            status: shipment.status,
            createdAt: shipment.createdAt
        };
    });
    
    // ===== COMPANY: Download Actual Document =====
    this.on('downloadDocument', async (req) => {
        const { token } = req.data;
        
        const db = await cds.connect.to('db');
        
        // 1. Verify download token
        const tokenRecord = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                .where({ token: token })
                .and('expiresAt >', new Date())
        );
        
        if (!tokenRecord) {
            return req.reject(403, 'Invalid or expired download token');
        }
        
        // 2. Check download limit
        if (tokenRecord.downloadCount >= tokenRecord.maxDownloads) {
            return req.reject(403, 'Maximum download limit reached');
        }
        
        // 3. Get shipment document
        const shipment = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                .where({ ID: tokenRecord.shipment_ID })
        );
        
        if (!shipment) {
            return req.reject(404, 'Document not found');
        }
        
        // 4. Retrieve file from storage
        const fileBuffer = await retrieveDocument(shipment.storagePath);
        
        // 5. Update download count and status
        await db.run(
            UPDATE('com.sap.workshop.shipment.DownloadTokens')
                .set({ downloadCount: tokenRecord.downloadCount + 1 })
                .where({ token: token })
        );
        
        await db.run(
            UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                .set({ 
                    status: 'DOWNLOADED',
                    downloadedAt: new Date()
                })
                .where({ ID: shipment.ID })
        );
        
        // 6. Return file as binary
        req._.res.set('Content-Type', shipment.mimeType);
        req._.res.set('Content-Disposition', `attachment; filename="${shipment.documentName}"`);
        
        return fileBuffer;
    });
   
    // ===== COMPANY: Confirm Receipt =====
    this.on('confirmReceipt', async (req) => {
        const { token } = req.data;
        
        const db = await cds.connect.to('db');
        
        // 1. Verify download token
        const tokenRecord = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                .where({ token: token })
                .and('expiresAt >', new Date())
        );
        
        if (!tokenRecord) {
            return req.reject(403, 'Invalid or expired download token');
        }
        
        // 2. Get shipment document
        const shipment = await db.run(
            SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                .where({ ID: tokenRecord.shipment_ID })
        );
        
        if (!shipment) {
            return req.reject(404, 'Document not found');
        }
        
        // 3. Update status to RECEIVED
        const receivedAt = new Date();
        
        await db.run(
            UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                .set({ 
                    status: 'RECEIVED',
                    receivedAt: receivedAt
                })
                .where({ ID: shipment.ID })
        );
        
        // 4. Send confirmation email to supplier
        console.log(`📧 Sending confirmation to: ${shipment.recipientEmail}`);
        const confirmationSent = await sendReceiptConfirmationEmail(
            shipment.supplierID,
            shipment.recipientEmail,
            shipment.documentName
        );
        
        return {
            success: true,
            message: 'Receipt confirmed successfully',
            receivedAt: receivedAt,
            confirmationSent: confirmationSent
        };
    });
    
    // Helper function to determine MIME type
    function getMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'pdf': 'application/pdf',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'csv': 'text/csv',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'zip': 'application/zip'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
});