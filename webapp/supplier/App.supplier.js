sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/core/ComponentSupport",
	"sap/m/App",
	"sap/m/Page",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Button",
	"sap/m/Input",
	"sap/m/FileUploader",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/MessageToast"
], function (UIComponent, ComponentSupport, App, Page, VBox, HBox, Button, Input, FileUploader, Label, Text, MessageToast) {
	"use strict";

	return UIComponent.extend("supplier.Component", {
		metadata: {
			manifest: "json"
		},

		init: function () {
			UIComponent.prototype.init.apply(this, arguments);

			var baseUrl = window.location.origin + '/odata/v4/shipment';
			var selectedFile = null;

			// Controls
			var oTokenInput = new Input({ placeholder: "Generate token first", editable: false, width: "100%" });
			var oSupplierInput = new Input({ placeholder: "e.g., SUP-12345", width: "100%" });
			var oRecipientInput = new Input({ placeholder: "recipient@company.com", width: "100%" });
			var oFileUploader = new FileUploader({
				name: "file",
				accept: ".pdf,.xlsx,.xls,.csv,.doc,.docx",
				uploadOnChange: false,
				change: function (oEvent) {
					var aFiles = oEvent.getParameter("files") || [];
					selectedFile = aFiles.length ? aFiles[0] : null;
				},
				width: "100%"
			});

			var oGenBtn = new Button({
				text: "🔑 Generate Upload Token",
				type: "Emphasized",
				press: async function () {
					oGenBtn.setEnabled(false);
					try {
						MessageToast.show("Generating secure token...");
						var resp = await fetch(baseUrl + '/generateUploadToken', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
						if (!resp.ok) throw new Error("Failed to generate token");
						var data = await resp.json();
						oTokenInput.setValue(data.token);
						MessageToast.show("✅ Token generated (valid 5 minutes)");
						oUploadBtn.setEnabled(true);
					} catch (e) {
						MessageToast.show("❌ " + e.message);
						oGenBtn.setEnabled(true);
					}
				}
			});

			var oUploadBtn = new Button({
				text: "📤 Upload Document",
				type: "Emphasized",
				enabled: false,
				press: async function () {
					oUploadBtn.setEnabled(false);
					try {
						if (!selectedFile) throw new Error("Please select a file");
						var token = oTokenInput.getValue();
						var supplierID = oSupplierInput.getValue();
						var recipientEmail = oRecipientInput.getValue();

						// Read file as base64
						var fileBase64 = await new Promise(function (resolve, reject) {
							var reader = new FileReader();
							reader.onload = function () { resolve(reader.result.split(',')[1]); };
							reader.onerror = reject;
							reader.readAsDataURL(selectedFile);
						});

						var payload = {
							token: token,
							supplierID: supplierID,
							recipientEmail: recipientEmail,
							documentName: selectedFile.name,
							documentContent: fileBase64
						};

						MessageToast.show("Uploading document...");
						var resp = await fetch(baseUrl + '/uploadDocument', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload)
						});
						if (!resp.ok) {
							var txt = await resp.text();
							throw new Error(txt || "Upload failed");
						}

						MessageToast.show("✅ Document uploaded and email sent!");
						oSuccessText.setText("Download token has been sent to: " + recipientEmail);
						oSuccessText.setVisible(true);

						// reset
						oTokenInput.setValue("");
						oSupplierInput.setValue("");
						oRecipientInput.setValue("");
						oFileUploader.clear();
						selectedFile = null;
						oUploadBtn.setEnabled(false);
						oGenBtn.setEnabled(true);
					} catch (e) {
						MessageToast.show("❌ " + e.message);
						oUploadBtn.setEnabled(true);
					}
				}
			});

			var oSuccessText = new Text({ text: "", visible: false, wrapping: true });

			// Layout construction
			var oGenerateSection = new VBox({
				items: [
					new Text({ text: "Generate Upload Token", fontWeight: "bold" }),
					new Text({ text: "Generate a secure token to authenticate your upload (valid for 5 minutes)" }),
					new HBox({ items: [oGenBtn] })
				],
				width: "100%",
				justifyContent: "Start",
				renderType: "Bare"
			});

			var oUploadSection = new VBox({
				items: [
					new Text({ text: "Upload Document", fontWeight: "bold" }),
					new Text({ text: "Fill in your details and upload the document" }),
					new Label({ text: "Upload Token (auto-filled):" }),
					oTokenInput,
					new Label({ text: "Your Supplier ID: *" }),
					oSupplierInput,
					new Label({ text: "Recipient Email (who will receive the download token): *" }),
					oRecipientInput,
					new Label({ text: "📄 Upload Document (PDF, Excel, CSV, etc.): *" }),
					oFileUploader,
					new Text({ text: "Max size: 50MB", wrapping: true }),
					new HBox({ items: [oUploadBtn], justifyContent: "Start", width: "100%" })
				],
				width: "100%",
				spacing: "1rem"
			});

			var oPage = new Page({
				title: "📦 Supplier Portal",
				content: [
					new VBox({
						items: [
							new Text({ text: "Upload documents securely - Token will be sent via email", wrapping: true }),
							oGenerateSection,
							oUploadSection,
							oSuccessText
						],
						width: "100%",
						renderType: "Bare",
						grow: true
					})
				]
			});

			var oApp = new App({ initialPage: oPage });
			oApp.addPage(oPage);

			// place app into document body
			oApp.placeAt("content");

			// expose buttons/controls if needed later
			this._controls = {
				genBtn: oGenBtn,
				uploadBtn: oUploadBtn,
				tokenInput: oTokenInput,
				successText: oSuccessText
			};
		}
	});
});