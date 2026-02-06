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
  "sap/m/MessageToast",
  "sap/ui/unified/FileUploader"
], function (
  UIComponent,
  _ComponentSupport,
  App,
  Page,
  VBox,
  HBox,
  Button,
  Input,
  Label,
  Text,
  MessageToast,
  FileUploader
) {
  "use strict";

  return UIComponent.extend("supplier.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },
    
    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      // Router is optional for this component
      var oRouter = this.getRouter && this.getRouter();
      if (oRouter) {
        oRouter.initialize();
      }
    },

    createContent: function () {
      var that = this;
      var baseUrl = "/odata/v4/shipment";
      this._selectedFile = null;

      // Token and Input Fields
      var oTokenInput = new Input({ 
        placeholder: "Generate token first", 
        editable: false, 
        width: "100%" 
      });
      
      var oSupplierInput = new Input({ 
        placeholder: "e.g., SUP-12345", 
        width: "100%" 
      });
      
      var oRecipientInput = new Input({ 
        placeholder: "recipient@company.com", 
        width: "100%" 
      });

      var oSuccessText = new Text({ 
        text: "", 
        visible: false, 
        wrapping: true 
      });

      // Generate Token Button
      var oGenBtn = new Button({
        text: "🔑 Generate Upload Token",
        type: "Emphasized",
        press: async function () {
          oGenBtn.setEnabled(false);
          var supplierID = oSupplierInput.getValue();
          
          if (!supplierID) {
            MessageToast.show("❌ Please enter your Supplier ID first");
            oGenBtn.setEnabled(true);
            return;
          }
          
          try {
            var resp = await fetch(baseUrl + "/generateUploadToken", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ supplierID: supplierID })
            });
            
            if (!resp.ok) {
              const error = await resp.text();
              throw new Error(error || "Failed to generate token");
            }
            
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

      // Upload Document Button
      var oUploadBtn = new Button({
        text: "📤 Upload Document",
        type: "Emphasized",
        enabled: false,
        press: async function () {
          oUploadBtn.setEnabled(false);
          try {
            if (!that._selectedFile) throw new Error("Please select a file");
            if (!oSupplierInput.getValue()) throw new Error("Please enter Supplier ID");
            if (!oRecipientInput.getValue()) throw new Error("Please enter Recipient Email");
            if (!oTokenInput.getValue()) throw new Error("Please generate a token first");
            
            var fileBase64 = await new Promise(function (resolve, reject) {
              var reader = new FileReader();
              reader.onload = function () { resolve(reader.result.split(',')[1]); };
              reader.onerror = reject;
              reader.readAsDataURL(that._selectedFile);
            });

            var payload = {
              token: oTokenInput.getValue(),
              supplierID: oSupplierInput.getValue(),
              recipientEmail: oRecipientInput.getValue(),
              documentName: that._selectedFile.name,
              documentContent: fileBase64
            };

            MessageToast.show("📤 Uploading document...");
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
            oSuccessText.setText("Download token has been sent to: " + oRecipientInput.getValue());
            oSuccessText.setVisible(true);

            oTokenInput.setValue("");
            oSupplierInput.setValue("");
            oRecipientInput.setValue("");
            oFileUploader.clear();
            that._selectedFile = null;
            oUploadBtn.setEnabled(false);
            oGenBtn.setEnabled(true);
          } catch (e) {
            MessageToast.show("❌ " + e.message);
            oUploadBtn.setEnabled(true);
          }
        }
      });

      // File Uploader
      var oFileUploader = new FileUploader({
        fileType: ["pdf", "xlsx", "xls", "csv", "doc", "docx"],
        maximumFileSize: 50,
        width: "100%",
        change: function (oEvent) {
          that._selectedFile = oEvent.getParameter("files")[0];
        }
      });

      // Generate Section
      var oGenerateSection = new VBox({
        items: [
          new Text({ text: "Generate Upload Token" }).addStyleClass("sapUiMediumMarginBottom"),
          new Text({ text: "Generate a secure token to authenticate your upload (valid for 5 minutes)" }),
          new HBox({ items: [oGenBtn] })
        ],
        width: "100%",
        justifyContent: "Start",
        renderType: "Bare"
      });

      // Upload Section
      var oUploadSection = new VBox({
        items: [
          new Text({ text: "Upload Document" }).addStyleClass("sapUiMediumMarginBottom sapUiMediumMarginTop"),
          new Text({ text: "Fill in your details and upload the document" }).addStyleClass("sapUiSmallMarginBottom"),
          new Label({ text: "Upload Token (auto-filled):" }),
          oTokenInput,
          new Label({ text: "Your Supplier ID: *" }).addStyleClass("sapUiMediumMarginTop"),
          oSupplierInput,
          new Text({ text: "Max size: 50MB", wrapping: true }),
          new Label({ text: "Recipient Email (who will receive the download token): *" }).addStyleClass("sapUiMediumMarginTop"),
          oRecipientInput,
          new Label({ text: "📄 Upload Document (PDF, Excel, CSV, etc.): *" }).addStyleClass("sapUiMediumMarginTop"),
          oFileUploader,
          new Text({ text: "Max size: 50MB", wrapping: true }),
          new HBox({ items: [oUploadBtn], justifyContent: "Start", width: "100%" }).addStyleClass("sapUiMediumMarginTop")
        ],
        width: "100%"
      });

      // Main Page
      var oPage = new Page({
        title: "📦 Supplier Portal",
        id: "mainPage",
        content: [
          new VBox({
            items: [
              new Text({ text: "Upload documents securely - Token will be sent via email", wrapping: true }).addStyleClass("sapUiMediumMarginBottom"),
              oGenerateSection,
              oUploadSection,
              oSuccessText
            ],
            width: "100%",
            renderType: "Bare"
          })
        ]
      });

      var oApp = new App({ initialPage: "mainPage" });
      oApp.addPage(oPage);
      return oApp;
    }
  });
});

