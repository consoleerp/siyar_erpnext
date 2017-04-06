// general code

frappe.ui.form.on(cur_frm.doctype, {
	// updates when customer or posting_date is changed
	customer: function(frm){
		update_due_date(frm);
	},
	posting_date: function(frm) {		
		setTimeout(function() {    
			update_due_date(frm);
		}, 500);
		
	}
	
});

var update_due_date = function(frm) {
	
	// if due date isnt applicable, return
	if (frm.doc.is_pos || !frm.doc.customer)
		return;
		
	// waiting till the system fetches the default
	frappe.after_ajax(function(){
		
		// this will call a py function, checks if 
		// for the customer group, credit mode == custom day of custom month
		// 	bring new date
		// else return null and dont touch any date			
		frappe.call({
			method : "siyar_erpnext.customizations.customer_group.get_due_date",
			args : {
				posting_date: frm.doc.posting_date,
				customer: frm.doc.customer
			},	
			callback : function(r)
			{
				if (r.message)
					frm.set_value("due_date", r.message);
			}
		});
		
	});
};