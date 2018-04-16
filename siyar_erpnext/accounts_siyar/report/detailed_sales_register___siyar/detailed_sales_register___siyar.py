# Copyright (c) 2013, ConsoleERP and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import getdate, flt, add_to_date

def execute(filters=None):
	validate_filers(filters)
	columns, data = get_columns(filters), get_data(filters)
	return columns, data

def validate_filers(filters):
	if not filters.from_date:
		frappe.throw("From Date is mandatory")
	
	if not filters.to_date:
		frappe.throw("To Date is mandatory")
		
	if not filters.detailed_report and filters.item_code:
		frappe.throw("Item Code filter is valid only in detailed report")

def get_data(filters):
	data = []
	invoices = get_invoices(filters)
	total_row = get_total_template_row(filters)
	for invoice in invoices:
		if filters.detailed_report == 1:
			data, total_row = process_invoice_items(invoice, data, total_row, filters)
		else:
			data, total_row = process_invoice(invoice, data, total_row)
	
	if len(data) > 0:
		data.append(get_total_row(filters, data, total_row));
	return data

def get_total_template_row(filters):
	return { 'qty': 0, 'unit_price': 0, 'total': 0, 'vat_amount': 0, 'amount': 0, 'rebate': 0, 'net_value': 0, 'valuation_rate': 0, 'total_valuation': 0, 'profit': 0 } if filters.detailed_report == 1 else \
					{ 'total': 0, 'vat_amount': 0, 'amount': 0, 'rebate': 0, 'net_value': 0 }
					
def get_total_row(filters, data, total_row):
	return ['', '', '', '', '', '', total_row['qty'], total_row['unit_price'], total_row['total'], total_row['vat_amount'], total_row['amount'], total_row['rebate'] / total_row['total'] * 100, total_row['rebate'], total_row['net_value'], total_row['valuation_rate'], total_row['total_valuation'], total_row['profit'], total_row['profit'] * 100 / total_row['total_valuation'] ] if filters.detailed_report == 1 else \
		['', '', '', total_row['total'], total_row['vat_amount'], total_row['amount'], total_row['rebate'], total_row['net_value']]

def process_invoice(invoice, data, total_row):
	data.append([
		invoice.posting_date,
		invoice.customer,
		invoice.name,
		invoice.consoleerp_customer_total,
		invoice.total_taxes_and_charges,
		invoice.consoleerp_customer_grand_total,
		invoice.consoleerp_customer_discount_total,
		invoice.grand_total
	])
	total_row['total'] += invoice.consoleerp_customer_total
	total_row['vat_amount'] += invoice.total_taxes_and_charges
	total_row['amount'] += invoice.consoleerp_customer_grand_total
	total_row['rebate'] += invoice.consoleerp_customer_discount_total
	total_row['net_value'] += invoice.grand_total
	return data, total_row
	
def process_invoice_items(invoice, data, total_row, filters):
	month = invoice.posting_date.strftime("%b")
	for item in get_invoice_items(invoice, filters):
		vat_amount = get_item_tax(invoice, item)
		rebate_value = flt(item.consoleerp_original_amt - item.amount) or 0 # rebate value
		valuation_rate = flt(get_valuation_rate(invoice, item)) * item.conversion_factor
		profit = item.amount - (valuation_rate * item.qty)
		data.append([
			invoice.name,
			month,
			invoice.posting_date,
			invoice.po_no,
			invoice.customer,
			item.item_code + ": " + item.item_name,
			item.qty, # qty, not taking stock_qty
			item.consoleerp_customer_rate, # unit rate
			item.consoleerp_original_amt, # customer total
			vat_amount,
			item.consoleerp_original_amt + vat_amount,
			item.consoleerp_customer_disc_percent, # rebate %
			rebate_value,
			item.amount,
			valuation_rate,
			valuation_rate * item.qty,
			profit,
			profit / item.amount * 100
		])
		total_row['qty'] += item.qty
		total_row['unit_price'] += item.consoleerp_customer_rate
		total_row['total'] += item.consoleerp_original_amt
		total_row['vat_amount'] += vat_amount
		total_row['amount'] += item.consoleerp_original_amt + vat_amount
		total_row['rebate'] += rebate_value
		total_row['net_value'] += item.amount
		total_row['valuation_rate'] += valuation_rate
		total_row['total_valuation'] += valuation_rate * item.qty
		total_row['profit'] += profit
		
	return data, total_row

def get_columns(filters):
	if filters.detailed_report == 1:
		return [
			"Invoice No:Link/Sales Invoice:120",
			"Month::80",
			"Posting Date:Date:90",
			"PO No.::60",
			"Customer:Link/Customer:120",
			"Description::180",
			"Qty:Float:60",
			"U/Price:Currency/currency:80",
			"Total:Currency/currency:80",
			"Vat Amount:Currency/currency:80",
			"Amount:Currency/currency:80",
			"Rebate %:Float:80",
			"R/ Value:Currency/currency:80",
			"Net Value:Currency/currency:80",
			"P/Kg:Currency/currency:80",
			"P/Value:Currency/currency:80",
			"Profit:Currency/currency:80",
			"Profit %:Float:80"
		]
	else:
		return [
			"Date:Date:90",
			"Customer:Link/Customer:120",
			"Invoice No:Link/Sales Invoice:120",
			"Total:Currency/currency:80",
			"Vat Amount:Currency/currency:80",
			"Amount:Currency/currency:80",
			"Rebate:Currency/currency:80",
			"Net Value:Currency/currency:80"
		]
	
def get_valuation_rate(invoice, item):
	valuation_rate = frappe.db.sql("""
		SELECT valuation_rate FROM `tabStock Ledger Entry`
		where item_code = %(item_code)s and warehouse = %(warehouse)s and valuation_rate > 0
		 and timestamp(posting_date, posting_time) < timestamp(%(posting_date)s, %(posting_time)s)
		order by posting_date desc, posting_time desc, name desc limit 1
	""", {"item_code": item.item_code, "warehouse": item.warehouse, "posting_date": invoice.posting_date, "posting_time": invoice.posting_time}, debug=False)
	return valuation_rate[0][0] if valuation_rate else 0

def get_item_tax(invoice, item):
	# consoleerp_customer_total - without tax
	return item.consoleerp_original_amt / invoice.consoleerp_customer_total * invoice.total_taxes_and_charges

def get_invoices(filters):
	# real weird
	_filters = {"posting_date": ("between", [add_to_date(filters.from_date, days=-1, as_string=True), add_to_date(filters.to_date, days=-1, as_string=True)]), "docstatus": 1}
	# _filters = {"posting_date": ("between", [filters.from_date, filters.to_date]), "docstatus": 1}
	if filters.sales_invoice:
		_filters["name"] = filters.sales_invoice
	if filters.customer:
		_filters["customer"] = filters.customer;
	print(_filters)
	return frappe.get_all("Sales Invoice", fields=["*"], filters=_filters, order_by="posting_date, name")

def get_invoice_items(invoice, filters):
	_filters = {"parent": invoice.name}
	if filters.item_code:
		_filters["item_code"] = filters.item_code
	return frappe.get_all("Sales Invoice Item", fields=["*"], filters=_filters)