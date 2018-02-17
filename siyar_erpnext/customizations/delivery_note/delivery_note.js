frappe.ui.form.on("Delivery Note Item", {
	consoleerp_multi_batch: function(frm, cdt, cdn) {
		var doc = locals[cdt][cdn];
		doc.has_batch_no = true;
		doc.batch_no = null;
		erpnext.show_serial_batch_selector(frm, doc, (item) => {
			frm.script_manager.trigger('qty', item.doctype, item.name);
		});
	}
});