frappe.ui.form.on('Sales Invoice', {
	onload : function(frm) {		

		// following conditions assures its a follow up document
		if (frm.doc && frm.doc.customer && frm.doc.items && frm.doc.items.length > 0 &&frm.doc.items[0].item_code)
		{
			
			// onload
			// foreach items, copy current rate to customer rate and apply discount on actual rate
			$.each(frm.doc.items, function(i, item_doc){

				if (!item_doc.rate || item_doc.consoleerp_customer_rate)
					return;
								
				frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_customer_rate", item_doc.rate);	
				
				frappe.after_ajax(function(){
					
					frappe.call({
						"method" : "siyar_erpnext.api.get_customer_item_disc_percent",
						args : {
							customer : frm.doc.customer,
							item : item_doc.item_code
						},
						callback : function(r) {
							if (!r.message)
								r.message = 0;
							
							frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_customer_disc_percent", r.message);		
							frappe.model.set_value("Sales Invoice Item", item_doc.name, "rate", item_doc.consoleerp_customer_rate * (100 - item_doc.consoleerp_customer_disc_percent) / 100);							
						}
					});
					
				});
			});
		}
	},
	
	validate: function(frm) {

		var customer_rate_total = 0;
		var customer_discount_total = 0;
		
		$.each(frm.doc.items, function(i, item_doc) {
			customer_rate_total += item_doc.consoleerp_customer_rate * item_doc.qty;
			customer_discount_total += item_doc.consoleerp_customer_rate * item_doc.qty * item_doc.consoleerp_customer_disc_percent / 100;
		});
		
		var customer_order_total = customer_rate_total - customer_discount_total;
		
		frappe.model.set_value("Sales Invoice", frm.doc.name, "consoleerp_customer_rate_total", customer_rate_total);
		frappe.model.set_value("Sales Invoice", frm.doc.name, "consoleerp_customer_discount_total", customer_discount_total);
		frappe.model.set_value("Sales Invoice", frm.doc.name, "consoleerp_customer_order_total", customer_order_total);
	}
});