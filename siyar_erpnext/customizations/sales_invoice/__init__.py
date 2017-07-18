import frappe

def validate(self, method):		

	import siyar_erpnext.api
	siyar_erpnext.api.load_customer_item_name(self, method)
	calculate_customer_total(self)


def before_submit(self, method):
	import consoleerp_erpnext_client.customizations.item_stock_validation	
	consoleerp_erpnext_client.customizations.item_stock_validation.validate(self, method)


def calculate_customer_total(self):
	total = 0
	for cdoc in self.items:
		if cdoc.consoleerp_customer_rate:
			total += cdoc.consoleerp_customer_rate * cdoc.qty
			cdoc.consoleerp_original_amt = cdoc.consoleerp_customer_rate * cdoc.qty
		else:
			total += cdoc.rate * cdoc.qty

	self.consoleerp_customer_total = total
	self.consoleerp_customer_discount_total = self.consoleerp_customer_total - self.total
	self.consoleerp_order_total = self.total