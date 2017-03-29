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
		values.append(discount_row[0].disc_percent if (discount_row and discount_row[0]) else 0)
	
	return values


def load_customer_item_name(self, method):
	""" Loads the Cutomer Item Name in to the calling doc from the Item"""
	if self.doctype == "Sales Invoice" and self.consoleerp_customer_total:
		from frappe.utils import money_in_words
		self.consoleerp_customer_total_in_words = money_in_words(self.consoleerp_customer_total, self.currency)
	
	for item in self.items:
		item_doc = frappe.get_doc("Item", item.item_code)
		customer_row = item_doc.get("customer_items", {"customer_name" : self.customer})
		
		item.consoleerp_customer_item_name = None
		
		if not customer_row or not customer_row[0]:
			continue
		
		item.consoleerp_customer_item_name = customer_row[0].consoleerp_ref_name
		

@frappe.whitelist()
def item_warehouse_detail(item, warehouse):
	binDoc_list = frappe.get_list("Bin", filters={"item_code" : item, "warehouse" : warehouse}, fields=["valuation_rate", "actual_qty", "reserved_qty", "reserved_qty_for_production"])
	
	if len(binDoc_list) <= 0:
		return {"valuation_rate" : 0, "actual_qty" : 0, "reserved_qty" : 0, "reserved_qty_for_production" : 0}
		
	return binDoc_list[0]

	