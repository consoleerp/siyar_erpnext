// what does frappe.provide ??
frappe.require("assets/js/siyar_customer_group.min.js", function(){});

frappe.ui.form.on('Sales Invoice', {
	onload : function(frm) {		
	
		frappe.after_ajax(function() {

			// following conditions assures its a follow up document						
			if (frm.doc.__islocal && frm.doc.customer &&frm.doc.items[0].item_code)
			{
				
				var items = [];
				
				// onload
				// foreach items, copy current rate to customer rate and apply discount on actual rate
				$.each(frm.doc.items, function(i, item_doc){								
					
					// adding item_code in as associative array
					items.push(item_doc.item_code);
									
					frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_customer_rate", item_doc.rate);					
				});
				
				console.log(items);
				
				frappe.after_ajax(function(){
						
						frappe.call({
							"method" : "siyar_erpnext.api.get_customer_item_disc_percent",
							args : {
								customer : frm.doc.customer,
								items : items							
							},
							callback : function(r) {
								console.log(r.message);
								$.each(frm.doc.items, function(i, item_doc){										
										frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_customer_disc_percent", r.message[i]);	
										frappe.model.set_value("Sales Invoice Item", item_doc.name, "rate", item_doc.consoleerp_customer_rate * (100 - item_doc.consoleerp_customer_disc_percent) / 100);	
										frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_original_amt", item_doc.qty * item_doc.consoleerp_customer_rate);
								});																														
							}
						});
						
					});
			}
		});
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


frappe.ui.form.on("Sales Invoice Item", {
	item_code : function(frm, cdt, cdn) {
		calculate_customer_total(frm);
	},
	rate : function(frm, cdt, cdn){
		calculate_customer_total(frm);
	},
	qty : function(frm, cdt, cdn){
		calculate_customer_total(frm);
	},
	items_remove : function(frm, cdt, cdn) {
		calculate_customer_total(frm);
	}
});

// calculates consoleerp_customer_total
var calculate_customer_total = function(frm){
	
	frappe.after_ajax(function() {
	
		var total = 0;
		
		$.each(frm.doc.items, function(i, item_doc){	

			if (item_doc.consoleerp_customer_rate){
				total += item_doc.consoleerp_customer_rate * item_doc.qty;
				
				// update og. amt. when qty is changed
				frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_original_amt", item_doc.qty * item_doc.consoleerp_customer_rate);
			}
			else
				total += item_doc.rate * item_doc.qty;

		});	
		frm.set_value("consoleerp_customer_total", total);
	});
}