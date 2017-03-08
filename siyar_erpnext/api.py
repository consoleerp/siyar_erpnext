import frappe, ast
	
@frappe.whitelist()
def get_customer_item_disc_percent(customer, items):	
	
	customer_group = frappe.get_value(doctype="Customer", filters={"name" : customer}, fieldname="customer_group")
	
	print customer
	print items
	items = ast.literal_eval(items)
	print items
	
	values = []
	for item in items:
		print item
		item_group = frappe.get_value(doctype="Item", filters={"name" : item}, fieldname="item_group")
		if not item_group:
			continue	
	
		item_group_doc = frappe.get_doc("Item Group", item_group)
		discount_row = item_group_doc.get("consoleerp_custgroup_discount", {"customer_group" : customer_group})	
		values.append(discount_row[0].disc_percent if discount_row else 0)
	
	return values
