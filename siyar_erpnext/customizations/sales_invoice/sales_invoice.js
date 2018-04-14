// !! PREREQUISITES
// the following line should be present in Sales Invoice.js
//
//		$.extend(cur_frm.cscript, new erpnext.accounts.SalesInvoiceController({frm: cur_frm}));
//
// Methods are inherited from SalesInvoiceController via `cur_frm.csript`
// Custom Field vat_madness in Sales Taxes and Charges
// // any changes here, pls reflect in associated .py file

// Custom Day of Custom Month Due date calculation
{% include 'siyar_erpnext/customizations/customer_group/custom_day_of_custom_month.js' %}

// use this variable to properly set  the logic
// is true when coming from Sales Order
var is_rebated = false;
var manual_setValue = false;

frappe.ui.form.on('Sales Invoice', {
	setup: function(frm) {
		frm.add_fetch("customer", "customer_group", "consoleerp_customer_group");		
	},
	consoleerp_customer_group: function(frm) {
		if (!frm.doc.consoleerp_customer_group)
			return;
		frappe.call({
			method: "frappe.client.get_value",
			args: {
				doctype: "Customer Group",
				fieldname: "consoleerp_vendor_id",
				filters: frm.doc.consoleerp_customer_group
			},
			callback: function(r) {
				console.error(r);
				if (r.message) {
					frm.set_value("consoleerp_vendor_id", r.message.consoleerp_vendor_id);
				} else
					frm.set_value("consoleerp_vendor_id", "");
			}
		});
	},
	validate_with_delivery_note: function(frm) {
		frm.doc.items.forEach(function(f) {
			f.validate_with_delivery_note = frm.doc.validate_with_delivery_note;
		})
		refresh_field("items");
	},
	refresh: function(frm) {
		
		if (frm.doc.docstatus == 1) {
			frm.add_custom_button('Fix Rebate', () => {
				frappe.call({
					method: "siyar_erpnext.rebatesfix.fix_invoice",
					freeze:true,
					args: {
						sinv: cur_frm.doc.name
					},
					callback: (r) => {
						if (!r.exc)
							location.reload()
					}
				})
			});
		}
		
		// RENAME DOC
		if (frm.doc.docstatus == 0) {
			frm.add_custom_button('Rename', function() {
				frappe.prompt([
					{'fieldname': 'new_name', 'fieldtype': 'Data', 'label': 'New Name', 'reqd': 1, 'default': frm.doc.name}  
				],
				function(values){
					frappe.call({
						method: "frappe.model.rename_doc.rename_doc",
						freeze: true,
						args: {
							doctype: "Sales Invoice",
							old: frm.doc.name,
							new: values.new_name,
							force: 1
						},
						callback: function(r) {
							if (!r.exc) {
								frappe.set_route("Form", "Sales Invoice", r.message);
								frappe.msgprint("Successfully Renamed");
							} else {
								frappe.msgprint("Rename Failed");
							}
						}
					})
				},
				'Rename Sales Invoice',
				'Rename'
				)
			});
			
			
			// On clicking force rebate, it will reset all items price to price list rate
			frm.add_custom_button('Force Rebate', function() {
				
				$.each(frm.doc.items, function(i, item_doc){								
					// reset rate to customer rate
					item_doc.rate = item_doc.consoleerp_customer_rate;
				});
				
				frm.events.calculate_rebate(frm, ignore_checks=true);
			});
		}
		
		frm.events.calculate_rebate(frm);
		
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
	
	calculate_rebate: function(frm, ignore_checks = false) {
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
				
				// if its not local or is sales return or is amended, return
				if ((!frm.doc.__islocal || frm.doc.is_return || frm.doc.amended_from) && !ignore_checks)
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
					items.push({item_code: item_doc.item_code, so_detail: item_doc.so_detail, dn_detail: item_doc.dn_detail});
				});

				frappe.call({
					"method" : "siyar_erpnext.customizations.sales_invoice.get_customer_item_disc_percent",
					freeze: true,
					args : {
						customer : frm.doc.customer,
						items : items							
					},
					callback : function(r) {
						console.log(r.message);
						$.each(frm.doc.items, function(i, item_doc){
							let obj = r.message[i];
							item_doc.consoleerp_customer_disc_percent = obj.disc_percent;
							item_doc.rate = obj.rate;
							item_doc.consoleerp_customer_rate = obj.customer_rate;
							item_doc.consoleerp_original_amt = item_doc.qty * item_doc.consoleerp_customer_rate;																			
						});	
						frm.refresh_fields();
						frm.events.calculate_customer_total(frm);
						manual_setValue = false;
					}
				});
						
			} else {
				// non rebated sales
				// doing this for cache issues
				frappe.show_alert("non rebated");
				
				// setting customer rate editable
				$.grep(cur_frm.fields_dict["items"].grid.docfields, function(e){
					return e.fieldname == "consoleerp_customer_rate";
				})[0].read_only = 0;
				
				// hide customer total
				// cur_frm.fields_dict["consoleerp_customer_total"].df.hidden = 1;
				// cur_frm.fields_dict["consoleerp_customer_total"].refresh();
			}
		});
	},
	
	validate: function(frm) {
		frm.events.calculate_customer_total(frm);
	},
	// rate is for qty- not for stock_qty

	// any changes here, pls reflect in associated .py file
	calculate_customer_total: function(frm){
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
		frm.events.manual_customer_taxes_and_totals(frm);
	},
	
	/** 
	---- CASES ----
	
	**/
	manual_customer_taxes_and_totals: function(frm) {
		$.each(frm.doc.taxes || [], function(i, tax) {
			
			// On Net Total only does rate thing, checking vat_madness when doc is edited
			if (cstr(tax.charge_type) != "On Net Total" && !(cstr(tax.charge_type) == "Actual" && tax.vat_madness))
				return true; // continue
			
			if (tax.rate) // some new rate ? maybe no rate ? either case get
				tax.vat_madness = "On Net Total : " + tax.rate;
			
			// this rate will be handled by calculate_taxes_and_totals
			tax.rate = flt(tax.vat_madness.split(" : ")[1]);
			
			var amount = 0;
			$.each(frm.doc.items, function(i, item) {
				// cscript methods from taxes_and_totals.js (/erpnext/public/js/controllers/taxes_and_totals.js)
				var item_tax_map = cur_frm.cscript._load_item_tax_rate(item.item_tax_rate);
				// assuming get_tax_rate does not perform a check on charge_type
				var item_tax_rate = cur_frm.cscript._get_tax_rate(tax, item_tax_map);
				
				var item_tax_amount = item.consoleerp_original_amt * item_tax_rate / 100;
				item.consoleerp_item_tax_amount = item_tax_amount;
				item.consoleerp_item_grand_total = item.consoleerp_original_amt + item_tax_amount;
				amount += item_tax_amount;
			});
			// calculate_taxes_and_totals() is called in the end
			tax.charge_type = "Actual";
			tax.tax_amount = amount;
		});
		cur_frm.cscript.calculate_taxes_and_totals();
		frm.doc.consoleerp_customer_grand_total = frm.doc.consoleerp_customer_total + frm.doc.total_taxes_and_charges - frm.doc.discount_amount;
	}
});


