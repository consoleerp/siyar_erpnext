frappe.ui.form.on("Purchase Invoice", {
	onload: function(frm) {
		frappe.after_ajax(function() {				
				frm.set_value("bill_date", frm.doc.posting_date);
		});
	},
	posting_date: function(frm, cdt, cdn) {
		frm.set_value("bill_date", frm.doc.posting_date);
	}
});