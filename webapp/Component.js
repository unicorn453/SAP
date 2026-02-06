sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/core/ComponentSupport",
	"sap/m/App",
	"sap/m/Page",
	"sap/m/VBox",
	"sap/m/Button",
	"sap/m/Text"
], function (UIComponent, ComponentSupport, App, Page, VBox, Button, Text) {
	"use strict";

	return UIComponent.extend("shipment.management.Component", {
		metadata: {
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"]
		},

		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
		},

		createContent: function () {
			var that = this;

			var oSupplierBtn = new Button({
				text: "📦 Go to Supplier Portal",
				type: "Emphasized",
				width: "100%",
				height: "60px",
				press: function () {
					window.location.href = window.location.origin + "/webapp/supplier/";
				}
			});

			var oCompanyBtn = new Button({
				text: "🏢 Go to Company Portal",
				type: "Emphasized",
				width: "100%",
				height: "60px",
				press: function () {
					window.location.href = window.location.origin + "/webapp/company/";
				}
			});

			var oPage = new Page({
				title: "Shipment Management Portal",
				content: [
					new VBox({
						items: [
							new Text({
								text: "Welcome to Shipment Management",
								fontWeight: "bold",
								fontSize: "1.5rem"
							}),
							new Text({
								text: "Select your role to access the portal:",
								wrapping: true
							}),
							oSupplierBtn,
							oCompanyBtn
						],
						spacing: "2rem",
						width: "100%",
						justifyContent: "Center",
						alignItems: "Center",
						height: "100vh"
					})
				]
			});

			var oApp = new App({ initialPage: oPage });
			oApp.addPage(oPage);

			return oApp;
		}
	});
});
