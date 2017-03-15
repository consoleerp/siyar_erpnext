frappe.ui.form.on("Sales Order Item", {
	item_code : function(frm, cdt, cdn) {
		fetch_av_qty(frm,cdt,cdn);
	},
	warehouse : function(frm, cdt, cdn) {
		fetch_av_qty(frm,cdt,cdn);
	},
	
	// error message if valuation rate > rate
	rate : function(frm, cdt, cdn) {
		var doc = locals[cdt][cdn];
		frappe.after_ajax(function(){
			if (doc.rate <= doc.valuation_rate){
				frappe.msgprint("Rate ("+doc.rate+") is below the valuation rate ("+ doc.valuation_rate +").");
			}
		});
	}
});

var fetch_av_qty = function(frm, cdt, cdn) {
	var doc = locals[cdt][cdn];
		
	
	frappe.after_ajax(function(){		
			
		if (!doc.item_code || !doc.warehouse)
			return;
			
		frappe.call({
			"method" : "siyar_erpnext.api.item_warehouse_detail",
			args : {
				item : doc.item_code,
				warehouse : doc.warehouse
			},
			callback : function(r) {
				
				data = r.message;
				
				frappe.model.set_value(cdt, cdn, "consoleerp_av_qty",  (data.actual_qty - data.reserved_qty - data.reserved_qty_for_production));
			}
		});
		
	});
}