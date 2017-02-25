import frappe

@frappe.whitelist()
def get_customer_items_discPercent(customer, item):
	item_doc = frappe.get_doc("Item", item)
	item_customer_detail = item_doc.get("customer_items", {"customer_name" : customer})	
	return item_customer_detail[0].consoleerp_discpercent if item_customer_detail else None
	
	
@frappe.whitelist()
def get_customer_item_disc_percent(customer, item):	
	item_group = frappe.get_value(doctype="Item", filters={"name" : item}, fieldname="item_group")
	if not item_group:
		return 0	
	
	item_group_doc = frappe.get_doc("Item Group", item_group);
	customer_group = frappe.get_value(doctype="Customer", filters={"name" : customer}, fieldname="customer_group")
	discount_row = item_group_doc.get("consoleerp_custgroup_discount", {"customer_group" : customer_group})	
	return discount_row[0].disc_percent if discount_row else None
