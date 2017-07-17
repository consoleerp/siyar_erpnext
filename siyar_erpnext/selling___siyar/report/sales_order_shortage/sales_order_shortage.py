# Copyright (c) 2013, ConsoleERP and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _

def execute(filters=None):
	columns, data = get_columns(filters), get_data(filters)
	return columns, data
	
def get_data(filters):
	conditions = get_conditions(filters)
	return frappe.db.sql("""
		SELECT 
			so.name,
			so_item.item_code,
			item_doc.item_name,
			sum(so_item.stock_qty),
			sum(so_item.delivered_qty),
			bin.actual_qty,
			(so_item.stock_qty - so_item.delivered_qty - bin.actual_qty) as required_qty,
			so_item.warehouse
		FROM
			`tabSales Order Item` so_item,
			`tabSales Order` so,
			`tabBin` bin,
			`tabItem` item_doc
		WHERE
			so.name = so_item.parent
			AND so.docstatus = 1
			AND bin.item_code = so_item.item_code
			AND bin.warehouse = so_item.warehouse
			AND (so_item.stock_qty - so_item.delivered_qty - bin.actual_qty) > 0
			AND so_item.item_code = item_doc.item_code
			AND {}
		GROUP BY 
			so.name, so_item.item_code, so_item.warehouse;
	""".format(conditions), filters)
	
def get_columns(filters):
	return [
		_("Sales Order") + ":Link/Sales Order:100",
		_("Item Code") + ":Link/Item:100",
		_("Item Name") + ":Data:200",
		_("Ordered Qty") + ":Float:90",
		_("Delivered Qty") + ":Float:90",
		_("Available Qty") + ":Float:90",
		_("Required Qty") + ":Float:90",
		_("Warehouse") + ":Link/Warehouse:100"
	]
	
def get_conditions(filters):
	conditions = ["so_item.delivered_qty < so_item.stock_qty"]
	"""
	if filters.from_date:
		conditions.append("timestamp(so.transaction_date, '00:00') >= timestamp(%(from_date)s, '00:00')")
	if filters.to_date:
		conditions.append("timestamp(so.transaction_date, '00:00') <= timestamp(%(from_date)s, '23:59')")
	"""
	if filters.item_code:
		conditions.append("so_item.item_code = %(item_code)s")
	if filters.so:
		conditions.append("so.name = %(so)s")
		
	return " AND ".join(conditions)