frappe.ui.form.on("Sales Invoice Item", {
	item_code : function(frm, cdt, cdn) {
		setTimeout(function() {
			frappe.after_ajax(function(){
				frappe.model.set_value(cdt, cdn, "consoleerp_customer_rate", frappe.model.get_value(cdt, cdn, "rate"));
				frm.events.calculate_customer_total(frm);
			});
		}, 1000);
	},
	
	
	rate : function(frm, cdt, cdn){
		frappe.model.set_value(cdt, cdn, "consoleerp_customer_rate", frappe.model.get_value(cdt, cdn, "rate"));
		frm.events.calculate_customer_total(frm);
	},
	
	
	qty : function(frm, cdt, cdn){
		frm.events.calculate_customer_total(frm);
	},
	
	
	items_remove : function(frm, cdt, cdn) {
		frm.events.calculate_customer_total(frm);
	},

	items_add: function(frm, cdt, cdn) {
		frappe.model.set_value(cdt, cdn, "validate_with_delivery_note", frm.doc.validate_with_delivery_note);
	},

	consoleerp_customer_rate : function(frm, cdt, cdn) {
		// update consoleerp_customer_disc_percent
		locals[cdt][cdn].consoleerp_customer_disc_percent = 100 - (locals[cdt][cdn].rate / locals[cdt][cdn].consoleerp_customer_rate) * 100;
		frm.refresh_field("items");
		frm.events.calculate_customer_total(frm);
	},

	consoleerp_customer_disc_percent: function(frm, cdt, cdn) {
		locals[cdt][cdn].rate = (1 - locals[cdt][cdn].consoleerp_customer_disc_percent / 100) * locals[cdt][cdn].consoleerp_customer_rate;
		frm.refresh_field("items");
		frm.events.calculate_customer_total(frm);
	}
});