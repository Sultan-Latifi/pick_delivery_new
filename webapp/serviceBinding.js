function initModel() {
	var sUrl = "/sap/opu/odata/sap/ZMDE_PROTO_PICK_DELIVERY_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}