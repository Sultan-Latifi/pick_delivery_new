sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/mindsquare/gdmvt/remove/gooiss/controller/baseController"
], function (Controller, baseController) {
	"use strict";
	return baseController.extend("com.mindsquare.gdmvt.remove.gooiss.controller.erweiterte_suche", {
		//wird glaub ich nicht genutzt
		onInit: function () {
			debugger;
		},
		onPageNavButtonPress: function () {
			debugger;
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("auftragssuche");
		},
		OnBtnExtSearchPress: function (oEvent) {
			//Routing
			debugger;
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("auftragsauswahl");
		}
	});
});