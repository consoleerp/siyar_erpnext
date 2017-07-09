// Custom Day of Custom Month Due date calculation
{% include 'siyar_erpnext/customizations/customer_group/custom_day_of_custom_month.js' %}

// use this variable to properly set  the logic
// is true when coming from Sales Order
var is_rebated = false;
var manual_setValue = false;

frappe.ui.form.on('Sales Invoice', {
	refresh : function(frm) {				
	
		frappe.after_ajax(function() {

			// if reference from Sales Order is present, this is a rebated sale..
			is_rebated = (frm.doc.items.length > 0 && (frm.doc.items.some(function(e, i, arr){ return e.sales_order || e.delivery_note; })));

			// following conditions assures its a follow up document						
			// doc is localName
			// customer is set onload itself
			// and first row of items has item_code (first row is created automatically for Sales Invoice)
			if (is_rebated)
			{
				// set CustomerRate readonly
				// show Customer Total
				
				// manual set value
				manual_setValue = true;
				
				frappe.show_alert("rebated");
				// readonly customer rate
				$.grep(cur_frm.fields_dict["items"].grid.docfields, function(e){
					return e.fieldname == "consoleerp_customer_rate";
				})[0].read_only = 1;
				
				// if its not local or is sales return, return
				if (!frm.doc.__islocal || frm.doc.is_return)
				{
					manual_setValue = false;
					return;
				}
				
				// show customer total
				// cur_frm.fields_dict["consoleerp_customer_total"].df.hidden = 0;
				// cur_frm.fields_dict["consoleerp_customer_total"].refresh();
				
				var items = [];				
				// onload
				// foreach items, copy current rate to customer rate and apply discount on actual rate
				$.each(frm.doc.items, function(i, item_doc){								
					
					// adding item_code in as associative array
					items.push(item_doc.item_code);
					item_doc.consoleerp_customer_rate = item_doc.rate;
				});

				frappe.call({
					"method" : "siyar_erpnext.api.get_customer_item_disc_percent",
					args : {
						customer : frm.doc.customer,
						items : items							
					},
					callback : function(r) {
						console.log(r.message);
						$.each(frm.doc.items, function(i, item_doc){
								item_doc.consoleerp_customer_disc_percent = r.message[i];
								item_doc.rate = item_doc.consoleerp_customer_rate * (100 - item_doc.consoleerp_customer_disc_percent) / 100;
								item_doc.consoleerp_original_amt = item_doc.qty * item_doc.consoleerp_customer_rate;
								// frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_customer_disc_percent", r.message[i]);	
								// frappe.model.set_value("Sales Invoice Item", item_doc.name, "rate", item_doc.consoleerp_customer_rate * (100 - item_doc.consoleerp_customer_disc_percent) / 100);	
								// frappe.model.set_value("Sales Invoice Item", item_doc.name, "consoleerp_original_amt", item_doc.qty * item_doc.consoleerp_customer_rate);																			
						});	
						frm.refresh_fields();
						manual_setValue = false;
					}
				});
						
			} else {
				// non rebated sales
				// doing this for cache issues
				show_alert("non rebated");
				
				// setting customer rate editable
				$.grep(cur_frm.fields_dict["items"].grid.docfields, function(e){
					return e.fieldname == "consoleerp_customer_rate";
				})[0].read_only = 0;
				
				// hide customer total
				// cur_frm.fields_dict["consoleerp_customer_total"].df.hidden = 1;
				// cur_frm.fields_dict["consoleerp_customer_total"].refresh();
			}
		});

		if (frm.doc.docstatus == 1) {
			cur_frm.add_custom_button(__(frm.doc.siyar_status === "Received from Customer" ? "Set as not Received" : "Receive Invoice"), function() {
				frappe.call({
					method: "frappe.client.set_value",
					args: {
						doctype: "Sales Invoice",
						name: frm.doc.name,
						fieldname: "siyar_status",
						value: frm.doc.siyar_status === "Received from Customer" ? "To Receive" : "Received from Customer"
					},
					callback: function(r) {
						frm.reload_doc();
					}
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


frappe.ui.form.on("Sales Invoice Item", {
	item_code : function(frm, cdt, cdn) {				
		// changing item code will fetch new rate
		// load it into customer rate
		frappe.after_ajax(function(){
			manual_setValue = true;
			frappe.model.set_value(cdt, cdn, "consoleerp_customer_rate", frappe.model.get_value(cdt, cdn, "rate"));
			manual_setValue = false;
			calculate_customer_total(frm);
		});
	},
	
	
	rate : function(frm, cdt, cdn){
		
		// update customer rate if not set manually in code
		if (!manual_setValue) {
			manual_setValue = true;
			frappe.model.set_value(cdt, cdn, "consoleerp_customer_rate", frappe.model.get_value(cdt, cdn, "rate"));
			manual_setValue = false;
		}
		
		calculate_customer_total(frm);
	},
	
	
	qty : function(frm, cdt, cdn){
		calculate_customer_total(frm);
	},
	
	
	items_remove : function(frm, cdt, cdn) {
		calculate_customer_total(frm);
	},
	
	
	consoleerp_customer_rate : function(frm, cdt, cdn) {
		// this is editable only when no rebate is applicable..
		if (!is_rebated && !manual_setValue) {
			// ie if this is not loaded from Sales Order
			// set rate = this rate			
			manual_setValue = true;
			frappe.model.set_value(cdt, cdn, "rate", frappe.model.get_value(cdt, cdn, "consoleerp_customer_rate"));
			manual_setValue = false;
		}
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