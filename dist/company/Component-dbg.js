sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/core/ComponentSupport",
	"sap/m/App",
	"sap/m/Page",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Button",
	"sap/m/Input",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/MessageToast"
], function (UIComponent, ComponentSupport, App, Page, VBox, HBox, Button, Input, Label, Text, MessageToast) {
	"use strict";

	return UIComponent.extend("company.Component", {
		metadata: { 
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"]
		},

		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
			this._baseUrl = window.location.origin + '/odata/v4/shipment';
			this._currentShipment = null;
		},

		createContent: function () {
			var baseUrl = this._baseUrl;
			var that = this;

			// Controls
			var oTokenInput = new Input({ placeholder: "Paste your token here...", width: "100%", type: "Text" });
			var oRetrieveBtn = new Button({ text: "🔍 Retrieve Document", type: "Emphasized", press: retrieveDocument });
			var oDownloadBtn = new Button({ text: "⬇️ Download Document", type: "Accept", enabled: false, press: downloadDocument });
			var oConfirmBtn = new Button({ text: "✅ Confirm Receipt", type: "Emphasized", enabled: false, press: confirmReceipt });
			var oRetrieveResult = new Text({ text: "", wrapping: true });
			var oDocumentInfo = new Text({ text: "", wrapping: true });

			// Page layout
			var oPage = new Page({
				title: "🏢 Company Portal",
				id: "mainPage",
				content: [
					new VBox({
						items: [
							new Text({ text: "Download documents using the token from your email", wrapping: true }).addStyleClass("sapUiMediumMarginBottom"),
							new VBox({
								items: [
									new Text({ text: "Enter Download Token" }).addStyleClass("sapUiMediumMarginBottom"),
									new Text({ text: "Paste the token you received via email from the supplier" }).addStyleClass("sapUiSmallMarginBottom"),
									new Label({ text: "Download Token: *" }),
									oTokenInput,
									new HBox({ items: [oRetrieveBtn], justifyContent: "Start" }).addStyleClass("sapUiMediumMarginTop"),
									oRetrieveResult
								],
								width: "100%"
							}),
							new VBox({
								items: [
									new Text({ text: "📄 Document Details", visible: false, id: "docTitle" }).addStyleClass("sapUiMediumMarginBottom"),
									oDocumentInfo,
									new HBox({ items: [oDownloadBtn, oConfirmBtn], justifyContent: "Start" }).addStyleClass("sapUiMediumMarginTop"),
									new Text({ text: "", id: "actionResult", wrapping: true })
								],
								width: "100%"
							})
						],
						width: "100%"
					})
				]
			});

			var oApp = new App({ initialPage: "mainPage" });
			oApp.addPage(oPage);

			// handlers
			async function retrieveDocument() {
				var token = oTokenInput.getValue().trim();
				oRetrieveResult.setText("");
				oDocumentInfo.setText("");
				oDownloadBtn.setEnabled(false);
				oConfirmBtn.setEnabled(false);

				if (!token) {
					oRetrieveResult.setText("❌ Please enter a token");
					return;
				}
				MessageToast.show("Retrieving document...");
				try {
					var resp = await fetch(baseUrl + '/retrieveDocument', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token: token })
					});
					if (!resp.ok) {
						var txt = await resp.text();
						throw new Error(txt || "Failed to retrieve document");
					}
					var data = await resp.json();
					that._currentShipment = data;

					var info = [
						"Document Name: " + data.documentName,
						"File Size: " + formatFileSize(data.documentSize),
						"Supplier ID: " + data.supplierID,
						"Uploaded: " + new Date(data.createdAt).toLocaleString(),
						"Status: " + data.status
					].join("\n\n");
					oDocumentInfo.setText(info);
					oRetrieveResult.setText("✅ Document found!");
					oDownloadBtn.setEnabled(true);
					oConfirmBtn.setEnabled(true);
					// show document title Text control
					oPage.getContent()[0].getItems()[1].getItems()[0].setVisible(true);
				} catch (e) {
					oRetrieveResult.setText("❌ Error: " + e.message);
				}
			}

			async function downloadDocument() {
				var token = oTokenInput.getValue().trim();
				var actionResult = oPage.getContent()[0].getItems()[1].getItems()[3];
				actionResult.setText("⏳ Downloading document...");
				try {
					var resp = await fetch(baseUrl + '/downloadDocument', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token: token })
					});
					if (!resp.ok) throw new Error("Download failed");

					var blob = await resp.blob();
					var url = window.URL.createObjectURL(blob);
					var a = document.createElement('a');
					a.href = url;
					a.download = (that._currentShipment && that._currentShipment.documentName) || "document";
					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(url);
					document.body.removeChild(a);

					actionResult.setText("✅ Document downloaded successfully!");
				} catch (e) {
					actionResult.setText("❌ Error: " + e.message);
				}
			}

			async function confirmReceipt() {
				var token = oTokenInput.getValue().trim();
				var actionResult = oPage.getContent()[0].getItems()[1].getItems()[3];
				actionResult.setText("⏳ Confirming receipt...");
				try {
					var resp = await fetch(baseUrl + '/confirmReceipt', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token: token })
					});
					if (!resp.ok) throw new Error("Failed to confirm receipt");
					actionResult.setText("✅ Receipt confirmed! Supplier has been notified.");
				} catch (e) {
					actionResult.setText("❌ Error: " + e.message);
				}
			}

			function formatFileSize(bytes) {
				if (!bytes && bytes !== 0) return "Unknown";
				if (bytes < 1024) return bytes + " B";
				if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
				return (bytes / (1024 * 1024)).toFixed(2) + " MB";
			}

			var oApp = new App({ initialPage: oPage });
			oApp.addPage(oPage);
			
			return oApp;
		}
	});
});
