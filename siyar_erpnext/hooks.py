# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "siyar_erpnext"
app_title = "Siyar Erpnext"
app_publisher = "ConsoleERP"
app_description = "ERPNext Customization for Siyar Trading"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "support@consoleerp.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/siyar_erpnext/css/siyar_erpnext.css"
# app_include_js = "/assets/siyar_erpnext/js/siyar_erpnext.js"

# include js, css files in header of web template
# web_include_css = "/assets/siyar_erpnext/css/siyar_erpnext.css"
# web_include_js = "/assets/siyar_erpnext/js/siyar_erpnext.js"

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "siyar_erpnext.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "siyar_erpnext.install.before_install"
# after_install = "siyar_erpnext.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "siyar_erpnext.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"siyar_erpnext.tasks.all"
# 	],
# 	"daily": [
# 		"siyar_erpnext.tasks.daily"
# 	],
# 	"hourly": [
# 		"siyar_erpnext.tasks.hourly"
# 	],
# 	"weekly": [
# 		"siyar_erpnext.tasks.weekly"
# 	]
# 	"monthly": [
# 		"siyar_erpnext.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "siyar_erpnext.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "siyar_erpnext.event.get_events"
# }
fixtures = [
	{"dt" : "Custom Field", "filters" : [["name", "in", ['Item Customer Detail-consolererp_discpercent']]]}, 
	"Custom Script"]
