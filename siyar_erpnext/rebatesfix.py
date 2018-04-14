import frappe

@frappe.whitelist()
def fix_invoice(sinv):
	if not sinv:
		return
	
	_doc = frappe.get_doc("Sales Invoice", sinv)
	_doc.cancel()
	doc = frappe.copy_doc(_doc)
	frappe.delete_doc("Sales Invoice", _doc.name, force=1)
	doc.save()
	# doc.submit()
	frappe.rename_doc("Sales Invoice", doc.name, _doc.name, force=True)
	print(doc)
	
	return