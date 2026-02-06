require('dotenv').config();
const cds = require('@sap/cds');
const crypto = require('crypto');
const config = require('./config');
const authHelpers = require('./auth-helpers');
const emailService = require('./email-service-enhanced');
const { storeDocument, retrieveDocument } = require('./file-storage');

module.exports = cds.service.impl(async function() {
    
    const { ShipmentDocuments, Workers, DownloadTokens, VerificationCodes } = this.entities;
    
    // ============================================
    // SCENARIO A: EXTERNAL → INTERNAL
    // Step 1: Supplier uploads document
    // ============================================
    
    this.on('uploadDocumentScenarioA', async (req) => {
        const { 
            senderName, 
            senderEmail, 
            recipientEmail, 
            documentName, 
            documentContent,
            senderMessage 
        } = req.data;
        
        const db = await cds.connect.to('db');
        const ipAddress = authHelpers.getClientIP(req.http?.req);
        const userAgent = authHelpers.getUserAgent(req.http?.req);
        
        try {
            // 1. Validate recipient email (must be internal)
            if (!config.isInternalEmail(recipientEmail)) {
                return req.reject(400, 'Recipient must have a valid Schwarz IT email address');
            }
            
            // 2. Validate file type
            const fileValidation = config.isFileTypeAllowed(documentName);
            if (!fileValidation.allowed) {
                return req.reject(400, fileValidation.reason);
            }
            
            // 3. Decode and validate file content
            const buffer = Buffer.from(documentContent, 'base64');
            if (buffer.length > config.MAX_FILE_SIZE) {
                return req.reject(400, `File size exceeds maximum of ${config.MAX_FILE_SIZE / 1024 / 1024}MB`);
            }
            
            // 4. Generate request number
            const transferType = config.getTransferType(senderEmail, recipientEmail);
            const requestNumber = await authHelpers.generateRequestNumber(transferType, db);
            
            // 5. Create shipment record
            const shipmentID = cds.utils.uuid();
            const storagePath = await storeDocument(shipmentID, documentName, buffer);
            const mimeType = config.getMimeType(documentName);
            const expiresAt = new Date(Date.now() + config.DOWNLOAD_LINK_EXPIRY_TOTAL);
            
            await db.run(INSERT.into('com.sap.workshop.shipment.ShipmentDocuments').entries({
                ID: shipmentID,
                requestNumber: requestNumber,
                senderName: senderName,
                senderEmail: senderEmail,
                senderType: 'EXTERNAL',
                recipientEmail: recipientEmail,
                recipientType: 'INTERNAL',
                documentName: documentName,
                documentSize: buffer.length,
                mimeType: mimeType,
                storagePath: storagePath,
                senderMessage: senderMessage || null,
                status: 'PENDING',
                uploadedAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
                linkClickCount: 0,
                workerIDAttempts: 0,
                downloadAttempts: 0,
                isLocked: false,
                receiptConfirmed: false,
                wrongFileReported: false,
                isRevision: false,
                revisionNumber: 0,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            }));
            
            // 6. Generate encrypted download token
            const tokenPayload = {
                requestNumber: requestNumber,
                shipmentID: shipmentID,
                recipientEmail: recipientEmail,
                createdAt: new Date().toISOString()
            };
            
            const encryptedPayload = authHelpers.encryptToken(tokenPayload);
            const downloadToken = crypto.randomBytes(32).toString('hex');
            
            await db.run(INSERT.into('com.sap.workshop.shipment.DownloadTokens').entries({
                token: downloadToken,
                encryptedPayload: encryptedPayload,
                shipment_ID: shipmentID,
                createdAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
                downloadCount: 0,
                maxDownloads: config.MAX_DOWNLOAD_ATTEMPTS,
                ipAddress: ipAddress,
                emailSent: false,
                sentTo: recipientEmail,
                emailSentAt: null,
                linkClickCount: 0,
                maxClicks: config.MAX_LINK_CLICKS
            }));
            
            // 7. Send email to recipient
            const accessLink = `${config.RECEIVER_URL}?token=${downloadToken}`;
            
            const emailSent = await emailService.sendFileAccessEmail({
                requestNumber: requestNumber,
                recipientEmail: recipientEmail,
                recipientName: recipientEmail.split('@')[0], // Use email prefix as name
                senderName: senderName,
                senderEmail: senderEmail,
                fileName: documentName,
                fileSize: buffer.length,
                senderMessage: senderMessage,
                accessLink: accessLink,
                expiresAt: expiresAt
            });
            
            if (emailSent) {
                await db.run(
                    UPDATE('com.sap.workshop.shipment.DownloadTokens')
                        .set({ 
                            emailSent: true,
                            emailSentAt: new Date().toISOString()
                        })
                        .where({ token: downloadToken })
                );
            }
            
            // 8. Log audit event
            await authHelpers.logAuditEvent({
                requestNumber: requestNumber,
                shipmentID: shipmentID,
                action: 'FILE_UPLOADED',
                success: true,
                ipAddress: ipAddress,
                userAgent: userAgent,
                metadata: {
                    fileName: documentName,
                    fileSize: buffer.length,
                    senderName: senderName,
                    senderEmail: senderEmail
                }
            }, db);
            
            return {
                success: true,
                message: config.SUCCESS_MESSAGES.FILE_UPLOADED,
                requestNumber: requestNumber,
                expiresAt: expiresAt,
                emailSent: emailSent
            };
            
        } catch (error) {
            console.error('❌ Upload failed:', error);
            return req.reject(500, 'Upload failed: ' + error.message);
        }
    });
    
    // ============================================
    // SCENARIO A: Layer 1 - Verify Download Token
    // ============================================
    
    this.on('verifyDownloadToken', async (req) => {
        const { token } = req.data;
        
        const db = await cds.connect.to('db');
        const ipAddress = authHelpers.getClientIP(req.http?.req);
        
        try {
            // 1. Get token record
            const tokenRecord = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                    .where({ token: token })
            );
            
            if (!tokenRecord) {
                return req.reject(404, config.ERROR_MESSAGES.INVALID_TOKEN);
            }
            
            // 2. Check if token expired
            if (new Date(tokenRecord.expiresAt) < new Date()) {
                return req.reject(403, config.ERROR_MESSAGES.EXPIRED);
            }
            
            // 3. Check click count
            if (tokenRecord.linkClickCount >= tokenRecord.maxClicks) {
                return req.reject(403, 'Link has been used maximum number of times');
            }
            
            // 4. Get shipment details
            const shipment = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                    .where({ ID: tokenRecord.shipment_ID })
            );
            
            if (!shipment) {
                return req.reject(404, config.ERROR_MESSAGES.NOT_FOUND);
            }
            
            // 5. Check if locked
            if (shipment.isLocked) {
                return req.reject(403, config.ERROR_MESSAGES.FILE_LOCKED);
            }
            
            // 6. Update click count and timestamp
            await db.run(
                UPDATE('com.sap.workshop.shipment.DownloadTokens')
                    .set({ 
                        linkClickCount: tokenRecord.linkClickCount + 1
                    })
                    .where({ token: token })
            );
            
            await db.run(
                UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                    .set({ 
                        linkClickedAt: new Date().toISOString(),
                        linkClickCount: shipment.linkClickCount + 1
                    })
                    .where({ ID: shipment.ID })
            );
            
            // 7. Log audit event
            await authHelpers.logAuditEvent({
                requestNumber: shipment.requestNumber,
                shipmentID: shipment.ID,
                action: 'LINK_CLICKED',
                success: true,
                ipAddress: ipAddress,
                metadata: {
                    clickCount: tokenRecord.linkClickCount + 1
                }
            }, db);
            
            // 8. Return file details (for Layer 2)
            return {
                success: true,
                requestNumber: shipment.requestNumber,
                senderName: shipment.senderName,
                senderEmail: shipment.senderEmail,
                fileName: shipment.documentName,
                fileSize: shipment.documentSize,
                senderMessage: shipment.senderMessage,
                recipientEmail: shipment.recipientEmail,
                attemptsRemaining: {
                    workerID: config.MAX_WORKER_ID_ATTEMPTS - shipment.workerIDAttempts,
                    linkClicks: tokenRecord.maxClicks - (tokenRecord.linkClickCount + 1)
                }
            };
            
        } catch (error) {
            console.error('❌ Token verification failed:', error);
            return req.reject(500, 'Verification failed: ' + error.message);
        }
    });
    
    // ============================================
    // SCENARIO A: Layer 2 - Verify Worker ID
    // ============================================
    
    this.on('verifyWorkerID', async (req) => {
        const { token, workerID } = req.data;
        
        const db = await cds.connect.to('db');
        const ipAddress = authHelpers.getClientIP(req.http?.req);
        
        try {
            // 1. Get token and shipment
            const tokenRecord = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                    .where({ token: token })
            );
            
            if (!tokenRecord) {
                return req.reject(404, config.ERROR_MESSAGES.INVALID_TOKEN);
            }
            
            const shipment = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                    .where({ ID: tokenRecord.shipment_ID })
            );
            
            if (!shipment || shipment.isLocked) {
                return req.reject(403, config.ERROR_MESSAGES.FILE_LOCKED);
            }
            
            // 2. Check attempts remaining
            if (shipment.workerIDAttempts >= config.MAX_WORKER_ID_ATTEMPTS) {
                // Lock the file
                await db.run(
                    UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                        .set({ 
                            isLocked: true,
                            lockedReason: 'Too many Worker ID attempts',
                            lockedAt: new Date().toISOString(),
                            status: 'LOCKED'
                        })
                        .where({ ID: shipment.ID })
                );
                
                await authHelpers.logAuditEvent({
                    requestNumber: shipment.requestNumber,
                    shipmentID: shipment.ID,
                    action: 'FILE_LOCKED',
                    success: false,
                    ipAddress: ipAddress,
                    errorMessage: 'Too many Worker ID attempts'
                }, db);
                
                return req.reject(403, config.ERROR_MESSAGES.MAX_ATTEMPTS);
            }
            
            // 3. Verify Worker ID
            const verification = await authHelpers.verifyWorkerID(
                workerID,
                shipment.recipientEmail,
                db
            );
            
            // 4. Update attempt count
            await db.run(
                UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                    .set({ 
                        workerIDAttempts: shipment.workerIDAttempts + 1
                    })
                    .where({ ID: shipment.ID })
            );
            
            if (!verification.valid) {
                // Log failed attempt
                await authHelpers.logAuditEvent({
                    requestNumber: shipment.requestNumber,
                    shipmentID: shipment.ID,
                    workerID: workerID,
                    action: 'WORKER_ID_FAILED',
                    success: false,
                    ipAddress: ipAddress,
                    errorMessage: verification.reason
                }, db);
                
                const attemptsRemaining = config.MAX_WORKER_ID_ATTEMPTS - (shipment.workerIDAttempts + 1);
                
                return {
                    success: false,
                    message: config.ERROR_MESSAGES.INVALID_CREDENTIALS,
                    attemptsRemaining: attemptsRemaining,
                    locked: attemptsRemaining === 0
                };
            }
            
            // 5. Worker ID verified! Generate 6-digit code
            const verificationCode = authHelpers.generate6DigitCode();
            const codeID = cds.utils.uuid();
            const codeExpiresAt = new Date(Date.now() + config.VERIFICATION_CODE_EXPIRY);
            
            await db.run(INSERT.into('com.sap.workshop.shipment.VerificationCodes').entries({
                codeID: codeID,
                code: verificationCode,
                tokenID: token,
                workerID: workerID,
                createdAt: new Date().toISOString(),
                expiresAt: codeExpiresAt.toISOString(),
                isUsed: false,
                attemptCount: 0,
                maxAttempts: config.MAX_CODE_ATTEMPTS,
                resendCount: 0,
                maxResends: config.MAX_CODE_RESENDS
            }));
            
            // 6. Update shipment
            await db.run(
                UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                    .set({ 
                        recipientWorkerID: workerID,
                        workerVerifiedAt: new Date().toISOString(),
                        status: 'WORKER_VERIFIED'
                    })
                    .where({ ID: shipment.ID })
            );
            
            // 7. Send verification code email
            await emailService.sendVerificationCodeEmail({
                requestNumber: shipment.requestNumber,
                recipientEmail: shipment.recipientEmail,
                recipientName: `${verification.worker.firstName} ${verification.worker.lastName}`,
                verificationCode: verificationCode,
                fileName: shipment.documentName
            });
            
            // 8. Log success
            await authHelpers.logAuditEvent({
                requestNumber: shipment.requestNumber,
                shipmentID: shipment.ID,
                workerID: workerID,
                action: 'WORKER_ID_VERIFIED',
                success: true,
                ipAddress: ipAddress
            }, db);
            
            return {
                success: true,
                message: config.SUCCESS_MESSAGES.WORKER_VERIFIED,
                workerName: `${verification.worker.firstName} ${verification.worker.lastName}`,
                department: verification.worker.department,
                position: verification.worker.position,
                codeSent: true,
                codeExpiresIn: config.VERIFICATION_CODE_EXPIRY / 1000 // seconds
            };
            
        } catch (error) {
            console.error('❌ Worker ID verification failed:', error);
            return req.reject(500, 'Verification failed: ' + error.message);
        }
    });
    
    // ============================================
    // SCENARIO A: Layer 3 - Verify 6-Digit Code
    // ============================================
    
    this.on('verifyCode', async (req) => {
        const { token, code } = req.data;
        
        const db = await cds.connect.to('db');
        const ipAddress = authHelpers.getClientIP(req.http?.req);
        
        try {
            // 1. Get verification code record
            const codeRecord = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.VerificationCodes')
                    .where({ tokenID: token, isUsed: false })
                    .orderBy({ createdAt: 'desc' })
            );
            
            if (!codeRecord) {
                return req.reject(404, 'No verification code found');
            }
            
            // 2. Check if expired
            if (new Date(codeRecord.expiresAt) < new Date()) {
                return req.reject(403, 'Verification code expired');
            }
            
            // 3. Check attempts
            if (codeRecord.attemptCount >= codeRecord.maxAttempts) {
                return req.reject(403, config.ERROR_MESSAGES.MAX_ATTEMPTS);
            }
            
            // 4. Get shipment
            const tokenRecord = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                    .where({ token: token })
            );
            
            const shipment = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                    .where({ ID: tokenRecord.shipment_ID })
            );
            
            // 5. Update attempt count
            await db.run(
                UPDATE('com.sap.workshop.shipment.VerificationCodes')
                    .set({ attemptCount: codeRecord.attemptCount + 1 })
                    .where({ codeID: codeRecord.codeID })
            );
            
            // 6. Verify code
            if (code !== codeRecord.code) {
                await authHelpers.logAuditEvent({
                    requestNumber: shipment.requestNumber,
                    shipmentID: shipment.ID,
                    workerID: codeRecord.workerID,
                    action: 'CODE_FAILED',
                    success: false,
                    ipAddress: ipAddress
                }, db);
                
                const attemptsRemaining = codeRecord.maxAttempts - (codeRecord.attemptCount + 1);
                
                return {
                    success: false,
                    message: config.ERROR_MESSAGES.INVALID_CREDENTIALS,
                    attemptsRemaining: attemptsRemaining
                };
            }
            
            // 7. Code verified! Mark as used
            await db.run(
                UPDATE('com.sap.workshop.shipment.VerificationCodes')
                    .set({ 
                        isUsed: true,
                        usedAt: new Date().toISOString()
                    })
                    .where({ codeID: codeRecord.codeID })
            );
            
            await db.run(
                UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                    .set({ 
                        codeVerifiedAt: new Date().toISOString(),
                        status: 'CODE_VERIFIED'
                    })
                    .where({ ID: shipment.ID })
            );
            
            // 8. Log success
            await authHelpers.logAuditEvent({
                requestNumber: shipment.requestNumber,
                shipmentID: shipment.ID,
                workerID: codeRecord.workerID,
                action: 'CODE_VERIFIED',
                success: true,
                ipAddress: ipAddress
            }, db);
            
            return {
                success: true,
                message: config.SUCCESS_MESSAGES.CODE_VERIFIED,
                shipmentID: shipment.ID,
                fileName: shipment.documentName,
                fileSize: shipment.documentSize,
                downloadsRemaining: config.MAX_DOWNLOAD_ATTEMPTS
            };
            
        } catch (error) {
            console.error('❌ Code verification failed:', error);
            return req.reject(500, 'Verification failed: ' + error.message);
        }
    });
    
    // ============================================
    // SCENARIO A: Download File (After all layers passed)
    // ============================================
    
    this.on('downloadFileScenarioA', async (req) => {
        const { token } = req.data;
        
        const db = await cds.connect.to('db');
        const ipAddress = authHelpers.getClientIP(req.http?.req);
        
        try {
            // 1. Verify all authentication layers passed
            const tokenRecord = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                    .where({ token: token })
            );
            
            if (!tokenRecord) {
                return req.reject(404, config.ERROR_MESSAGES.INVALID_TOKEN);
            }
            
            const shipment = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                    .where({ ID: tokenRecord.shipment_ID })
            );
            
            if (!shipment) {
                return req.reject(404, config.ERROR_MESSAGES.NOT_FOUND);
            }
            
            // 2. Check status (must be CODE_VERIFIED)
            if (shipment.status !== 'CODE_VERIFIED' && shipment.status !== 'DOWNLOADED') {
                return req.reject(403, 'Authentication not completed');
            }
            
            // 3. Check download limit
            if (shipment.downloadAttempts >= config.MAX_DOWNLOAD_ATTEMPTS) {
                return req.reject(403, 'Maximum download limit reached');
            }
            
            // 4. Retrieve file
            const fileBuffer = await retrieveDocument(shipment.storagePath);
            
            // 5. Update download count
            await db.run(
                UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                    .set({ 
                        downloadedAt: new Date().toISOString(),
                        downloadAttempts: shipment.downloadAttempts + 1,
                        status: 'DOWNLOADED'
                    })
                    .where({ ID: shipment.ID })
            );
            
            await db.run(
                UPDATE('com.sap.workshop.shipment.DownloadTokens')
                    .set({ downloadCount: tokenRecord.downloadCount + 1 })
                    .where({ token: token })
            );
            
            // 6. Log download
            await authHelpers.logAuditEvent({
                requestNumber: shipment.requestNumber,
                shipmentID: shipment.ID,
                workerID: shipment.recipientWorkerID,
                action: 'FILE_DOWNLOADED',
                success: true,
                ipAddress: ipAddress,
                metadata: {
                    downloadNumber: shipment.downloadAttempts + 1
                }
            }, db);
            
            // 7. Schedule receipt reminder (5 minutes)
            setTimeout(async () => {
                const currentShipment = await db.run(
                    SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                        .where({ ID: shipment.ID })
                );
                
                if (!currentShipment.receiptConfirmed) {
                    const worker = await db.run(
                        SELECT.one.from('com.sap.workshop.shipment.Workers')
                            .where({ workerID: currentShipment.recipientWorkerID })
                    );
                    
                    await emailService.sendReceiptReminderEmail({
                        requestNumber: currentShipment.requestNumber,
                        recipientEmail: currentShipment.recipientEmail,
                        recipientName: `${worker.firstName} ${worker.lastName}`,
                        fileName: currentShipment.documentName,
                        senderName: currentShipment.senderName,
                        confirmLink: `${config.APP_URL}/confirm?token=${token}`
                    });
                }
            }, config.RECEIPT_REMINDER_DELAY);
            
            // 8. Return file
            req._.res.set('Content-Type', shipment.mimeType);
            req._.res.set('Content-Disposition', `attachment; filename="${shipment.documentName}"`);
            
            return fileBuffer;
            
        } catch (error) {
            console.error('❌ Download failed:', error);
            return req.reject(500, 'Download failed: ' + error.message);
        }
    });
    
    // ============================================
    // SCENARIO A: Confirm Receipt
    // ============================================
    
    this.on('confirmReceiptScenarioA', async (req) => {
        const { token, receiptNote, wrongFile } = req.data;
        
        const db = await cds.connect.to('db');
        
        try {
            const tokenRecord = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.DownloadTokens')
                    .where({ token: token })
            );
            
            const shipment = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.ShipmentDocuments')
                    .where({ ID: tokenRecord.shipment_ID })
            );
            
            const worker = await db.run(
                SELECT.one.from('com.sap.workshop.shipment.Workers')
                    .where({ workerID: shipment.recipientWorkerID })
            );
            
            if (wrongFile) {
                // Wrong file reported
                await db.run(
                    UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                        .set({ 
                            wrongFileReported: true,
                            receiptNote: receiptNote,
                            status: 'WRONG_FILE_REPORTED'
                        })
                        .where({ ID: shipment.ID })
                );
                
                // Notify sender
                await emailService.sendWrongFileNotificationEmail({
                    requestNumber: shipment.requestNumber,
                    senderEmail: shipment.senderEmail,
                    senderName: shipment.senderName,
                    recipientEmail: shipment.recipientEmail,
                    fileName: shipment.documentName,
                    issueNote: receiptNote,
                    uploadCorrectedLink: `${config.APP_URL}/upload-correction?req=${shipment.requestNumber}`
                });
                
                return {
                    success: true,
                    message: 'Issue reported. Sender has been notified.'
                };
            } else {
                // File correct - confirm receipt
                await db.run(
                    UPDATE('com.sap.workshop.shipment.ShipmentDocuments')
                        .set({ 
                            receiptConfirmed: true,
                            receiptConfirmedAt: new Date().toISOString(),
                            receiptNote: receiptNote,
                            receivedAt: new Date().toISOString(),
                            status: 'RECEIVED'
                        })
                        .where({ ID: shipment.ID })
                );
                
                // Notify sender
                await emailService.sendSenderConfirmationEmail({
                    requestNumber: shipment.requestNumber,
                    senderEmail: shipment.senderEmail,
                    senderName: shipment.senderName,
                    recipientEmail: shipment.recipientEmail,
                    recipientName: `${worker.firstName} ${worker.lastName}`,
                    fileName: shipment.documentName,
                    receivedAt: new Date(),
                    receiptNote: receiptNote
                });
                
                await authHelpers.logAuditEvent({
                    requestNumber: shipment.requestNumber,
                    shipmentID: shipment.ID,
                    workerID: shipment.recipientWorkerID,
                    action: 'RECEIPT_CONFIRMED',
                    success: true
                }, db);
                
                return {
                    success: true,
                    message: config.SUCCESS_MESSAGES.RECEIPT_CONFIRMED
                };
            }
            
        } catch (error) {
            console.error('❌ Confirm receipt failed:', error);
            return req.reject(500, 'Confirmation failed: ' + error.message);
        }
    });
    
});