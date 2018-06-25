# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.utils import cint
from erpnext.setup.utils import get_exchange_rate

# Monitors Mode of Payment of different doctypes and
# makes a GL Entry from that Account to Employee Account

def check_mode_of_payment(doc, method):
	
	# if sales invoice
	# check if is_pos
	# then get paid amount and transfer it from that Mode of Payment Account
	payments = []
	
	# Tuple
	# ( Account, Amount, BaseAmount, Party )
	if doc.doctype == "Sales Invoice" and cint(doc.is_pos) == 1:
		for mp in doc.payments:
			if frappe.get_value("Mode of Payment", mp.mode_of_payment, "deposit_to_employee"):
				payments.append((mp.account, mp.amount, mp.base_amount, doc.customer))
	elif doc.doctype == "Payment Entry" and doc.payment_type == "Receive":
		if frappe.get_value("Mode of Payment", doc.mode_of_payment, "deposit_to_employee"):
			payments.append((doc.paid_to, doc.received_amount, doc.base_received_amount, doc.party))
	
	if not payments:
		return
	
	# get employee details
	user = frappe.session.user
	employee = frappe.get_value("Employee", filters={"user_id": user})
	if not employee:
		frappe.throw("Please define employee for the current User {};\nGoto Employee -> Open/Create Employee and set current User".format(user))
	
	employee_account = frappe.get_value("Company", doc.company, "default_employee_advance_account")
	if not employee_account:
		frappe.throw("Please define Default Employee Advance Account in Company")
	
	from erpnext.accounts.utils import get_account_currency
	employee_account_currency = get_account_currency(employee_account)
	
	gl_entries = []
	for payment in payments:
		paid_to_currency = get_account_currency(payment[0])
		gl_entries.append(
			doc.get_gl_dict({
				"account": payment[0],
				"against": employee,
				"credit": payment[2],
				"credit_in_account_currency": payment[1]
			}, paid_to_currency)
		)

		exchange_rate = get_exchange_rate(paid_to_currency, employee_account_currency)
		gl_entries.append(
			doc.get_gl_dict({
				"account": employee_account,
				"party_type": "Employee",
				"party": employee,
				"against": payment[3],
				"debit": payment[2],
				"debit_in_account_currency": payment[1] * exchange_rate
			}, employee_account_currency)
		)
	
		from erpnext.accounts.general_ledger import make_gl_entries
		make_gl_entries(gl_entries, cancel=(doc.docstatus == 2),
		update_outstanding='Yes', merge_entries=False)