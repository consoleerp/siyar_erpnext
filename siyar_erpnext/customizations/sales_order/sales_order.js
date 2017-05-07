frappe.ui.form.on("Sales Order Item", {
	item_code: function(frm, cdt, cdn) {
		fetch_av_qty(frm, cdt, cdn);
	},
	uom: function(frm, cdt, cdn) {
		fetch_av_qty(frm, cdt, cdn);
	},
	warehouse: function(frm, cdt, cdn) {
		fetch_av_qty(frm, cdt, cdn);
	},
	
	// error message if valuation rate > rate
	rate : function(frm, cdt, cdn) {
		var doc = locals[cdt][cdn];
		frappe.after_ajax(function(){
			
			// if rate is less than valuation rate, throw mssg
			// rate -- rate of 1kg of item.. valuation_rate comes in grams
			if ((doc.rate / doc.conversion_factor) <= doc.valuation_rate){
				frappe.msgprint("Rate in Stock UOM ("+doc.rate+") is below the valuation rate ("+ doc.valuation_rate +").");				
				return;
			}
			
			// else
			// check if rate after customer discount percent falls below the valuation rate
			if (!frm.doc.customer)
				return;
			
			frappe.call({
				method : "siyar_erpnext.api.get_customer_item_disc_percent",
				args : {
					customer : frm.doc.customer,
					items : [doc.item_code]
				},
				callback : function(r){
					if (r.message && r.message.length > 0){
						// r.message[0] is the disc percent
						var rate_after_discount = doc.rate - (doc.rate * r.message[0]) / 100;
						if ((rate_after_discount / doc.conversion_factor) < doc.valuation_rate) {
							frappe.msgprint("Rate in Stock UOM ("+ rate_after_discount +") after customer discount ("+ r.message[0] +"%) is less than the valuation rate ("+doc.valuation_rate+")");
						}
					}
				}
			});
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
				
				// find a better way to handle this
				if (!data.actual_qty)
					data.actual_qty = 0;
				
				if (!data.reserved_qty)
					data.reserved_qty = 0;
				
				if (!data.reserved_qty_for_production)
					data.reserved_qty_for_production = 0;
				
				// convert from stock_uom to selected uom
				var available_qty = (data.actual_qty - data.reserved_qty - data.reserved_qty_for_production) / doc.conversion_factor;
				var reserved_qty = (data.reserved_qty + data.reserved_qty_for_production) / doc.conversion_factor;
				
				frappe.model.set_value(cdt, cdn, "consoleerp_av_qty",  available_qty);
				frappe.model.set_value(cdt, cdn, "consoleerp_reserved_qty", reserved_qty);
			}
		});
		
	});
}