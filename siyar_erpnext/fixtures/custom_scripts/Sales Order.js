frappe.ui.form.on("Sales Order Item", {
	item_code : function(frm, cdt, cdn) {
		fetch_av_qty(frm,cdt,cdn);
	},
	warehouse : function(frm, cdt, cdn) {
		fetch_av_qty(frm,cdt,cdn);
	}
});

var fetch_av_qty = function(frm, cdt, cdn) {
	frappe.after_ajax(function(){
		var doc = locals[cdt][cdn];
		
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