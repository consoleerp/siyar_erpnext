import frappe
import datetime
from dateutil import relativedelta
from frappe.utils import get_first_day

@frappe.whitelist()
def get_due_date(posting_date, customer):
	"""
	referenced from erpnext.accounts.party
	"""		
	if not customer or not posting_date:
		return
	
	customer_group = frappe.get_value("Customer", filters={"name": customer}, fieldname="customer_group")
	credit_days_based_on, credit_months, credit_days = frappe.db.get_value("Customer Group", customer_group, ["credit_days_based_on", "consoleerp_credit_months", "consoleerp_credit_days"])
	
	if not credit_months:
		credit_months = 0
	if not credit_days:
		credit_days = 0
	
	due_date = None
	if credit_days_based_on == "Custom Day of Custom Month":
		"""
		frappe.util.data.get_first_day(dt_string, d_years=0, d_months=0):
			Returns the first day of the month for the date specified by date object
			Also adds `d_years` and `d_months` if specified
		"""
		# referenced from get_due_date in party.py
		due_date = (get_first_day(posting_date, 0, credit_months) +
					relativedelta.relativedelta(days=credit_days - 1)).strftime("%Y-%m-%d")
		
	return due_date