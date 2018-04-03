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

def get_data(filters):
	data = []
	invoices = get_invoices(filters)
	total_row = get_total_template_row(filters)
	for invoice in invoices:
		if filters.detailed_report == 1:
			data, total_row = process_invoice_items(invoice, data, total_row)
		else:
			data, total_row = process_invoice(invoice, data, total_row)
			
	data.append(get_total_row(filters, data, total_row));
	return data

def get_total_template_row(filters):
	return { 'qty': 0, 'unit_price': 0, 'total': 0, 'vat_amount': 0, 'amount': 0, 'valuation_rate': 0, 'total_valuation': 0, 'profit': 0 } if filters.detailed_report == 1 else \
					{ 'total': 0, 'vat_amount': 0, 'amount': 0, 'net_value': 0 }
					
def get_total_row(filters, data, total_row):
	return ['', '', '',  '', total_row['qty'], total_row['unit_price'], total_row['total'], total_row['vat_amount'], total_row['amount'] ] if filters.detailed_report == 1 else \
		['', '', '', total_row['total'], total_row['vat_amount'], total_row['amount']]

def process_invoice(invoice, data, total_row):
	data.append([
		invoice.posting_date,
		invoice.supplier,
		invoice.name,
		invoice.net_total,
		invoice.total_taxes_and_charges,
		invoice.grand_total
	])
	total_row['total'] += invoice.net_total
	total_row['vat_amount'] += invoice.total_taxes_and_charges
	total_row['amount'] += invoice.grand_total
	return data, total_row
	
def process_invoice_items(invoice, data, total_row):
	month = invoice.posting_date.strftime("%b")
	for item in get_invoice_items(invoice):
		vat_amount = get_item_tax(invoice, item)
		data.append([
			invoice.posting_date,
			invoice.supplier,
			invoice.name,
			item.item_code + ": " + item.item_name,
			item.qty, # qty, 
			item.net_rate, # unit rate
			item.net_amount, # total
			vat_amount,
			item.net_amount + vat_amount, # total + vat
		])
		total_row['qty'] += item.qty
		total_row['unit_price'] += item.net_rate
		total_row['total'] += item.net_amount
		total_row['vat_amount'] += vat_amount
		total_row['amount'] += item.net_amount + vat_amount
		
	return data, total_row

def get_columns(filters):
	if filters.detailed_report == 1:
		return [
			"Posting Date:Date:90",
			"Supplier:Link/Supplier:120",
			"Invoice No:Link/Purchase Invoice:120",
			"Item::180",
			"Qty:Float:60",
			"U/Price:Currency/currency:80",
			"Total:Currency/currency:80",
			"Vat Amount:Currency/currency:80",
			"Amount:Currency/currency:80"
		]
	else:
		return [
			"Date:Date:90",
			"Supplier:Link/Supplier:120",
			"Invoice No:Link/Purchase Invoice:120",
			"Total:Currency/currency:80",
			"Vat Amount:Currency/currency:80",
			"Amount:Currency/currency:80"
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
	return item.total_amount - item.net_amount

def get_invoices(filters):
	# real weird
	_filters = {"posting_date": ("between", [add_to_date(filters.from_date, days=-1, as_string=True), add_to_date(filters.to_date, days=-1, as_string=True)]), "docstatus": 1}
	# _filters = {"posting_date": ("between", [filters.from_date, filters.to_date]), "docstatus": 1}
	if filters.purchase_invoice:
		_filters["name"] = filters.purchase_invoice
	if filters.supplier:
		_filters["supplier"] = filters.supplier;
	print(_filters)
	return frappe.get_all("Purchase Invoice", fields=["*"], filters=_filters, order_by="posting_date, name")

def get_invoice_items(invoice):
	return frappe.get_all("Purchase Invoice Item", fields=["*"], filters={"parent": invoice.name})