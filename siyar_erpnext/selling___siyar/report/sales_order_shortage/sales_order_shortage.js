frappe.query_reports["Sales Order Shortage"] = {
    "filters": [
        {
            "fieldname":"item_code",
            "label": __("Item"),
            "fieldtype": "Link",
            "options": "Item"
        },
		{
			"fieldname": "so",
			"label": "Sales Order",
			"fieldtype": "Link",
			"options": "Sales Order"
		}
    ]
}