sap.ui.define([
	"com/mindsquare/gdmvt/remove/gooiss/controller/baseController",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"../model/formatter",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/Device",
], function (baseController, Button, Dialog, Text, Filter, Sorter, FilterOperator, formatter, MessageBox, Fragment, Device) {
	"use strict";

	return baseController.extend("com.mindsquare.gdmvt.remove.gooiss.controller.materialList", {
		//wird genutzt
		_origin: "",
		formatter: formatter,
		onInit: function () {

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("materialList").attachPatternMatched(this._onObjectMatched, this);
			this.ODataServiceUrl = "/sap/opu/odata/sap/ZMDE_GDMVT_SEARCH_HELP_MATNR_SRV/";
			var oMaterialHelpModel = new sap.ui.model.odata.ODataModel(this.ODataServiceUrl, true);
			sap.ui.getCore().setModel(oMaterialHelpModel, "materialSearchHelp");
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.setData({
				materials: []
			});
			this.getOwnerComponent().setModel(oModel, "materialList");

			// set device model
			var deviceModel = new sap.ui.model.json.JSONModel({
				isNoTouch: !Device.support.touch,
				isTouch: Device.support.touch
			});

			deviceModel.setDefaultBindingMode("OneWay");
			var oView = this.getView();

			var oPhoneModel = new sap.ui.model.json.JSONModel({
				isDesktop: Device.system.desktop
			});
			oView.setModel(oPhoneModel, "phoneModel");
			oView.setModel(deviceModel, "device");

			window.addEventListener("beforeunload", this.onBeforeUnload.bind(this));
		},

		onSelectChange: function (oEvent) {
			debugger;
			var sKey = oEvent.getParameter("selectedItem").getKey();
			var sKeySplit = sKey.split("_");
			var sIsDesc = false;
			if ( sKeySplit[0] == "Desc") {
			  	sIsDesc = true;
			} 
			var oSorter = new Sorter({
				path: sKeySplit[1], 
				descending: sIsDesc});
			var oList = this.byId("materialList");	
			oList.getBinding("items").sort(oSorter);	
		},

		onBeforeUnload: function (event) {

			var oVbeln = this.getView().getModel("Vbeln").getProperty("/");

			// You can perform any necessary cleanup here or show a confirmation dialog
			// const confirmationMessage = "Are you sure you want to leave this page?";
			// event.returnValue = confirmationMessage; // Display a confirmation message

			//Nav back to main view
			this.cancelMaterialProcess();

			// You can also prevent the event if you don't want to show a confirmation message
			// event.preventDefault();
		},

		onAfterRendering: function () {

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("materialList").attachPatternMatched(this._onFocus, this);

			var oInputField = this.getView().byId("iMaterial");
			jQuery.sap.delayedCall(750, this, function () {
				oInputField.focus();
			});

		},

		_onFocus: function () {

			var oInputField = this.getView().byId("iMaterial");
			jQuery.sap.delayedCall(750, this, function () {
				oInputField.focus();
			});

			//Save input element globally
			// Create a new JSON model
			var oModel = new sap.ui.model.json.JSONModel();
			// Set data to the model
			var oData = {
				focus: this.getView().byId("iMaterial")
			};
			oModel.setData(oData);
			// Set the model to the global core
			sap.ui.getCore().setModel(oModel, "focusId");
		},

		onReFocus: function (pView) {

			// var iSearchInventory = this.getView().byId("iSearchInventory");
			jQuery.sap.delayedCall(500, this, function () {
				pView.focus();
			});
			// pView.focus();
		},

		_onObjectMatched: function (oEvent) {

			var oModel = this.getView().getModel(),
				oArgs = oEvent.getParameter("arguments"),
				svbeln = oArgs.vbeln,
				aFilter = new Filter("Vbeln", FilterOperator.EQ, svbeln), //create a filter for the BE call
				sPath = "/DeliveryItemSet", //Odata entity set path
				that = this;

			//Set the value of the Vbeln property selected
			this.getView().getModel("Vbeln").setProperty("/", oArgs.vbeln);

			oModel.metadataLoaded().then(function () {
				// Do the call to BE and create the data binding model

				oModel.read(
					sPath, {
						filters: [aFilter],
						success: function (oData) {
							if (oData.results.length > 0) {
								var sRequest = new sap.ui.model.json.JSONModel(oData.results);

								this.getView().setModel(sRequest, "RezervationList");
								//Set the model for the header formatter
								oModel = new sap.ui.model.json.JSONModel();

								oModel.setData({
									Aufnr: oData.results[0].Aufnr
								});
								this.getView().setModel(oModel, "formatterModel");
								that.getView().getModel("ErrorVbeln").setProperty("/", false);
								that.getView().getModel("Aufnr").setProperty("/", oData.results[0].Aufnr);

								// that.lockOrder(oArgs, that);
							} else {

								// MessageBox.show("No Data!");
								that.onErrorPopUp("No Data", that);

								//Alban Change 10/12/2023 clear material list in error case
								that.getView().getModel("ErrorVbeln").setProperty("/", true);
								that.onErrorPopUp("No Data", that);
								//Alban Change 10/12/2023 clear material list in error case
							}
						}.bind(this),
						error: function (Error) { //In case of error show pop up and navigate back to the view
							MessageBox.error("Error!");

							// try {
							// 	var sErrMsg = JSON.parse(Error.responseText).error.message.value;
							// } catch (err) {
							// 	var sErrMsg = JSON.parse(Error.responseText).error;
							// }

							// that.getView().getModel("ErrorVbeln").setProperty("/", sErrMsg);
							// that.onErrorPopUp(sErrMsg, that);

						}
					});

				// //Eingabefeld leeren
				// this.getView().byId("iMaterial").setValue("");

				//Bindinglösung mit NavOperation
				this.getView().setBindingContext(
					new sap.ui.model.Context(
						this.getView().getModel(), "/" + oArgs.path
					)
				);
				this._origin = oArgs.origin;
				this.byId("idIconTabBarMulti").setSelectedKey("MaterialList");
				//Count des IconTabFilter setzen
				this.getView().byId("basket").setCount(this.getView().getModel("materialList").getData().materials.length);

				if (oArgs.from == 'main') {
					this.getView().getModel("materialList").setData({
						materials: []
					});
					this.tagRemovedMaterial("reset");
				}
			}.bind(this));
		},

		onPressEvent: function (oEvent) {

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this),
				oData = oEvent.getSource().getSelectedItem().getBindingContext("RezervationList").getObject(),
				// sRoute = oData.Charg === "" ? "addMaterial" : "addMaterialCharg";
				sRoute = "addMaterial";

			//Alban Change Start 4/5/2023 get the remained quantity from material list and send it to the next view
			var oList = this.getView().byId("basketList");
			var aItems = oList.getItems();
			// if (aItems.length != 0) {
			// 	oData.Menget = (parseFloat(oData.Menget) - parseFloat(this._getQuantityFromBasket(oData.Matnr, oData.Posnr))).toFixed(3);
			// }
			var fBasketQuant = parseFloat(this._getQuantityFromBasket(oData.Matnr, oData.Posnr));
			//Alban Change End 4/5/2023

			oRouter.navTo(sRoute, {
				vbeln: oData.Vbeln,
				posnr: oData.Posnr,
				matnr: oData.Matnr,
				charg: oData.Charg,
				menget: oData.Menget,
				pikmg: fBasketQuant

				// sernr: oData.Sernr,
				// lgort: oData.Lgort,
				// ausme: oData.Ausme, //Alban Change 21/05/2022
				//bdter: String(oData.Bdter) //FG, 02.02.2023
			});
		},

		onIconTabPress: function (oEvent) {

			try {
				switch (oEvent.getSource().getSelectedKey()) {
				case "Basket":
					this.getView().byId("SortSelect").setVisible(false);
					this.getView().byId("btnPost").setVisible(true);
					var oList = this.getView().byId("basketList").getBinding("items");
					oList.getModel().updateBindings(true)
						// sap.ui.getCore().byId("basketList").getBinding("items").refresh();
						// // this.onUpdateFinished();
						// this.getView().getElementBinding().refresh(true);
						// var oList = this.getView().byId("basketList");
						// sap.ui.getCore().byId("basketList").getBinding("items").refresh();
						// // this.onUpdateFinished();

					break;
				case "MaterialList":
					this.getView().byId("SortSelect").setVisible(true);
					this.getView().byId("btnPost").setVisible(false);

					var oInputField = this.getView().byId("iMaterial");
					jQuery.sap.delayedCall(750, this, function () {
						oInputField.focus();
					});

					break;
				case "Header":
					this.getView().byId("btnPost").setVisible(true);
					break;
				}
			} catch (e) {
				// console.log("Error, but show button.");
				this.getView().byId("btnPost").setVisible(true);
			}

		},

		onMaterialSubmit: function (bBarcode, sInput) {

			//Alban Change Start 4/5/2023
			var oData = this.getView().getModel("RezervationList").getData(); //get list of all reservation items list
			var oSelectedMaterial = {};
			//Alban Change End 4/5/2023

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			// if (bBarcode !== true) {
			sInput = this.getView().byId("iMaterial").getValue();
			var oBarcode = this.splitBarcode(sInput);

			if (oBarcode === null) {
				var msg = "Ungültiger Barcode: " + sInput;
				this.showMessageErrorDialog(msg);
				this.getView().byId("iMaterial").setValue("");
				return;
			}

			var sMatnr = oBarcode.matnr;
			var sCharg = oBarcode.charg;
			var sAufnr = this.getView().getBindingContext().getProperty("Aufnr") || "";

			//Alban Change Start 4/5/2023 get the menge for the entered material in the barcode input field
			var oList = this.getView().byId("basketList");
			var aItems = oList.getItems();
			var oFlag = false;
			var ChargExist = false;
			var oSum = 0;
			var fQuantity;

			for (var i = 0; i < oData.length; i++) {
				if (!oFlag) {
					fQuantity = this._getQuantityFromBasket( oData[i].Matnr, oData[i].Rspos )
					if (oData[i].Matnr == sMatnr && oData[i].Charg == sCharg && fQuantity == 0) {
						if (aItems.length != 0) {
							aItems.forEach(function (oItem) {
								var oDataList = oItem.getBindingContext("materialList").getObject();

								if (oDataList.Matnr == sMatnr) {
									oSum = oSum + parseFloat(oDataList.Pikmg);
								} else {
									oSum = oSum + 0;
								}

							});
							if (oSum != parseFloat(oData[i].Pikmg)) { // || oData[i].Matnr == sMatnr) {
								oSelectedMaterial = oData[i];
								oFlag = true;
							}
							oSum = 0;
						} else {
							oSelectedMaterial = oData[i];
							ChargExist = true;
							break;
						}
					}
				}
			}
			if (!ChargExist) {
				for (var i = 0; i < oData.length; i++) {
					if (!oFlag) {
						fQuantity = this._getQuantityFromBasket( oData[i].Matnr, oData[i].Rspos )
						if (oData[i].Matnr == sMatnr && oData[i].Charg == sCharg && fQuantity == 0) {
							if (aItems.length != 0) {
								aItems.forEach(function (oItem) {
									var oDataList = oItem.getBindingContext("materialList").getObject();

									if (oDataList.Matnr == sMatnr) {
										oSum = oSum + parseFloat(oDataList.Pikmg);
									} else {
										oSum = oSum + 0;
									}

								});
								if (oSum != parseFloat(oData[i].Pikmg)) { // || oData[i].Matnr == sMatnr) {
									oSelectedMaterial = oData[i];
									oFlag = true;
								}
								oSum = 0;
							} else {
								oSelectedMaterial = oData[i];
								break;
							}
						}
					}
				}
			}
			if (oSelectedMaterial.Vbeln) {
			// get the remained quantity from material list and send it to the next view
			// if (aItems.length != 0) {
			// 	oSelectedMaterial.Pikmg = (parseFloat(oSelectedMaterial.Pikmg) - parseFloat(this._getQuantityFromBasket(oSelectedMaterial.Matnr,
			// 		oSelectedMaterial.Posnr))).toFixed(3);
			// }
			//Alban Change End 4/5/2023
			var fBasketQuant = parseFloat(this._getQuantityFromBasket(oSelectedMaterial.Matnr, oSelectedMaterial.Posnr));
			
			if (sCharg === "") {
				oRouter.navTo("addMaterial", {
					vbeln: oSelectedMaterial.Vbeln,
					posnr: oSelectedMaterial.Posnr,
					matnr: oSelectedMaterial.Matnr,
					charg: oSelectedMaterial.Charg,
					menget: oSelectedMaterial.Menget,
					pikmg: fBasketQuant
						// aufnr: sAufnr,
						// matnr: sMatnr,
						// vbeln: oSelectedMaterial.Vbeln,
						// posnr: oSelectedMaterial.Posnr, //Add new import parameter rspos Alban Elezi 4/5/2023
						// pikmg: oSelectedMaterial.Pikmg, //Add new import parameter menge Alban Elezi 4/5/2023
						// charg: oSelectedMaterial.Charg, //Add new import parameter charg Alban Elezi 4/5/2023
						// sernr: oSelectedMaterial.Sernr, //Add new import parameter sernr Alban Elezi 4/5/2023
						// lgort: oSelectedMaterial.Lgort, //Add new import parameter lgort Alban Elezi 4/5/2023
						// ausme: oSelectedMaterial.Ausme //Add new import parameter ausme Alban Elezi 4/5/2023
				});
			} else {
				oRouter.navTo("addMaterial", {
					vbeln: oSelectedMaterial.Vbeln,
					posnr: oSelectedMaterial.Posnr,
					matnr: oSelectedMaterial.Matnr,
					charg: oSelectedMaterial.Charg,
					menget: oSelectedMaterial.Menget,
					pikmg: fBasketQuant
				});
				// oRouter.navTo("addMaterialCharg", {
				// 	aufnr: sAufnr,
				// 	matnr: sMatnr,
				// 	charg: sCharg,
				// 	vbeln: oSelectedMaterial.Vbeln,
				// 	posnr: oSelectedMaterial.Posnr, //Add new import parameter rspos Alban Elezi 4/5/2023
				// 	pikmg: oSelectedMaterial.Pikmg, //Add new import parameter Pikmg Alban Elezi 4/5/2023
				// 	charg: oSelectedMaterial.Charg, //Add new import parameter charg Alban Elezi 4/5/2023
				// 	sernr: oSelectedMaterial.Sernr, //Add new import parameter sernr Alban Elezi 4/5/2023
				// 	lgort: oSelectedMaterial.Lgort, //Add new import parameter lgort Alban Elezi 4/5/2023
				// 	ausme: oSelectedMaterial.Ausme //Add new import parameter ausme Alban Elezi 4/5/2023
				// });
			}
		}
			// } else {
			// 	//Prüfen ob / im Bacrode enthalten ist
			// 	if (sInput.includes("/")) {
			// 		msg = "Ungültiger Barcode: " + sInput;
			// 		this.showMessageErrorDialog(msg);
			// 		this.getView().byId("iMaterial").setValue("");
			// 		return;
			// 	}
			// 	//oRouter.navTo("addMaterialBarcode", {
			// 	//	barcode: sInput
			// 	//});
			// 	//Change Mo Bouchatal: 16/03/2023 -> Navigation via blue scan button
			// 	var oBarcode = this.splitBarcode(sInput);
			// 	var sMatnr = oBarcode.matnr;
			// 	var sCharg = oBarcode.charg;
			// 	var sAufnr = this.getView().getBindingContext().getProperty("Aufnr") || "";

			// 	//Alban Change Start 4/5/2023 get the menge for the entered material in the barcode input field
			// 	var oList = this.getView().byId("basketList");
			// 	var aItems = oList.getItems();
			// 	var oFlag = false;
			// 	var oSum = 0;

			// 	for (var i = 0; i < oData.length; i++) {
			// 		if (!oFlag) {
			// 			if (oData[i].Matnr == sMatnr) {
			// 				if (aItems.length != 0) {
			// 					aItems.forEach(function (oItem) {
			// 						var oDataList = oItem.getBindingContext("materialList").getObject();

			// 						if (oDataList.Matnr == sMatnr) {
			// 							oSum = oSum + parseFloat(oDataList.Pikmg);
			// 						} else {
			// 							oSum = oSum + 0;
			// 						}

			// 					});
			// 					if (oSum != parseFloat(oData[i].Pikmg)) {
			// 						oSelectedMaterial = oData[i];
			// 						oFlag = true;
			// 					}
			// 					oSum = 0;
			// 				} else {
			// 					oSelectedMaterial = oData[i];
			// 					break;
			// 				}
			// 			}
			// 		}
			// 	}
			// 	// get the remained quantity from material list and send it to the next view
			// 	var oList = this.getView().byId("basketList");
			// 	var aItems = oList.getItems();
			// 	if (aItems.length != 0) {
			// 		oSelectedMaterial.Pikmg = (parseFloat(oSelectedMaterial.Pikmg) - parseFloat(this._getQuantityFromBasket(oSelectedMaterial.Matnr,
			// 			oSelectedMaterial.Posnr))).toFixed(3);
			// 	}
			// 	//Alban Change End 4/5/2023

			// 	if (sCharg === "") {
			// 		oRouter.navTo("addMaterial", {
			// 			aufnr: sAufnr,
			// 			matnr: sMatnr,
			// 			vbeln: this.Vbeln,
			// 			posnr: oSelectedMaterial.Posnr, //Add new import parameter rspos Alban Elezi 4/5/2023
			// 			pikmg: oSelectedMaterial.Pikmg, //Add new import parameter Pikmg Alban Elezi 4/5/2023
			// 			charg: oSelectedMaterial.Charg, //Add new import parameter charg Alban Elezi 4/5/2023
			// 			sernr: oSelectedMaterial.Sernr, //Add new import parameter sernr Alban Elezi 4/5/2023
			// 			lgort: oSelectedMaterial.Lgort, //Add new import parameter lgort Alban Elezi 4/5/2023
			// 			ausme: oSelectedMaterial.Ausme //Add new import parameter ausme Alban Elezi 4/5/2023

			// 		});
			// 	} else {
			// 		oRouter.navTo("addMaterialCharg", {
			// 			aufnr: sAufnr,
			// 			matnr: sMatnr,
			// 			charg: sCharg,
			// 			vbeln: this.Vbeln,
			// 			posnr: oSelectedMaterial.Posnr, //Add new import parameter rspos Alban Elezi 4/5/2023
			// 			pikmg: oSelectedMaterial.Pikmg, //Add new import parameter Pikmg Alban Elezi 4/5/2023
			// 			charg: oSelectedMaterial.Charg, //Add new import parameter charg Alban Elezi 4/5/2023
			// 			sernr: oSelectedMaterial.Sernr, //Add new import parameter sernr Alban Elezi 4/5/2023
			// 			lgort: oSelectedMaterial.Lgort, //Add new import parameter lgort Alban Elezi 4/5/2023
			// 			ausme: oSelectedMaterial.Ausme //Add new import parameter ausme Alban Elezi 4/5/2023
			// 		});
			// 	}
			// }

		},

		onBtnScanPress: function () {

			jQuery.sap.require("sap.ndc.BarcodeScanner");
			sap.ndc.BarcodeScanner.scan(
				function (oResult) { /* process scan result */
					this.getView().byId("iMaterial").setValue(oResult.text);
					this.onMaterialSubmit(true, oResult.text);
				}.bind(this),
				function (oError) { /* handle scan error */ }
			);
		},

		onBtnPostPress: function () {

			if (this.checkIfBasketIsEmpty()) {
				new sap.m.MessageToast.show(this.getI18n().getText("plsAddProducts"));
				return;
			}
			var aBasket = this.getView().getModel("materialList").getProperty("/materials"),
				sServiceUrl = "/sap/opu/odata/sap/zmde_PROTO_PICK_DELIVERY_SRV/",
				oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true),
				//create an array of batch changes and save
				batchChanges = [],
				sMovementHeaderText = this.byId("iMovementHeaderText").getValue(),
				oMovementHeaderInput = this.byId("iMovementHeaderText"),
				bPrint = "", //this.byId("PrintFlag").getSelected(),
				aOmitKeys = ["Index", "ParamFrom", "ParamTo", "Flag"],
				that = this;
			// aOmitKeys = ["Index", "Vbeln", "Posnr", "ParamFrom", "ParamTo"];

			// if (this.byId("PrintFlag").getSelected() === true) {
			// 	bPrint = "X";
			// }

			oMovementHeaderInput.setValueState(sap.ui.core.ValueState.None);
			//Alban Change we commented the check on movement Text
			// if (sMovementHeaderText === '') {
			// 	var i18n = this.getView().getModel("i18n").getResourceBundle(),
			// 		errorText = i18n.getText("movement_header_error");
			// 	oMovementHeaderInput.setValueState(sap.ui.core.ValueState.Error);
			// 	oMovementHeaderInput.setValueStateText(errorText);
			// 	this.byId("idIconTabBarMulti").setSelectedKey("Header");
			// 	this.byId("bookingDialog").close();
			// 	new sap.m.MessageToast.show(i18n.getText("plsEnterDescription"));
			// 	return;
			// }
			//Alban Change we commented the check on movement Text
			//Deana Change 06/03/24
			var oBufferList = JSON.stringify(aBasket);
			aBasket.forEach(function (oItem) {

				var material = new Object(oItem);
				material.Pikmg = oItem.Pikmg.toString()
				material.Rfmng = oItem.Rfmng.toString()
				material.Bktxt = sMovementHeaderText;
				// material.Vbeln = this.Vbeln;
				// material.Posnr = 10;
				material.AvailableQan = material.AvailableQan.toString(); // Konvertiere Zahl in eine Zeichenfolge
				material.Zprint = bPrint;
				aOmitKeys.forEach(function (sKey) {
					delete material[sKey];
				});
				batchChanges.push(oModel.createBatchOperation("DeliveryItemSet", "POST", material));
			}, this);
			//Deana Change 06/03/24
			this.getView().getModel("materialList").setProperty("/materials", JSON.parse(oBufferList));
			//submit changes and refresh the table and display message
			oModel.addBatchChangeOperations(batchChanges);
			var oMessageManager = sap.ui.getCore().getMessageManager();
			oMessageManager.removeAllMessages();
			sap.ui.core.BusyIndicator.show(0);

			oModel.submitBatch(
				function (oData, response) { //success

					sap.ui.core.BusyIndicator.hide();
					if (oData.__batchResponses[0].__changeResponses !== undefined) { //success
						oMovementHeaderInput.setValue("");
						var hdrMessage = response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"];
						this.showSuccessMessage(JSON.parse(hdrMessage));
						this.showSuccessMessage(response);
						this.cancelMaterialProcess();
					} else { //error
						var body = oData.__batchResponses[0].response.body;
						body = JSON.parse(body);
						var msg = body.error.innererror && body.error.innererror.errordetails.length ? body.error.innererror.errordetails[0].message :
							body.error.message.value;
						this.showMessageErrorDialog(msg);
					}
				}.bind(this),
				function (err) {
					sap.ui.core.BusyIndicator.hide();
					var errmessage = "Fehler " + err.response.statusCode;
					this.showMessageErrorDialog(errmessage);
				}.bind(this)
			);

		},

		onReservationListItemPress: function (oEvent) {

			var oCtx = oEvent.getSource().getBindingContext();
			if (oCtx.getProperty("Matnr") !== "") {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("addMaterialByReservation", {
					path: oCtx.getPath().substr(1)
				});
			} else {
				this.showMessageErrorDialog("Fremdmaterialien werden im Wareneingang gebucht");
			}
		},

		onDialog: function (oEvent) {

			var sId = oEvent.getSource().data("id"),
				oDialog = this.byId(sId);
			if (oDialog.isOpen()) {
				oDialog.close();
			} else {
				oDialog.open();
			}
		},

		_getDialog: function () {

			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("com.mindsquare.gdmvt.remove.gooiss.view.changeMaterialDialog", this.getView().getController());
				this.getView().addDependent(this._oDialog);
			}
			return this._oDialog;
		},

		onMaterialListItemPress: function (oEvent) {

			this.getView().byId("SortSelect").setVisible(true);
			this.getView().byId("btnPost").setVisible(false);
			
			var oCtx = oEvent.getSource().getBindingContext("materialList");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var sResult = {
				sVbeln: oEvent.getSource().getBindingContext("materialList").getProperty("Vbeln") || "", //this.getView().getBindingContext().getProperty("Vbeln") || "",
				sPosnr: oEvent.getSource().getBindingContext("materialList").getProperty("Posnr"),
				sCharg: oEvent.getSource().getBindingContext("materialList").getProperty("Charg"),
				sMatnr: oEvent.getSource().getBindingContext("materialList").getProperty("Matnr"),
				sMenge: oEvent.getSource().getBindingContext("materialList").getProperty("Pikmg"),
				// sSernr: oEvent.getSource().getBindingContext("materialList").getProperty("Sernr"),
				sPath: oCtx.getPath().substring(oCtx.getPath().lastIndexOf("/") + 1, oCtx.getPath().length),
				sFlag: "X"
			};

			var sDetails = JSON.stringify(sResult);

			// if (oCtx.getProperty("Sernr") !== "") {
			// 	oRouter.navTo("addMaterialModSer", {
			// 		details: sDetails
			// 	});
			// } else {
			// if (oCtx.getProperty("Charg") !== "") {
			// 	oRouter.navTo("addMaterialChargMod", {
			// 		details: sDetails
			// 	});
			// } else {
			oRouter.navTo("addMaterialMod", {
				details: sDetails
			});
			// }
			// }
		},

		onBtnSubmitDialogPress: function (oEvent) {

			var oCtx = oEvent.getSource().getBindingContext("materialList");
			var oModel = this.getOwnerComponent().getModel("materialList");
			var sPath = oCtx.getPath();

			//Neuen Wert setzen --> Wenn Wert = 0 : Item löschen
			var sMenge = this.convertDecimal(sap.ui.getCore().byId("iMengeDialog").getValue());
			if (sMenge == 0) { //Menge = 0 --> Eintrag löschen
				var idx = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
				oModel.getData().materials.splice(idx, 1);
				oModel.refresh(true);
			} else { //neue Menge setzten
				oModel.setProperty("Pikmg", sMenge, oCtx);
			}
			this._getDialog().close();
		},

		onBtnDeletePress: function (oEvent) {

			var oCtx = oEvent.getSource().getBindingContext("materialList");
			var oModel = this.getOwnerComponent().getModel("materialList");
			var sPath = oCtx.getPath();
			var idx = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
			oModel.getData().materials.splice(idx, 1);
			oModel.refresh(true);
			this.tagRemovedMaterial("set");
			this._getDialog().close();
		},

		onBtnCancelPress: function () {
			this.getI18n().getText("plsAddProducts")
			var dialog = new Dialog({
				title: this.getI18n().getText("vorgangcanceltitle"),
				type: "Message",
				state: "Warning",
				content: new Text({
					text: this.getI18n().getText("vorgangcanceltext")
				}),
				beginButton: new Button({
					text: this.getI18n().getText("no"),
					type: "Reject",
					icon: "sap-icon://sys-cancel",
					press: function () {
						dialog.close();
					}
				}),
				endButton: new Button({
					text: this.getI18n().getText("yes"),
					icon: "sap-icon://accept",
					press: function () {
						this.cancelMaterialProcess();
						dialog.close();
					}.bind(this)
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},

		onMatnrHelp: function (oEvent) {

			var sInputValue = oEvent.getSource().getValue();
			this.inputId = oEvent.getSource().getId();
			var path;
			var oTableStdListTemplate;
			//var aFilter = [];
			this.oDialog = sap.ui.xmlfragment("com.mindsquare.gdmvt.remove.gooiss.view.fragments.materialSearchDialog", this);
			path = "materialSearchHelp>/Mat0mSet";

			oTableStdListTemplate = new sap.m.StandardListItem({
				title: "{materialSearchHelp>Matnr}",
				description: "{materialSearchHelp>Maktg}"
			}); // //create a filter for the binding

			var oFilter1 = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sInputValue);
			var oFilter2 = new sap.ui.model.Filter("Maktg", sap.ui.model.FilterOperator.Contains, sInputValue);
			var oFilter3 = new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.Contains, "");
			var oMultiFilter = new sap.ui.model.Filter({
				filters: [
					oFilter1,
					oFilter2,
					oFilter3
				],
				and: false
			});

			var oMaterialSearchHelpModel = this.getView().getModel("materialSearchHelp");

			this.oDialog.setModel(oMaterialSearchHelpModel);
			this.oDialog.bindAggregation("items", {
				path: path,
				filters: [oMultiFilter],
				template: oTableStdListTemplate
			}); // }// open value help dialog filtered by the input value
			this.oDialog.open(sInputValue);
		},

		onMaterialHelpConfirm: function (e) {

			var s = e.getParameter("selectedItem");
			if (s) {
				this.byId(this.inputId).setValue(s.getBindingContext().getObject().Bname);
				this.readRefresh(e);
			}
			this.oDialog.destroy();

		},
		onMaterialHelpSearch: function (oEvent) {

			var aFilter = [];
			var sValue = oEvent.getParameter("value");
			// var oDialogFilter = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sValue);
			// aFilter.push(oDialogFilter);

			var oFilter1 = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sValue);
			var oFilter2 = new sap.ui.model.Filter("Maktg", sap.ui.model.FilterOperator.Contains, sValue);
			var oFilter3 = new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.Contains, "");
			var oMultiFilter = new sap.ui.model.Filter({
				filters: [
					oFilter1,
					oFilter2,
					oFilter3
				],
				and: false,
			});

			var oBinding = oEvent.getParameter("itemsBinding");
			oBinding.aApplicationFilters = null;
			oBinding.filter(oMultiFilter);

		},
		onMaterialHelpClose: function (oEvent) {

			var oSelectedItem = oEvent.getParameter("selectedItem"),
				oInput = this.byId("iMaterial");

			if (!oSelectedItem) {
				oInput.resetProperty("value");
				return;
			}
			oInput.setValue(oSelectedItem.getTitle());
			this.oDialog.destroy();
		},
		onSalesOrderPositions: function (oEvent) {

			var sInputValue = oEvent.getSource().getValue();
			this.inputId = oEvent.getSource().getId();
			var path;
			var oTableStdListTemplate;
			var oFilter;
			var aFilter = [];
			this.oDialog = sap.ui.xmlfragment("com.mindsquare.gdmvt.remove.gooiss.view.fragments.materialSearchDialog", this);
			path = "materialSearchHelp>/Mat0mSet";

			oTableStdListTemplate = new sap.m.StandardListItem({
				title: "{materialSearchHelp>Matnr}",
				description: "{materialSearchHelp>Maktg}"
			}); // //create a filter for the binding
			oFilter = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sInputValue);
			aFilter.push(oFilter);
			var oMaterialSearchHelpModel = this.getView().getModel("materialSearchHelp");

			this.oDialog.setModel(oMaterialSearchHelpModel);
			this.oDialog.bindAggregation("items", {
				path: path,
				//filters: [oFilter],
				template: oTableStdListTemplate
			}); // }// open value help dialog filtered by the input value
			this.oDialog.open(sInputValue);

		},

		checkIfBasketIsEmpty: function () {

			var aMaterials = this.getView().getModel("materialList").getData().materials;
			if (aMaterials.length !== 0) {
				return false;
			} else {
				return true;
			}
		},

		onUpdateFinished: function (oEvent) { //auf bucket

			this.tagRemovedMaterial("set");
			if (this.getView().byId("materialList").getBinding("items")) {
				this.getView().byId("materialList").refreshAggregation("items");
			}
		},

		_getQuantityFromBasket: function (sMatnr, sPosnr) {

			var oList = this.getView().byId("basketList");
			var aItems = oList.getItems();
			var fQuantity = 0;

			aItems.forEach(function (oItem) {
				var oData = oItem.getBindingContext("materialList").getObject();

				if (oData.Matnr === sMatnr && oData.Posnr === sPosnr) {
					fQuantity = fQuantity + parseFloat(oData.Pikmg);
				}
			});
			return fQuantity;
		},

		onBuildList: function (id, oCtx) {

			//		var oFragment = this._getListItemMaterial();
			var oFragment = this.byId("listItemMaterial");
			if (oFragment) {
				var oListItem = oFragment.clone(id);
				var oMaterialData = oCtx.getObject();
				var fBasketQuant = parseFloat(this._getQuantityFromBasket(oMaterialData.Matnr, oMaterialData.Posnr));
				oMaterialData.Menget = oMaterialData.Lfimg - oMaterialData.Rfmng - fBasketQuant
				var fMaterialQuant = parseFloat(oMaterialData.Menget, 10);
				var fQuant = fMaterialQuant - fBasketQuant;
				if (fBasketQuant > 0) {
					oListItem.setBlocked(true);
				}
				if (fMaterialQuant === 0) {					
					oListItem.setVisible(false);
					return oListItem;
				} else {
					var oDecimalFormat = new sap.ui.model.odata.type.Decimal({
						groupingSeparator: ".",
						decimalSeparator: ",",
						minFractionDigits: "3"
					});

					oListItem.getContent()[0].getItems()[1].getItems()[1].setText(oDecimalFormat.formatValue(fMaterialQuant, "float"));
					return oListItem;
				}
			}

		},

		_getListItemMaterial: function () {

			if (!this._oListItemMaterial) {
				Fragment.load({
					type: "XML",
					name: "com.mindsquare.gdmvt.remove.gooiss.view.fragments.ListItemMaterial",
					controller: this
				}).then(function (oListItem) {
					this.getView().addDependent(oListItem);
					this._oListItemMaterial = oListItem;
					return this._oListItemMaterial;
				}.bind(this));
			} else {
				return this._oListItemMaterial;
			}
		},

		//Alban change add new pop up to handle error case
		onErrorPopUp: function (oMessage, that) {

			if (!this.oApproveDialog) {
				this.oApproveDialog = new Dialog({
					title: "Error",
					type: "Message",
					state: "Error",
					content: new Text({
						text: oMessage
					}),
					endButton: new Button({
						text: "Close",
						press: function () {
							this.oApproveDialog.close();
							that.cancelMaterialProcess();
						}.bind(this)
					})
				});
			} else {
				// Access the Text control and set its text property
				var textControl = this.oApproveDialog.getContent()[0];
				if (textControl instanceof Text) {
					textControl.setText(oMessage); // Set the new text value
				}
			}

			this.oApproveDialog.open();
		},

		// lockOrder: function (iVbeln, that) {
		// 	 
		// 	// var oLocked = that.getView().getModel("Locked").getProperty("/"); //check if we already locked the order
		// 	// var oVbeln = that.getView().getModel("Vbeln").getProperty("/");
		// 	// var oAufnr = that.getView().getModel("formatterModel").getProperty("/Aufnr");
		// 	// var oPath = "/OrderUnlockSet(Aufnr='" + oAufnr + "',Vbeln='" + oVbeln + "',Lock='X')";

		// 	// if (!oLocked) { //block the order only if is not already blocked from the user
		// 	// 	//backend call to unlock the order
		// 	// 	this.getView().getModel().read(oPath, {
		// 	// 		success: function (oData) {
		// 	// 			that.getView().getModel("Locked").setProperty("/", true); //set the order in lock state
		// 	// 		}.bind(this),
		// 	// 		error: function (Error) {
		// 	// 			try {
		// 	// 				var sErrMsg = JSON.parse(Error.responseText).error.message.value;
		// 	// 			} catch (err) {
		// 	// 				var sErrMsg = JSON.parse(Error.responseText).error;
		// 	// 			}

		// 	// 			that.getView().getModel("ErrorVbeln").setProperty("/", sErrMsg);
		// 	// 			that.onErrorPopUp(sErrMsg, that); //show error message
		// 	// 		}.bind(this)
		// 	// 	})
		// 	// }
		// },

		// orderSaveLock: function (that, iKey) {
		// 	 
		// 	var oVbeln = that.getView().getModel("Vbeln").getProperty("/");
		// 	var oAufnr = that.getView().getModel("formatterModel").getProperty("/Aufnr");
		// 	var oPath = "/OrderUnlockSet(Aufnr='" + oAufnr + "',Vbeln='" + oVbeln + "',Lock='" + iKey + "')";

		// 	//backend call to unlock the order
		// 	that.getView().getModel().read(oPath, {
		// 		success: function (oData) {
		// 			if (iKey == 'X') {
		// 				that.getView().getModel("Locked").setProperty("/", true); //set the order in lock state	
		// 			}
		// 		}.bind(this),
		// 		error: function (Error) {}.bind(this)
		// 	})
		// }
	});

});