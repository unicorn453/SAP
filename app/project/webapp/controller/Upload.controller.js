sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("shipment.ui.controller.Upload", {

        onGenerateUploadToken: async function () {
            const oModel = this.getView().getModel();
            const sSupplierID = this.byId("supplierInput").getValue();

            if (!sSupplierID) {
                MessageBox.warning("Please enter supplier ID");
                return;
            }

            try {
                const oAction = oModel.bindContext("/generateUploadToken(...)");

                oAction.setParameter("supplierID", sSupplierID);

                await oAction.execute();

                const oResult = oAction.getBoundContext().getObject();

                this.byId("tokenText").setText(
                    `Token:\n${oResult.token}\n\nExpires:\n${oResult.expiresAt}`
                );

                console.log("Upload Token Result:", oResult);

            } catch (err) {
                console.error(err);
                MessageBox.error("Token generation failed");
            }
        }

    });
});
