import frappe

@frappe.whitelist()
def get_customer_item_discPercent(customer, item):
	item_doc = frappe.get_doc("Item", item)
	item_customer_detail = item_doc.get("customer_items", {"customer_name" : customer})	
	return item_customer_detail[0].consoleerp_discpercent if item_customer_detail else None