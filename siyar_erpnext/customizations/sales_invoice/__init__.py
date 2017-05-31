import frappe

def validate(self, method):		
	
	import siyar_erpnext.api
	siyar_erpnext.api.load_customer_item_name(self, method)


def before_submit(self, method):
	import consoleerp_erpnext_client.customizations.item_stock_validation	
	consoleerp_erpnext_client.customizations.item_stock_validation.validate(self, method)