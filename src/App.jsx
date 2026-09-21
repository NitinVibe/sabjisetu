import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { api } from "./api.js";
import {
  LayoutDashboard, ShoppingBasket, Store, Boxes, Truck, Users, Wallet,
  Receipt, HardHat, BarChart3, MessageCircle, Bell, Settings as SettingsIcon,
  DatabaseBackup, LockKeyhole, Eye, EyeOff, LogOut, Search, Plus, Trash2, Pencil, X, ArrowUpRight, ArrowDownRight,
  Send, Download, RefreshCw, Check, CircleDollarSign, ChevronDown, Phone, Menu, Camera, Upload, XCircle, AlertTriangle, CheckCircle2, Info, HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar
} from "recharts";

/* ---------------------------------------------------------------
   THEME
   Sidebar: deep green (emerald-900) with soft-green active pill
   Accent stat colors: green / blue / purple / orange / teal
   Status colors: red (overdue), amber (due today), green (upcoming/paid)
--------------------------------------------------------------- */


/* ---------------------------------------------------------------
   SIMPLE UI LANGUAGE SWITCHER
   The app keeps all business/data values unchanged and translates
   the visible interface text between English and Hindi.
--------------------------------------------------------------- */
const LanguageContext = createContext("en");
const useLanguage = () => useContext(LanguageContext);

function itemLabel(name, masters, language) {
  const raw = String(name || "").trim();
  if (!raw || language !== "hi") return raw;
  const found = (masters?.items || []).find(i =>
    String(i.nameEn || "").trim().toLowerCase() === raw.toLowerCase()
  );
  return String(found?.nameHi || raw);
}

const UI_HI = {
  "Dashboard": "डैशबोर्ड",
  "Dashboard Overview": "डैशबोर्ड अवलोकन",
  "Welcome back": "वापसी पर स्वागत है",
  "Mandi Purchase": "मंडी खरीद",
  "Mandi Purchases": "मंडी खरीदारी",
  "Track produce bought at the mandi": "मंडी से खरीदी गई उपज का रिकॉर्ड रखें",
  "Local Purchase": "स्थानीय खरीद",
  "Local Purchases": "स्थानीय खरीदारी",
  "Track produce bought from local farmers/vendors": "स्थानीय किसानों/विक्रेताओं से खरीदी गई उपज का रिकॉर्ड रखें",
  "Stock / Inventory": "स्टॉक / इन्वेंटरी",
  "Live quantity and value on hand": "उपलब्ध मात्रा और मूल्य",
  "Sales / Supply": "बिक्री / सप्लाई",
  "Record supply and retail sales": "सप्लाई और खुदरा बिक्री दर्ज करें",
  "Customers": "ग्राहक",
  "Everyone you trade with": "जिन सभी ग्राहकों से आपका व्यापार है",
  "Payments & Due": "भुगतान और बकाया",
  "Who owes what, and since when": "किसका कितना बकाया है और कब से",
  "Expenses": "खर्चे",
  "Daily running costs": "दैनिक संचालन खर्च",
  "Labour / Majdoor": "मजदूर / लेबर",
  "Loading, unloading and sorting wages": "लोडिंग, अनलोडिंग और छंटाई की मजदूरी",
  "Reports & Analytics": "रिपोर्ट और विश्लेषण",
  "How the business is trending": "व्यवसाय का प्रदर्शन कैसा चल रहा है",
  "WhatsApp Bills": "व्हाट्सऐप बिल",
  "Send bills straight to customers": "बिल सीधे ग्राहकों को भेजें",
  "Notifications": "सूचनाएं",
  "Everything that needs your attention": "हर जरूरी सूचना यहां देखें",
  "Settings": "सेटिंग्स",
  "Business and account preferences": "व्यवसाय और अकाउंट की सेटिंग्स",
  "Backup / Export": "बैकअप / एक्सपोर्ट",
  "Keep a copy of your data": "अपने डेटा की एक कॉपी सुरक्षित रखें",
  "Fresh Produce": "ताजी सब्जियां",
  "Healthy Future": "स्वस्थ भविष्य",
  "Connected": "कनेक्टेड",
  "Owner": "मालिक",
  "Search…": "खोजें…",
  "Search customers, items, bills…": "ग्राहक, आइटम, बिल खोजें…",
  "No matches for \"{query}\".": "\"{query}\" के लिए कोई परिणाम नहीं मिला।",
  "You're all caught up.": "सभी सूचनाएं देख ली गई हैं।",
  "View all notifications": "सभी सूचनाएं देखें",
  "Mark all as read": "सभी को पढ़ा हुआ करें",
  "Mark read": "पढ़ा हुआ करें",
  "Low Stock Alert Threshold (Kg)": "कम स्टॉक अलर्ट सीमा (किग्रा)",
  "Close navigation": "नेविगेशन बंद करें",
  "Open navigation": "नेविगेशन खोलें",
  "Quantity": "मात्रा",
  "Qty": "मात्रा",
  "Unit": "इकाई",
  "Rate (₹/Kg)": "रेट (₹/किग्रा)",
  "Rate/Kg": "रेट/किग्रा",
  "Amount": "राशि",
  "Amount (₹)": "राशि (₹)",
  "Date": "दिनांक",
  "Status": "स्थिति",
  "Item": "आइटम",
  "Specification": "स्पेसिफिकेशन",
  "Item Specification (optional)": "आइटम स्पेसिफिकेशन (वैकल्पिक)",
  "No specification": "कोई स्पेसिफिकेशन नहीं",
  "Specification name (e.g. Langda Mango)": "स्पेसिफिकेशन का नाम (जैसे लंगड़ा आम)",
  "Specifications, comma separated": "स्पेसिफिकेशन, कॉमा से अलग करें",
  "English name": "अंग्रेजी नाम",
  "Hindi name": "हिंदी नाम",
  "Type vegetable name…": "सब्जी का नाम लिखें…",
  "Select customer": "ग्राहक चुनें",
  "Customer": "ग्राहक",
  "Customer Mobile Number": "ग्राहक का मोबाइल नंबर",
  "Mobile Number": "मोबाइल नंबर",
  "No mobile": "मोबाइल नहीं है",
  "Name": "नाम",
  "Note": "नोट",
  "Category": "श्रेणी",
  "Vendor/Farmer": "विक्रेता/किसान",
  "Vendor / Mandi name": "विक्रेता / मंडी का नाम",
  "Work Type": "काम का प्रकार",
  "Workers": "मजदूर",
  "No. of Workers": "मजदूरों की संख्या",
  "Crew / Worker Name": "मजदूर / कर्मचारी का नाम",
  "Crew": "मजदूर दल",
  "Priority": "प्राथमिकता",
  "Profit": "लाभ",
  "Revenue": "राजस्व",
  "Margin": "मार्जिन",
  "Purchase": "खरीद",
  "Sales": "बिक्री",
  "Stock": "स्टॉक",
  "Inventory": "इन्वेंटरी",
  "Sold": "बिक्री मात्रा",
  "Sold Quantity": "बेची गई मात्रा",
  "Stock Value": "स्टॉक मूल्य",
  "Qty in Stock": "स्टॉक में मात्रा",
  "Avg. Cost": "औसत लागत",
  "Avg. Cost/Kg": "औसत लागत/किग्रा",
  "Avg. Rate": "औसत रेट",
  "Selling Price": "बिक्री मूल्य",
  "Selling Price/Kg": "बिक्री मूल्य/किग्रा",
  "Demand/Day": "दैनिक मांग",
  "Avg/Day": "औसत/दिन",
  "Stock Cover": "स्टॉक कवरेज",
  "Suggested Buy": "सुझाई गई खरीद",
  "Current Stock": "वर्तमान स्टॉक",
  "Current Stock Snapshot": "वर्तमान स्टॉक स्थिति",
  "Stock Alerts": "स्टॉक अलर्ट",
  "Recent Sales": "हाल की बिक्री",
  "Recent Due List": "हाल की बकाया सूची",
  "Top Selling Sabji (Today)": "आज की सबसे ज्यादा बिकने वाली सब्जियां",
  "High-Demand Sabji (by quantity sold)": "अधिक मांग वाली सब्जियां (बिक्री मात्रा के अनुसार)",
  "Highest Profit Sabji": "सबसे अधिक लाभ वाली सब्जियां",
  "What Should I Purchase Next?": "अब क्या खरीदना चाहिए?",
  "Payment Overview": "भुगतान विवरण",
  "Due Summary": "बकाया विवरण",
  "Purchase Summary (Today)": "आज की खरीद का विवरण",
  "Outstanding Due": "कुल बकाया",
  "Customers With Due": "बकाया वाले ग्राहक",
  "Total Due": "कुल बकाया",
  "Total Receivable": "कुल प्राप्ति योग्य",
  "Total Sales": "कुल बिक्री",
  "Total Purchase": "कुल खरीद",
  "Total Customers": "कुल ग्राहक",
  "Total Quantity": "कुल मात्रा",
  "Total Quantity Sold": "कुल बिक्री मात्रा",
  "Total Stock Value": "कुल स्टॉक मूल्य",
  "Total Expenses": "कुल खर्चे",
  "Total Labour Cost": "कुल मजदूरी खर्च",
  "Total Business": "कुल व्यवसाय",
  "Collected Today": "आज प्राप्त राशि",
  "Sales Still Due": "अभी भी बकाया बिक्री",
  "Gross Profit": "सकल लाभ",
  "COGS": "बिक्री लागत",
  "Expenses + Labour": "खर्चे + मजदूरी",
  "Today's Purchase": "आज की खरीद",
  "Today's Sales": "आज की बिक्री",
  "Today's Gross Profit": "आज का सकल लाभ",
  "Today's Net Profit": "आज का शुद्ध लाभ",
  "After expenses & labour": "खर्चे और मजदूरी के बाद",
  "This Month": "इस महीने",
  "This Month (Database Totals)": "इस महीने (डेटाबेस कुल)",
  "Last 7 Days": "पिछले 7 दिन",
  "Business Overview": "व्यवसाय अवलोकन",
  "Expense Log": "खर्च लॉग",
  "Labour Log": "मजदूरी लॉग",
  "Business Profile": "व्यवसाय प्रोफाइल",
  "Master Settings": "मास्टर सेटिंग्स",
  "1. Vegetable / Item Master": "1. सब्जी / आइटम मास्टर",
  "2. Quantity Unit Master": "2. मात्रा इकाई मास्टर",
  "3. Vendor / Supplier Master": "3. विक्रेता / सप्लायर मास्टर",
  "4. Expense Category Master": "4. खर्च श्रेणी मास्टर",
  "5. Business Rules": "5. व्यवसाय नियम",
  "Business Name": "व्यवसाय का नाम",
  "Owner Name": "मालिक का नाम",
  "Tagline": "टैगलाइन",
  "Currency Symbol": "मुद्रा चिन्ह",
  "Save Business": "व्यवसाय सेव करें",
  "Saved.": "सेव हो गया।",
  "Add / Update Item": "आइटम जोड़ें / अपडेट करें",
  "Add / Update Unit": "इकाई जोड़ें / अपडेट करें",
  "Add Vendor": "विक्रेता जोड़ें",
  "Add Category": "श्रेणी जोड़ें",
  "Add Customer": "ग्राहक जोड़ें",
  "Add Expense": "खर्च जोड़ें",
  "Add Labour Entry": "मजदूरी एंट्री जोड़ें",
  "Add Purchase": "खरीद जोड़ें",
  "Add Stock Item": "स्टॉक आइटम जोड़ें",
  "New Supply (Sale)": "नई सप्लाई (बिक्री)",
  "Record Customer Payment": "ग्राहक भुगतान दर्ज करें",
  "Collect": "वसूलें",
  "Save Payment": "भुगतान सेव करें",
  "Save Sale": "बिक्री सेव करें",
  "Save Changes": "बदलाव सेव करें",
  "Save Contact": "कॉन्टैक्ट सेव करें",
  "Save Customer": "ग्राहक सेव करें",
  "Save Expense": "खर्च सेव करें",
  "Save Entry": "एंट्री सेव करें",
  "Save Mobile Number": "मोबाइल नंबर सेव करें",
  "Save Item": "आइटम सेव करें",
  "Edit": "संपादित करें",
  "Delete": "हटाएं",
  "Edit Customer": "ग्राहक संपादित करें",
  "Edit Customer Contact": "ग्राहक कॉन्टैक्ट संपादित करें",
  "Edit Sale / Customer Contact": "बिक्री / ग्राहक कॉन्टैक्ट संपादित करें",
  "Edit Stock Item": "स्टॉक आइटम संपादित करें",
  "Clear": "साफ करें",
  "Apply": "लागू करें",
  "Retry": "फिर कोशिश करें",
  "Send": "भेजें",
  "WhatsApp": "व्हाट्सऐप",
  "Send WhatsApp reminder": "व्हाट्सऐप रिमाइंडर भेजें",
  "WhatsApp Opened": "व्हाट्सऐप खोला गया",
  "Open All Pending": "सभी लंबित खोलें",
  "Opened": "खोला गया",
  "Overdue": "बकाया",
  "Due Today": "आज बकाया",
  "Upcoming": "आगामी",

  "Sent": "भेजा गया",
  "Not sent": "नहीं भेजा गया",
  "Read": "पढ़ा हुआ",
  "Unread": "अपठित",
  "Paid": "भुगतान हो चुका",
  "Due": "बकाया",
  "Due Today": "आज बकाया",
  "Overdue": "समय से बकाया",
  "Upcoming": "आने वाला",
  "Available": "उपलब्ध",
  "Pending": "लंबित",
  "Other": "अन्य",
  "Mandi": "मंडी",
  "Local": "स्थानीय",
  "Both": "दोनों",
  "Loading": "लोडिंग",
  "Unloading": "अनलोडिंग",
  "Sorting": "छंटाई",
  "All": "सभी",
  "All Due Statuses": "सभी बकाया स्थितियां",
  "All Statuses": "सभी स्थितियां",
  "All Items": "सभी आइटम",
  "All Types": "सभी प्रकार",
  "Search item or stock status…": "आइटम या स्टॉक स्थिति खोजें…",
  "Search customer name or mobile…": "ग्राहक नाम या मोबाइल खोजें…",
  "Search customer or mobile…": "ग्राहक या मोबाइल खोजें…",
  "Search customer, mobile, item…": "ग्राहक, मोबाइल, आइटम खोजें…",
  "Search category or note…": "श्रेणी या नोट खोजें…",
  "Search notifications…": "सूचनाएं खोजें…",
  "No records yet — add your first one.": "अभी कोई रिकॉर्ड नहीं है — पहला रिकॉर्ड जोड़ें।",
  "No sales yet.": "अभी कोई बिक्री नहीं है।",
  "No sales recorded today.": "आज कोई बिक्री दर्ज नहीं है।",
  "No outstanding dues.": "कोई बकाया नहीं है।",
  "No stock alerts.": "कोई स्टॉक अलर्ट नहीं है।",
  "No recent sales": "हाल की कोई बिक्री नहीं",
  "No specifications yet": "अभी कोई स्पेसिफिकेशन नहीं",
  "Loading data from the database…": "डेटाबेस से डेटा लोड हो रहा है…",
  "Calculating from database…": "डेटाबेस से गणना हो रही है…",
  "Full Backup": "पूरा बैकअप",
  "Download Full Backup (JSON)": "पूरा बैकअप डाउनलोड करें (JSON)",
  "Export Individual Sheets (CSV)": "अलग-अलग शीट एक्सपोर्ट करें (CSV)",
  "Last backup:": "अंतिम बैकअप:",
  "Not backed up this session": "इस सेशन में बैकअप नहीं लिया गया",
  "Control English name, Hindi name and optional specifications. These names power suggestions everywhere.": "अंग्रेजी नाम, हिंदी नाम और वैकल्पिक स्पेसिफिकेशन नियंत्रित करें। यही नाम पूरे ऐप में सुझावों के लिए उपयोग होते हैं।",
  "All stock is stored internally in Kg. This master controls conversion.": "सारा स्टॉक अंदरूनी रूप से किलोग्राम में रखा जाता है। यह मास्टर इकाई रूपांतरण नियंत्रित करता है।",
  "Quantity conversion, item naming, vendor lists and expense categories are controlled above. Transaction totals remain database-driven; no hardcoded quantities or prices are used.": "मात्रा रूपांतरण, आइटम नाम, विक्रेता सूची और खर्च श्रेणियां ऊपर नियंत्रित होती हैं। लेन-देन के कुल आंकड़े डेटाबेस से आते हैं; कोई मात्रा या कीमत हार्डकोड नहीं है।",
  "Recommendations use sales velocity, current stock coverage and profitability. Suggested quantity targets about 7 days of demand.": "सुझाव बिक्री की गति, वर्तमान स्टॉक कवरेज और लाभ पर आधारित हैं। सुझाई गई मात्रा लगभग 7 दिनों की मांग के बराबर है।",
  "Couldn't reach the API": "API से कनेक्ट नहीं हो सका",
  "Make sure the backend server is running": "सुनिश्चित करें कि बैकएंड सर्वर चल रहा है",
  "Phone": "फोन",
  "Phone Number": "फोन नंबर",
  "No mobile": "मोबाइल नहीं है",
  "Stock Status": "स्टॉक स्थिति",
  "Available": "उपलब्ध",
  "Save": "सेव करें",
  "Saving…": "सेव हो रहा है…",
  "Add Item": "आइटम जोड़ें",
  "Add Stock Item": "स्टॉक आइटम जोड़ें",
  "Add Purchase": "खरीद जोड़ें",
  "Add Expense": "खर्च जोड़ें",
  "Add Labour Entry": "मजदूरी एंट्री जोड़ें",
  "Add Customer": "ग्राहक जोड़ें",
  "Add Vendor": "विक्रेता जोड़ें",
  "Add Category": "श्रेणी जोड़ें",
  "Categories": "श्रेणियां",
  "Stock Cover": "स्टॉक कवरेज",
  "Suggested Buy": "सुझाई गई खरीद",
  "Purchase Overview": "खरीद अवलोकन",
  "Date-wise Overview": "दिनांकवार अवलोकन",
  "Date-wise Overview (": "दिनांकवार अवलोकन (",
  "Mandi Purchase Entries": "मंडी खरीद प्रविष्टियां",
  "Total Mandi Purchase": "कुल मंडी खरीद",
  "Local Purchase Entries": "स्थानीय खरीद प्रविष्टियां",
  "Total Local Purchase": "कुल स्थानीय खरीद",
  "Search vendor, item…": "विक्रेता खोजें, आइटम…",
  "Search mandi, item…": "मंडी खोजें, आइटम…",
  "Search vendor/farmer, item…": "विक्रेता/किसान खोजें, आइटम…",
  "Stock alert": "स्टॉक चेतावनी",
  "Due today": "आज देय",
  "Send WhatsApp reminder": "व्हाट्सऐप रिमाइंडर भेजें",
  "Overdue": "बकाया",
  "Due Today": "आज बकाया",
  "Upcoming": "आगामी",

  "Monthly Overview": "मासिक अवलोकन",
  "Date-wise Overview (": "दिनांकवार अवलोकन (",
  "Monthly Overview (": "मासिक अवलोकन (",
  "DATE": "दिनांक",
  "SALES": "बिक्री",
  "PURCHASE": "खरीद",
  "SOLD": "बिक्री मात्रा",
  "REVENUE": "राजस्व",
  "PROFIT": "लाभ",
  "MARGIN": "मार्जिन",
  "AVG/DAY": "औसत/दिन",
  "SABJI": "सब्जी",
  "JI": "सब्जी",
  "Pending": "लंबित",
  "Hold": "रोकें",
  "Total": "कुल",
  "Apply": "लागू करें",
  "From date": "प्रारंभ दिनांक",
  "To date": "अंतिम दिनांक",
  "e.g. Azadpur Mandi": "जैसे आजादपुर मंडी",
  "e.g. Sharma Kirana": "जैसे शर्मा किराना",
  "e.g. Fuel": "जैसे ईंधन",
  "e.g. Langda Mango": "जैसे लंगड़ा आम",
  "1 unit = ? Kg": "1 इकाई = ? किग्रा",
  "Unit name": "इकाई का नाम",
  "Symbol": "चिन्ह",
  "Labour": "मजदूरी",
  "Total Labour Cost": "कुल मजदूरी खर्च",
  "Workers Engaged": "काम पर लगे मजदूर",
  "Expenses": "खर्चे",
  "Collected": "प्राप्त राशि",
  "Sales on Due": "बकाया बिक्री",
  "Sales Still Due": "अभी भी बकाया बिक्री",
  "Bills Sent": "भेजे गए बिल",
  "Read": "पढ़ा हुआ",
  "Unread": "अपठित",
  "Urgent": "तुरंत",
  "URGENT": "तुरंत",
  "HIGH": "उच्च",
  "MEDIUM": "मध्यम",
  "Download Full Backup (JSON)": "पूरा बैकअप डाउनलोड करें (JSON)",
  "Export Individual Sheets (CSV)": "अलग-अलग शीट एक्सपोर्ट करें (CSV)",
};


/* Additional UI strings used by the individual pages.  Keep business/data
   values untouched; only presentation text is translated. */
Object.assign(UI_HI, {
  "Today's Purchase": "आज की खरीद",
  "Today's Sales": "आज की बिक्री",
  "Today's Gross Profit": "आज का सकल लाभ",
  "Today's Net Profit": "आज का शुद्ध लाभ",
  "Today's Operating Costs": "आज के संचालन खर्च",
  "Purchase Summary (Today)": "आज की खरीद का विवरण",
  "Due Summary": "बकाया विवरण",
  "Top Selling Sabji (Today)": "आज की सबसे ज्यादा बिकने वाली सब्जियां",
  "Payment Overview": "भुगतान विवरण",
  "Current Stock Snapshot": "वर्तमान स्टॉक स्थिति",
  "Recent Due List": "हाल की बकाया सूची",
  "Recent Sales": "हाल की बिक्री",
  "Stock Alerts": "स्टॉक अलर्ट",
  "This Month (Database Totals)": "इस महीने (डेटाबेस कुल)",
  "Total Quantity": "कुल मात्रा",
  "Avg. Rate": "औसत रेट",
  "Total Stock Value": "कुल स्टॉक मूल्य",
  "Sales / Supply Entries": "बिक्री / सप्लाई एंट्री",
  "Total Sales": "कुल बिक्री",
  "Total Quantity Sold": "कुल बिक्री मात्रा",
  "Sales on Due": "बकाया बिक्री",
  "Total Customers": "कुल ग्राहक",
  "Total Receivable": "कुल प्राप्ति योग्य",
  "Total Business": "कुल व्यवसाय",
  "All Customers": "सभी ग्राहक",
  "Record Payment": "भुगतान दर्ज करें",
  "Cash / UPI / bank": "कैश / UPI / बैंक",
  "Note (optional)": "नोट (वैकल्पिक)",
  "Total Expenses": "कुल खर्चे",
  "Expense Log": "खर्च लॉग",
  "e.g. Transport Fare": "जैसे परिवहन किराया",
  "Total Labour Cost": "कुल मजदूरी खर्च",
  "Workers Engaged": "काम पर लगे मजदूर",
  "Labour Log": "मजदूरी लॉग",
  "Business Overview": "व्यवसाय अवलोकन",
  "Sold Quantity": "बेची गई मात्रा",
  "Sales": "बिक्री",
  "Purchase": "खरीद",
  "COGS": "बिक्री लागत",
  "Gross Profit": "सकल लाभ",
  "Expenses + Labour": "खर्चे + मजदूरी",
  "Stock Value": "स्टॉक मूल्य",
  "High-Demand Sabji (by quantity sold)": "अधिक मांग वाली सब्जियां (बिक्री मात्रा के अनुसार)",
  "Highest Profit Sabji": "सबसे अधिक लाभ वाली सब्जियां",
  "What Should I Purchase Next?": "अब क्या खरीदना चाहिए?",
  "Bills Sent": "भेजे गए बिल",
  "WhatsApp Bills": "व्हाट्सऐप बिल",
  "Notifications": "सूचनाएं",
  "Business Profile": "व्यवसाय प्रोफाइल",
  "Master Settings": "मास्टर सेटिंग्स",
  "English name": "अंग्रेजी नाम",
  "Hindi name": "हिंदी नाम",
  "Specifications, comma separated": "स्पेसिफिकेशन, कॉमा से अलग करें",
  "Unit name": "इकाई का नाम",
  "Symbol": "चिन्ह",
  "Vendor / Mandi name": "विक्रेता / मंडी का नाम",
  "Full Backup": "पूरा बैकअप",
  "Mandi Purchases": "मंडी खरीदारी",
  "Local Purchases": "स्थानीय खरीदारी",
  "Stock": "स्टॉक",
  "Customers": "ग्राहक",
  "Loading data from the database…": "डेटाबेस से डेटा लोड हो रहा है…",
  "Calculating from database…": "डेटाबेस से गणना हो रही है…",
  "Recommendations use sales velocity, current stock coverage and profitability. Suggested quantity targets about 7 days of demand.": "सुझाव बिक्री की गति, वर्तमान स्टॉक कवरेज और लाभ पर आधारित हैं। सुझाई गई मात्रा लगभग 7 दिनों की मांग के बराबर है।",
  "No notifications match your filters.": "आपके फ़िल्टर से कोई सूचना मेल नहीं खाती।",
  "Control English name, Hindi name and optional specifications. These names power suggestions everywhere.": "अंग्रेजी नाम, हिंदी नाम और वैकल्पिक स्पेसिफिकेशन नियंत्रित करें। यही नाम पूरे ऐप में सुझावों के लिए उपयोग होते हैं।",
  "All stock is stored internally in Kg. This master controls conversion.": "सारा स्टॉक अंदरूनी रूप से किलोग्राम में रखा जाता है। यह मास्टर इकाई रूपांतरण नियंत्रित करता है।",
  "Quantity conversion, item naming, vendor lists and expense categories are controlled above. Transaction totals remain database-driven; no hardcoded quantities or prices are used.": "मात्रा रूपांतरण, आइटम नाम, विक्रेता सूची और खर्च श्रेणियां ऊपर नियंत्रित होती हैं। लेन-देन के कुल आंकड़े डेटाबेस से आते हैं; कोई मात्रा या कीमत हार्डकोड नहीं है।",
  "Make sure the backend server is running": "सुनिश्चित करें कि बैकएंड सर्वर चल रहा है",
  "Couldn't reach the API": "API से कनेक्ट नहीं हो सका",
  "10 digit mobile number": "10 अंकों का मोबाइल नंबर",
  "e.g. Sharma Kirana": "जैसे शर्मा किराना",
  "e.g. Azadpur Mandi": "जैसे आजादपुर मंडी",
  "e.g. Fuel": "जैसे ईंधन",
  "e.g. Langda Mango": "जैसे लंगड़ा आम",
  "1 unit = ? Kg": "1 इकाई = ? किग्रा",
  "e.g. Available, Low Stock, Reserved": "जैसे उपलब्ध, कम स्टॉक, आरक्षित",
  "Search item or stock status…": "आइटम या स्टॉक स्थिति खोजें…",
  "Search customer, mobile, item…": "ग्राहक, मोबाइल, आइटम खोजें…",
  "Search customer name or mobile…": "ग्राहक नाम या मोबाइल खोजें…",
  "Search customer or mobile…": "ग्राहक या मोबाइल खोजें…",
  "Search category or note…": "श्रेणी या नोट खोजें…",
  "Search notifications…": "सूचनाएं खोजें…",
  "Select customer": "ग्राहक चुनें",
  "Customer": "ग्राहक",
  "Customer Mobile Number": "ग्राहक का मोबाइल नंबर",
  "Payment Status": "भुगतान स्थिति",
  "New Supply (Sale)": "नई सप्लाई (बिक्री)",
  "Record Customer Payment": "ग्राहक भुगतान दर्ज करें",
  "Save Payment": "भुगतान सेव करें",
  "Save Sale": "बिक्री सेव करें",
  "Save Customer": "ग्राहक सेव करें",
  "Save Contact": "कॉन्टैक्ट सेव करें",
  "Save Expense": "खर्च सेव करें",
  "Save Entry": "एंट्री सेव करें",
  "Save Mobile Number": "मोबाइल नंबर सेव करें",
  "Save Item": "आइटम सेव करें",
  "Save Changes": "बदलाव सेव करें",
  "Save Business": "व्यवसाय सेव करें",
  "Saved.": "सेव हो गया।",
  "Add / Update Item": "आइटम जोड़ें / अपडेट करें",
  "Add / Update Unit": "इकाई जोड़ें / अपडेट करें",
  "Add Vendor": "विक्रेता जोड़ें",
  "Add Category": "श्रेणी जोड़ें",
  "Add Item": "आइटम जोड़ें",
  "Add Purchase": "खरीद जोड़ें",
  "Add Stock Item": "स्टॉक आइटम जोड़ें",
  "Add Customer": "ग्राहक जोड़ें",
  "Add Expense": "खर्च जोड़ें",
  "Add Labour Entry": "मजदूरी एंट्री जोड़ें",
  "Edit Stock Item": "स्टॉक आइटम संपादित करें",
  "Edit Sale / Customer Contact": "बिक्री / ग्राहक कॉन्टैक्ट संपादित करें",
  "Edit Customer": "ग्राहक संपादित करें",
  "Edit Customer Contact": "ग्राहक कॉन्टैक्ट संपादित करें",
  "Edit": "संपादित करें",
  "Delete": "हटाएं",
  "Clear": "साफ करें",
  "Retry": "फिर कोशिश करें",
  "Send": "भेजें",
  "Collect": "वसूलें",
  "Send WhatsApp reminder": "व्हाट्सऐप रिमाइंडर भेजें",
  "Overdue": "बकाया",
  "Due Today": "आज बकाया",
  "Upcoming": "आगामी",

  "Sent": "भेजा गया",
  "Not sent": "नहीं भेजा गया",
  "Read": "पढ़ा हुआ",
  "Unread": "अपठित",
  "Paid": "भुगतान हो चुका",
  "Due": "बकाया",
  "Due Today": "आज बकाया",
  "Overdue": "समय से बकाया",
  "Upcoming": "आने वाला",
  "Available": "उपलब्ध",
  "Pending": "लंबित",
  "Other": "अन्य",
  "Mandi": "मंडी",
  "Local": "स्थानीय",
  "Both": "दोनों",
  "Loading": "लोडिंग",
  "Unloading": "अनलोडिंग",
  "Sorting": "छंटाई",
  "All": "सभी",
  "All Due Statuses": "सभी बकाया स्थितियां",
  "All Statuses": "सभी स्थितियां",
  "All Items": "सभी आइटम",
  "All Types": "सभी प्रकार",
  "Apply": "लागू करें",
  "Hold": "रोकें",
  "Total": "कुल",
  "Urgent": "तुरंत",
  "URGENT": "तुरंत",
  "HIGH": "उच्च",
  "MEDIUM": "मध्यम",
  "Purchase Overview": "खरीद अवलोकन",
  "Date-wise Overview": "दिनांकवार अवलोकन",
  "Monthly Overview": "मासिक अवलोकन",
  "DATE": "दिनांक",
  "SALES": "बिक्री",
  "PURCHASE": "खरीद",
  "SOLD": "बिक्री मात्रा",
  "REVENUE": "राजस्व",
  "PROFIT": "लाभ",
  "MARGIN": "मार्जिन",
  "AVG/DAY": "औसत/दिन",
  "SABJI": "सब्जी",
  "No records yet — add your first one.": "अभी कोई रिकॉर्ड नहीं है — पहला रिकॉर्ड जोड़ें।",
  "No sales yet.": "अभी कोई बिक्री नहीं है।",
  "No sales recorded today.": "आज कोई बिक्री दर्ज नहीं है।",
  "No outstanding dues.": "कोई बकाया नहीं है।",
  "No stock alerts.": "कोई स्टॉक अलर्ट नहीं है।",
  "No recent sales": "हाल की कोई बिक्री नहीं",
  "No specifications yet": "अभी कोई स्पेसिफिकेशन नहीं",
  "Last backup:": "अंतिम बैकअप:",
  "Not backed up this session": "इस सेशन में बैकअप नहीं लिया गया",
  "Download Full Backup (JSON)": "पूरा बैकअप डाउनलोड करें (JSON)",
  "Export Individual Sheets (CSV)": "अलग-अलग शीट एक्सपोर्ट करें (CSV)",
  "Mandi Purchase": "मंडी खरीद",
  "Local Purchase": "स्थानीय खरीद",
  "Phone": "फोन",
  "Phone Number": "फोन नंबर",
  "Owner": "मालिक",
  "Connected": "कनेक्टेड",
  "Version 1.0.0": "संस्करण 1.0.0",
  "Fresh Produce": "ताजी सब्जियां",
  "Healthy Future": "स्वस्थ भविष्य",
  "Open navigation": "नेविगेशन खोलें",
  "Close navigation": "नेविगेशन बंद करें",
  "View all notifications": "सभी सूचनाएं देखें",
  "Mark all as read": "सभी को पढ़ा हुआ करें",
  "Mark read": "पढ़ा हुआ करें",
});

const UI_EN = Object.fromEntries(Object.entries(UI_HI).map(([en, hi]) => [hi, en]));

function translateUiString(value, language) {
  const text = String(value ?? "");
  if (!text) return text;
  const map = language === "hi" ? UI_HI : UI_EN;
  if (map[text]) return map[text];
  if (language === "hi") {
    if (/^Welcome back, (.+)!$/.test(text)) return text.replace(/^Welcome back, (.+)!$/, "वापसी पर स्वागत है, $1!");
    if (/^वापसी पर स्वागत है, (.+)!$/.test(text)) return text.replace(/^वापसी पर स्वागत है, (.+)!$/, "Welcome back, $1!");
    if (/^Qty: (.+)$/.test(text)) return text.replace(/^Qty: /, "मात्रा: ");
    if (/^मात्रा: (.+)$/.test(text)) return text.replace(/^मात्रा: /, "Qty: ");
    if (/^Margin: (.+)$/.test(text)) return text.replace(/^Margin: /, "मार्जिन: ");
    if (/^Customers: (.+)$/.test(text)) return text.replace(/^Customers: /, "ग्राहक: ");
    if (/^After expenses & labour$/.test(text)) return "खर्चे और मजदूरी के बाद";
    if (/^Due (.+)$/.test(text)) return text.replace(/^Due /, "बकाया ");
    if (/^Customer · Due (.+)$/.test(text)) return text.replace(/^Customer · Due /, "ग्राहक · बकाया ");
    if (/^Stock · (.+)$/.test(text)) return text.replace(/^Stock · /, "स्टॉक · ");
    if (/^Mandi Purchase · (.+)$/.test(text)) return text.replace(/^Mandi Purchase · /, "मंडी खरीद · ");
    if (/^Local Purchase · (.+)$/.test(text)) return text.replace(/^Local Purchase · /, "स्थानीय खरीद · ");
    if (/^Sale · (.+)$/.test(text)) return text.replace(/^Sale · /, "बिक्री · ");
    if (/^Expense · (.+)$/.test(text)) return text.replace(/^Expense · /, "खर्च · ");
    if (/^Labour · (.+)$/.test(text)) return text.replace(/^Labour · /, "मजदूरी · ");
    if (/^WhatsApp Bill · (.+)$/.test(text)) return text.replace(/^WhatsApp Bill · /, "व्हाट्सऐप बिल · ");
    if (/^No matches for "(.+)"\.$/.test(text)) return text.replace(/^No matches for "(.+)"\.$/, "\"$1\" के लिए कोई परिणाम नहीं मिला।");
    if (/^1 (.+) = (.+) Kg$/.test(text)) return text;
  } else {
    if (/^वापसी पर स्वागत है, (.+)!$/.test(text)) return text.replace(/^वापसी पर स्वागत है, (.+)!$/, "Welcome back, $1!");
    if (/^मात्रा: (.+)$/.test(text)) return text.replace(/^मात्रा: /, "Qty: ");
    if (/^मार्जिन: (.+)$/.test(text)) return text.replace(/^मार्जिन: /, "Margin: ");
    if (/^ग्राहक: (.+)$/.test(text)) return text.replace(/^ग्राहक: /, "Customers: ");
    if (/^बकाया (.+)$/.test(text)) return text.replace(/^बकाया /, "Due ");
    if (/^ग्राहक · बकाया (.+)$/.test(text)) return text.replace(/^ग्राहक · बकाया /, "Customer · Due ");
    if (/^स्टॉक · (.+)$/.test(text)) return text.replace(/^स्टॉक · /, "Stock · ");
    if (/^मंडी खरीद · (.+)$/.test(text)) return text.replace(/^मंडी खरीद · /, "Mandi Purchase · ");
    if (/^स्थानीय खरीद · (.+)$/.test(text)) return text.replace(/^स्थानीय खरीद · /, "Local Purchase · ");
    if (/^बिक्री · (.+)$/.test(text)) return text.replace(/^बिक्री · /, "Sale · ");
    if (/^खर्च · (.+)$/.test(text)) return text.replace(/^खर्च · /, "Expense · ");
    if (/^मजदूरी · (.+)$/.test(text)) return text.replace(/^मजदूरी · /, "Labour · ");
    if (/^व्हाट्सऐप बिल · (.+)$/.test(text)) return text.replace(/^व्हाट्सऐप बिल · /, "WhatsApp Bill · ");
    if (/^\"(.+)\" के लिए कोई परिणाम नहीं मिला।$/.test(text)) return text.replace(/^\"(.+)\" के लिए कोई परिणाम नहीं मिला।$/, "No matches for \"$1\".");
  }
  return text;
}

let uiLanguageApplying = false;
function applyUiLanguage(language) {
  if (uiLanguageApplying) return;
  uiLanguageApplying = true;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return;
    const current = node.nodeValue;
    if (!current || !current.trim()) return;
    const leading = current.match(/^\s*/)?.[0] || "";
    const trailing = current.match(/\s*$/)?.[0] || "";
    const core = current.trim();
    const translated = translateUiString(core, language);
    if (translated !== core) node.nodeValue = leading + translated + trailing;
  });

  document.querySelectorAll("input[placeholder], textarea[placeholder], [title], [aria-label]").forEach((el) => {
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      const value = el.getAttribute(attr);
      const translated = translateUiString(value, language);
      if (translated !== value) el.setAttribute(attr, translated);
    });
  });
  uiLanguageApplying = false;
}

function LanguageSwitcher({ language, setLanguage }) {
  return (
    <button
      type="button"
      onClick={() => setLanguage(language === "en" ? "hi" : "en")}
      title={language === "en" ? "Switch to Hindi" : "Switch to English"}
      aria-label={language === "en" ? "Switch to Hindi" : "Switch to English"}
      className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
    >
      <span>{language === "en" ? "हिंदी" : "English"}</span>
    </button>
  );
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "mandi", label: "Mandi Purchase", icon: ShoppingBasket },
  { id: "local", label: "Local Purchase", icon: Store },
  { id: "stock", label: "Stock / Inventory", icon: Boxes },
  { id: "sales", label: "Sales / Supply", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "payments", label: "Payments & Due", icon: Wallet },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "labour", label: "Labour / Majdoor", icon: HardHat },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { id: "whatsapp", label: "WhatsApp Bills", icon: MessageCircle },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "backup", label: "Backup / Export", icon: DatabaseBackup },
];

const PAGE_TITLES = {
  dashboard: ["Dashboard Overview", "Welcome back"],
  mandi: ["Mandi Purchase", "Track produce bought at the mandi"],
  local: ["Local Purchase", "Track produce bought from local farmers/vendors"],
  stock: ["Stock / Inventory", "Live quantity and value on hand"],
  sales: ["Sales / Supply", "Record supply and retail sales"],
  customers: ["Customers", "Everyone you trade with"],
  payments: ["Payments & Due", "Who owes what, and since when"],
  expenses: ["Expenses", "Daily running costs"],
  labour: ["Labour / Majdoor", "Loading, unloading and sorting wages"],
  reports: ["Reports & Analytics", "How the business is trending"],
  whatsapp: ["WhatsApp Bills", "Send bills straight to customers"],
  notifications: ["Notifications", "Everything that needs your attention"],
  settings: ["Settings", "Business and account preferences"],
  backup: ["Backup / Export", "Keep a copy of your data"],
};

const readWaSendAll = (b) => b?.whatsappSendAllEnabled === true || b?.whatsapp_send_all_enabled === true;

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtKg = (n) => Number(n || 0).toLocaleString("en-IN") + " Kg";
const localDateStr = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const todayStr = () => localDateStr();
const waPhone = (phone) => {
  const raw = String(phone || "").trim();
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return `91${d}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return "";
};
const whatsappUrl = (phone, message) => {
  const p = waPhone(phone);
  if (!p) return "";
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
};

// Open WhatsApp through a real anchor click. This is treated by browsers as
// the user's click instead of a scripted popup, so Chrome does not show the
// misleading "allow pop-ups" alert when the user returns to SabziSetu.
const openWhatsApp = (phone, message) => {
  const url = whatsappUrl(phone, message);
  if (!url) { appAlert("Customer mobile number is missing or invalid."); return false; }
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
};

const STATUS_COLOR = {
  Overdue: "text-red-600 bg-red-50",
  "Due Today": "text-amber-600 bg-amber-50",
  Upcoming: "text-green-600 bg-green-50",
  Paid: "text-green-600 bg-green-50",
  Due: "text-red-600 bg-red-50",
  Sent: "text-green-600 bg-green-50",
  Opened: "text-green-600 bg-green-50",
  "Not sent": "text-gray-500 bg-gray-100",
};

/* ---------------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------------- */

function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-gray-800 text-[15px]">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Badge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }) {
  const styles = {
    primary: "bg-green-700 text-white hover:bg-green-800",
    ghost: "bg-green-50 text-green-700 hover:bg-green-100",
    danger: "text-red-500 hover:bg-red-50",
    outline: "border border-gray-200 text-gray-600 hover:bg-gray-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

async function compressPaymentProof(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please select an image file.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process the image."));
    image.src = dataUrl;
  });
  const max = 1400;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported by this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        if (mounted) setError(err?.message || "Could not access the camera. Please allow camera permission and try again.");
      } finally {
        if (mounted) setStarting(false);
      }
    };
    startCamera();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, []);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }
    const max = 1400;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.78));
    onClose();
  };

  return <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-800">Take Payment Photo</h3>
          <p className="text-xs text-gray-500">Use the camera to capture payment proof.</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close camera"><X size={18}/></button>
      </div>
      <div className="p-4">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          {starting && <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/40">Starting camera…</div>}
          {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white text-sm bg-black/70 text-center px-6"><Camera size={28}/><span>{error}</span></div>}
        </div>
        {error && <p className="text-xs text-red-600 mt-2">If the browser asks for camera permission, choose <b>Allow</b>.</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={takePhoto} disabled={starting || !!error}><Camera size={15}/> Capture Photo</Btn>
        </div>
      </div>
    </div>
  </div>;
}

function PaymentProofField({ value, onChange }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onChange(await compressPaymentProof(file));
    } catch (err) {
      appAlert(err.message);
    }
  };

  return <>
    <div className="mb-3">
      <span className="block text-xs font-medium text-gray-500 mb-1">Payment Proof (UPI)</span>
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" onClick={() => setCameraOpen(true)}><Camera size={14}/> Take Photo</Btn>
        <Btn variant="outline" onClick={() => fileRef.current?.click()}><Upload size={14}/> Upload Screenshot</Btn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload}/>
        {value && <button type="button" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50" onClick={()=>onChange(null)}><XCircle size={14}/> Remove</button>}
      </div>
      {value && <div className="mt-2 border border-gray-100 rounded-xl p-2 bg-gray-50"><img src={value} alt="Payment proof" className="max-h-40 max-w-full rounded-lg object-contain"/><p className="text-[11px] text-green-600 mt-1">✓ Payment proof attached.</p></div>}
    </div>
    {cameraOpen && <CameraCapture onCapture={onChange} onClose={() => setCameraOpen(false)} />}
  </>;
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400";

function rowDate(row) {
  const v = row?.date || row?.dueDate || row?.created_at || row?.time;
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return localDateStr(d);
}

function textMatch(row, keys, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return true;
  return keys.some((key) => String(row?.[key] ?? "").toLowerCase().includes(q));
}

function dateMatch(row, from, to) {
  const d = rowDate(row);
  return (!from || (d && d >= from)) && (!to || (d && d <= to));
}

function FilterBar({ search, setSearch, placeholder = "Search…", children, onClear }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={inputCls + " pl-9 bg-white"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} />
        </div>
        {children}
        {onClear && <Btn variant="outline" onClick={onClear}>Clear</Btn>}
      </div>
    </div>
  );
}

function DateFilters({ from, setFrom, to, setTo }) {
  return <>
    <input type="date" title="From date" className={inputCls + " !w-auto bg-white"} value={from} onChange={(e) => setFrom(e.target.value)} />
    <input type="date" title="To date" className={inputCls + " !w-auto bg-white"} value={to} onChange={(e) => setTo(e.target.value)} />
  </>;
}

function ItemAutocomplete({ items = [], value, onChange, specification = "", onSpecificationChange }) {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const q = String(value || "").trim().toLowerCase();

  const activeItems = useMemo(() => items.filter(i => i.active !== false), [items]);
  const matches = useMemo(() => {
    if (!q) return activeItems.slice(0, 8);
    return activeItems.filter(i =>
      String(i.nameEn || "").toLowerCase().includes(q) ||
      String(i.nameHi || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [activeItems, q]);

  const selected = activeItems.find(i =>
    String(i.nameEn || "").trim().toLowerCase() === q
  );
  const specs = selected?.specifications || [];

  const selectItem = (item) => {
    // Commit the value first, then close the menu. This is intentionally
    // kept in one function so mouse, touch and keyboard selection behave
    // identically.
    onChange(String(item.nameEn || ""));
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type vegetable name…"
        autoComplete="off"
      />

      {open && matches.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white border border-gray-200 rounded-lg shadow-2xl max-h-52 overflow-y-auto"
          onMouseDown={e => e.stopPropagation()}
        >
          {matches.map(item => (
            <button
              type="button"
              key={item.id ?? `${item.nameEn}-${item.nameHi}`}
              className="block w-full text-left px-3 py-2.5 hover:bg-green-50 active:bg-green-100 text-sm cursor-pointer select-none"
              onPointerDown={e => {
                // Select on pointer-down so the input does not blur/close the
                // dropdown before the chosen item is committed. This also
                // works reliably with mouse + touch inside the scrollable modal.
                e.preventDefault();
                e.stopPropagation();
                selectItem(item);
              }}
              onClick={e => {
                // Keyboard/synthetic click fallback. Ignore it if pointer-down
                // already selected the same item.
                e.preventDefault();
                e.stopPropagation();
              }}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  selectItem(item);
                }
              }}
            >
              <span className="font-medium">{language === "hi" && item.nameHi ? item.nameHi : item.nameEn}</span>
              {item.nameHi && language === "en" && <span className="text-gray-400 ml-2">{item.nameHi}</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Item Specification (optional)
          </label>
          {specs.length ? (
            <select
              className={inputCls}
              value={specification}
              onChange={e => onSpecificationChange?.(e.target.value)}
            >
              <option value="">No specification</option>
              {specs.map(x => <option key={x.id ?? x.name} value={x.name}>{x.name}</option>)}
            </select>
          ) : (
            <input
              className={inputCls}
              value={specification}
              onChange={e => onSpecificationChange?.(e.target.value)}
              placeholder="e.g. Langda Mango"
            />
          )}
        </div>
      )}
    </div>
  );
}

function QuantityFields({ units = [], value, unit, onValue, onUnit }) {
  return <div className="grid grid-cols-2 gap-3">
    <Field label="Quantity"><input type="number" min="0" step="0.001" className={inputCls} value={value} onChange={e=>onValue(e.target.value)} /></Field>
    <Field label="Unit"><select className={inputCls} value={unit} onChange={e=>onUnit(e.target.value)}>{units.map(u=><option key={u.id} value={u.symbol}>{u.symbol}</option>)}</select></Field>
  </div>;
}


function blankPurchaseLine(units) {
  return { item: "", specification: "", quantityValue: "", quantityUnit: units?.[0]?.symbol || "Kg", rate: "" };
}

function blankSaleLine(units) {
  return { item: "", specification: "", quantityValue: "", quantityUnit: units?.[0]?.symbol || "Kg", rate: "" };
}

function MultiPurchaseLines({ lines, setLines, masters }) {
  const units = masters?.units || [];
  const update = (index, patch) => setLines(lines.map((line, i) => i === index ? { ...line, ...patch } : line));
  const addLine = () => setLines([...lines, blankPurchaseLine(units)]);
  const removeLine = (index) => setLines(lines.filter((_, i) => i !== index));
  const total = lines.reduce((sum, line) => {
    const qty = Number(line.quantityValue || 0), rate = Number(line.rate || 0);
    const unit = units.find(u => String(u.symbol) === String(line.quantityUnit));
    return sum + qty * Number(unit?.kg_multiplier || 1) * rate;
  }, 0);
  return <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div><p className="text-sm font-semibold text-gray-800">Purchase Items</p><p className="text-xs text-gray-500">Add multiple vegetables in the same purchase.</p></div>
      <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100"><Plus size={14}/> Add Item</button>
    </div>
    {lines.map((line, index) => {
      const unit = units.find(u => String(u.symbol) === String(line.quantityUnit));
      const amount = Number(line.quantityValue || 0) * Number(unit?.kg_multiplier || 1) * Number(line.rate || 0);
      return <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-gray-500">ITEM {index + 1}</span>{lines.length > 1 && <button type="button" onClick={() => removeLine(index)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Remove item"><Trash2 size={14}/></button>}</div>
        <Field label="Item"><ItemAutocomplete items={masters?.items || []} value={line.item} onChange={v => update(index,{item:v, specification:""})} specification={line.specification} onSpecificationChange={v => update(index,{specification:v})}/></Field>
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <Field label="Quantity"><input type="number" min="0" step="0.001" className={inputCls} value={line.quantityValue} onChange={e=>update(index,{quantityValue:e.target.value})}/></Field>
          <Field label="Unit"><select className={inputCls} value={line.quantityUnit} onChange={e=>update(index,{quantityUnit:e.target.value})}>{units.map(u=><option key={u.id} value={u.symbol}>{u.symbol}</option>)}</select></Field>
        </div>
        <div className="flex items-end gap-2"><Field label="Rate (₹/Kg)"><input type="number" min="0" className={inputCls} value={line.rate} onChange={e=>update(index,{rate:e.target.value})}/></Field><div className="mb-3 min-w-[110px] text-right"><p className="text-[11px] text-gray-400">Amount</p><p className="font-semibold text-gray-800">{fmt(amount)}</p></div></div>
      </div>;
    })}
    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 flex items-center justify-between"><span className="text-sm font-medium text-green-800">Purchase Total</span><span className="text-lg font-bold text-green-800">{fmt(total)}</span></div>
  </div>;
}

function MultiSaleLines({ lines, setLines, masters }) {
  const units = masters?.units || [];
  const update = (index, patch) => setLines(lines.map((line, i) => i === index ? { ...line, ...patch } : line));
  const addLine = () => setLines([...lines, blankSaleLine(units)]);
  const removeLine = (index) => setLines(lines.filter((_, i) => i !== index));
  const total = lines.reduce((sum, line) => {
    const qty = Number(line.quantityValue || 0), rate = Number(line.rate || 0);
    const unit = units.find(u => String(u.symbol) === String(line.quantityUnit));
    return sum + qty * Number(unit?.kg_multiplier || 1) * rate;
  }, 0);
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-gray-800">Sale Items</p><p className="text-xs text-gray-500">Add multiple vegetables to the same customer sale.</p></div><button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100"><Plus size={14}/> Add Item</button></div>
    {lines.map((line, index) => {
      const unit = units.find(u => String(u.symbol) === String(line.quantityUnit));
      const amount = Number(line.quantityValue || 0) * Number(unit?.kg_multiplier || 1) * Number(line.rate || 0);
      return <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-gray-500">ITEM {index + 1}</span>{lines.length > 1 && <button type="button" onClick={() => removeLine(index)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Remove item"><Trash2 size={14}/></button>}</div>
        <Field label="Item"><ItemAutocomplete items={masters?.items || []} value={line.item} onChange={v => update(index,{item:v, specification:""})} specification={line.specification} onSpecificationChange={v => update(index,{specification:v})}/></Field>
        <div className="grid grid-cols-[1fr_110px] gap-2"><Field label="Quantity"><input type="number" min="0" step="0.001" className={inputCls} value={line.quantityValue} onChange={e=>update(index,{quantityValue:e.target.value})}/></Field><Field label="Unit"><select className={inputCls} value={line.quantityUnit} onChange={e=>update(index,{quantityUnit:e.target.value})}>{units.map(u=><option key={u.id} value={u.symbol}>{u.symbol}</option>)}</select></Field></div>
        <div className="flex items-end gap-2"><Field label="Rate (₹/Kg)"><input type="number" min="0" className={inputCls} value={line.rate} onChange={e=>update(index,{rate:e.target.value})}/></Field><div className="mb-3 min-w-[110px] text-right"><p className="text-[11px] text-gray-400">Amount</p><p className="font-semibold text-gray-800">{fmt(amount)}</p></div></div>
      </div>;
    })}
    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 flex items-center justify-between"><span className="text-sm font-medium text-green-800">Sale Total</span><span className="text-lg font-bold text-green-800">{fmt(total)}</span></div>
  </div>;
}


// -----------------------------------------------------------------------------
// App-wide dialogs
// Replaces browser alert/confirm/prompt dialogs with one consistent UI.
// ---------------------------------------------------------------------------- -
const dialogSubscribers = new Set();
const emitDialog = (dialog) => dialogSubscribers.forEach(fn => fn(dialog));

const appAlert = (message, options = {}) => new Promise(resolve => {
  emitDialog({ type: "alert", message: String(message ?? ""), ...options, resolve });
});

const appConfirm = (message, options = {}) => new Promise(resolve => {
  emitDialog({ type: "confirm", message: String(message ?? ""), ...options, resolve });
});

const appPrompt = (message, options = {}) => new Promise(resolve => {
  emitDialog({ type: "prompt", message: String(message ?? ""), ...options, resolve });
});

function dialogTone(message, type) {
  if (type === "confirm" || type === "prompt") return "warning";
  const text = String(message || "").toLowerCase();
  if (/successfully|saved\.?$|completed|success/.test(text)) return "success";
  if (/couldn't|unable|failed|error|invalid|required|cannot|can't|not found|no .* found/.test(text)) return "error";
  return "info";
}

function AppDialogHost() {
  const [queue, setQueue] = useState([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    const listener = dialog => setQueue(prev => [...prev, dialog]);
    dialogSubscribers.add(listener);
    return () => dialogSubscribers.delete(listener);
  }, []);

  const active = queue[0];
  useEffect(() => {
    if (active?.type === "prompt") setValue(active.defaultValue || "");
  }, [active]);

  if (!active) return null;

  const tone = dialogTone(active.message, active.type);
  const toneMap = {
    error: { icon: XCircle, iconBox: "bg-red-50 text-red-600", title: "Action couldn't be completed", button: "bg-red-600 hover:bg-red-700" },
    warning: { icon: AlertTriangle, iconBox: "bg-amber-50 text-amber-600", title: "Please confirm", button: "bg-emerald-700 hover:bg-emerald-800" },
    success: { icon: CheckCircle2, iconBox: "bg-emerald-50 text-emerald-600", title: "Success", button: "bg-emerald-700 hover:bg-emerald-800" },
    info: { icon: Info, iconBox: "bg-blue-50 text-blue-600", title: "Information", button: "bg-emerald-700 hover:bg-emerald-800" },
  };
  const toneUi = toneMap[tone];
  const Icon = toneUi.icon;
  const close = result => {
    setQueue(prev => prev.slice(1));
    active.resolve?.(result);
  };
  const parts = String(active.message || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  const mainMessage = parts[0] || "Please review this message.";
  const details = parts.slice(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneUi.iconBox}`}>
            <Icon size={20}/>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900">{active.title || toneUi.title}</h3>
            <button type="button" onClick={() => close(false)} className="absolute" style={{ visibility: "hidden" }} aria-hidden="true" tabIndex={-1}>x</button>
          </div>
          <button type="button" onClick={() => close(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X size={18}/>
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">{mainMessage}</p>
          {details.length > 0 && (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3 text-xs leading-5 text-gray-500 whitespace-pre-wrap break-words">
              {details.join("\n")}
            </div>
          )}
          {active.type === "prompt" && (
            <input
              autoFocus
              className={`${inputCls} mt-4`}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") close(value); }}
              placeholder={active.placeholder || "Enter value…"}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-3">
          {(active.type === "confirm" || active.type === "prompt") && (
            <button type="button" onClick={() => close(active.type === "prompt" ? null : false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {active.cancelText || "Cancel"}
            </button>
          )}
          <button type="button" onClick={() => close(active.type === "prompt" ? value : true)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm ${toneUi.button}`}>
            {active.confirmText || (active.type === "confirm" ? "Confirm" : active.type === "prompt" ? "Add" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[calc(100vh-2rem)] shadow-xl flex flex-col overflow-hidden my-auto">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

function EmptyRow({ span, text }) {
  return (
    <tr>
      <td colSpan={span} className="text-center text-gray-400 text-sm py-8">{text}</td>
    </tr>
  );
}

function DataTable({ columns, rows, onDelete, onEdit, rowKey = "id" }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
            {columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}
            {(onEdit || onDelete) && <th className="px-3 py-2"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow span={columns.length + 1} text="No records yet — add your first one." />}
          {rows.map((r) => (
            <tr key={r[rowKey]} className="border-t border-gray-50 hover:bg-gray-50/60">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-3 text-gray-700 whitespace-nowrap">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(r)} className="text-gray-300 hover:text-green-700" title="Edit">
                        <Pencil size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(r[rowKey])} className="text-gray-300 hover:text-red-500" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub, trend }) {
  const bg = {
    green: "bg-green-100 text-green-600", blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600", orange: "bg-orange-100 text-orange-600",
    teal: "bg-teal-100 text-teal-600",
  }[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex-1 min-w-[190px]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}><Icon size={18} /></div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-semibold text-gray-800">{value}</p>
        </div>
      </div>
      {sub && (
        <p className={`text-xs flex items-center gap-1 ${trend === "down" ? "text-red-500" : "text-green-600"}`}>
          {trend === "down" ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />} {sub}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   SIDEBAR + TOPBAR
--------------------------------------------------------------- */

function Sidebar({ page, setPage, business, mobileOpen, setMobileOpen, user, onLogout }) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[min(82vw,18rem)] bg-emerald-950 text-emerald-50 flex flex-col h-screen transform transition-transform duration-200 md:w-64 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="px-5 py-5 flex items-center gap-2 border-b border-emerald-900">
        <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center"><ShoppingBasket size={18} /></div>
        <div>
          <p className="font-bold leading-tight">{business.name}</p>
          <p className="text-[11px] text-emerald-300">{business.tagline}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => { setPage(n.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm transition ${active ? "bg-emerald-700 text-white font-medium" : "text-emerald-200 hover:bg-emerald-900"}`}
            >
              <Icon size={17} />
              {n.label}
            </button>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-emerald-900 p-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">{String(user?.displayName || user?.username || "A").slice(0,1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white truncate">{user?.displayName || "Administrator"}</p><p className="text-[11px] text-emerald-300 truncate">{user?.username || "admin"}</p></div>
          <button type="button" title="Sign out" onClick={onLogout} className="p-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800"><LogOut size={15}/></button>
        </div>
      </div>
      <div className="px-4 py-3 text-[11px] text-emerald-400 border-t border-emerald-900 flex items-center justify-between">
        <span>Version 1.0.0</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Connected</span>
      </div>
    </aside>
    </>
  );
}

function translateNotification(notification, language, masters) {
  const text = String(notification?.text || "");
  if (language !== "hi") return text;
  let m = text.match(/^(.+) has an overdue payment of ₹([\d,]+)\.$/);
  if (m) return `${m[1]} का ₹${m[2]} भुगतान बकाया है।`;
  m = text.match(/^(.+) has a payment of ₹([\d,]+) due today\.$/);
  if (m) return `${m[1]} का ₹${m[2]} भुगतान आज देय है।`;
  m = text.match(/^Stock of (.+) is low \(([\d,.]+) Kg left\)\.$/);
  if (m) return `${itemLabel(m[1], masters, language)} का स्टॉक कम है (${m[2]} Kg शेष)।`;
  return translateUiString(text, language);
}

/* Builds a flat, searchable index out of every data collection so the
   search bar can find a customer, an item, a vendor, a category… anywhere. */
function buildSearchIndex(data, language) {
  const rows = [];
  data.customers.forEach((c) => rows.push({ id: "cust-" + c.id, label: c.name, sub: `Customer · Due ${fmt(c.due)}`, page: "customers" }));
  data.stock.forEach((s) => rows.push({ id: "stock-" + s.id, label: itemLabel(s.item, data.masters, language), sub: `Stock · ${fmtKg(s.qty)} on hand`, page: "stock" }));
  data.mandiPurchases.forEach((p) => rows.push({ id: "mandi-" + p.id, label: `${itemLabel(p.item, data.masters, language)} — ${p.vendor}`, sub: `Mandi Purchase · ${p.date}`, page: "mandi" }));
  data.localPurchases.forEach((p) => rows.push({ id: "local-" + p.id, label: `${itemLabel(p.item, data.masters, language)} — ${p.vendor}`, sub: `Local Purchase · ${p.date}`, page: "local" }));
  data.sales.forEach((s) => rows.push({ id: "sale-" + s.id, label: `${itemLabel(s.item, data.masters, language)} — ${s.customer}`, sub: `Sale · ${fmt(s.amount)}`, page: "sales" }));
  data.expenses.forEach((e) => rows.push({ id: "exp-" + e.id, label: e.category, sub: `Expense · ${fmt(e.amount)}`, page: "expenses" }));
  data.labour.forEach((l) => rows.push({ id: "lab-" + l.id, label: l.name, sub: `Labour · ${l.workType}`, page: "labour" }));
  data.whatsappBills.forEach((b) => rows.push({ id: "wa-" + b.id, label: b.customer, sub: `WhatsApp Bill · ${b.status}`, page: "whatsapp" }));
  return rows;
}

function Topbar({ page, setPage, business, notifications, setNotifications, data, onMenu, language, setLanguage }) {
  const [title, subtitle] = PAGE_TITLES[page];
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const index = useMemo(() => buildSearchIndex(data, language), [data, language]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, index]);

  const goTo = (targetPage) => {
    setPage(targetPage);
    setSearchOpen(false);
    setNotifOpen(false);
    setQuery("");
  };
  const markRead = async (id) => {
    const previous = notifications;
    setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
    try { await api.update("notifications", id, { read: true }); }
    catch (err) { setNotifications(previous); appAlert(err.message); }
  };
  const markAll = async () => {
    const previous = notifications;
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    try { await api.markAllNotificationsRead(); }
    catch (err) { setNotifications(previous); appAlert(err.message); }
  };

  return (
    <div className="flex items-start sm:items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3 relative">
      <div className="flex items-start gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="mt-0.5 md:hidden w-10 h-10 shrink-0 rounded-xl bg-emerald-950 text-white flex items-center justify-center shadow-sm"
        >
          <Menu size={19} />
        </button>
        <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{title}</h1>
        <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">{subtitle === "Welcome back" ? `Welcome back, ${business.owner}!` : subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <LanguageSwitcher language={language} setLanguage={setLanguage} />
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus-within:ring-2 focus-within:ring-green-200 focus-within:border-green-400">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search customers, items, bills…"
              className="w-full outline-none text-gray-700 placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => { setQuery(""); setSearchOpen(false); }} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>

          {searchOpen && query && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                {results.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 py-4">No matches for "{query}".</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button onClick={() => goTo(r.page)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col">
                          <span className="text-sm text-gray-800">{r.label}</span>
                          <span className="text-xs text-gray-400">{r.sub}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setNotifOpen((v) => !v)} className="relative w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <Bell size={16} />
            {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <p className="font-medium text-gray-800 text-sm">{language === "hi" ? "सूचनाएं" : "Notifications"}</p>
                  {unread > 0 && <button onClick={markAll} className="text-xs text-green-700 hover:underline">{language === "hi" ? "सभी को पढ़ा हुआ करें" : "Mark all as read"}</button>}
                </div>
                <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">{language === "hi" ? "सभी सूचनाएं देख ली गई हैं।" : "You're all caught up."}</li>}
                  {notifications.slice(0, 6).map((n) => (
                    <li key={n.id} className={`px-4 py-3 flex items-start gap-2 ${!n.read ? "bg-green-50/40" : ""}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? "bg-green-600" : "bg-transparent"}`} />
                      <button onClick={() => markRead(n.id)} className="flex-1 text-left">
                        <p className="text-sm text-gray-700 leading-snug">{translateNotification(n, language, data.masters)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{translateUiString(n.time, language)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => goTo("notifications")} className="w-full text-center text-sm text-green-700 py-2.5 border-t border-gray-50 hover:bg-gray-50">
                  {language === "hi" ? "सभी सूचनाएं देखें" : "View all notifications"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="profile-avatar w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-semibold">
            {business.owner.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{business.owner}</p>
            <p className="text-xs text-gray-400 leading-tight">Owner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   DASHBOARD PAGE
--------------------------------------------------------------- */

function DashboardPage({ data }) {
  const language = useLanguage();
  const today = todayStr();
  const todayMandi = data.mandiPurchases.filter((p) => String(p.date).slice(0, 10) === today);
  const todayLocal = data.localPurchases.filter((p) => String(p.date).slice(0, 10) === today);
  const todaySales = data.sales.filter((p) => String(p.date).slice(0, 10) === today);
  const todayExpenses = data.expenses.filter((e) => String(e.date).slice(0, 10) === today);
  const todayLabour = data.labour.filter((l) => String(l.date).slice(0, 10) === today);

  const totalPurchase = Number(data.summary?.purchases_today ?? (todayMandi.reduce((s, p) => s + p.amount, 0) + todayLocal.reduce((s, p) => s + p.amount, 0)));
  const totalSales = Number(data.summary?.sales_today ?? todaySales.reduce((s, p) => s + p.amount, 0));
  const cogs = Number(data.summary?.cogs_today ?? todaySales.reduce((s, p) => s + (p.cogs || 0), 0));
  const totalExpenses = Number(data.summary?.expenses_today ?? todayExpenses.reduce((s, e) => s + e.amount, 0));
  const totalLabour = Number(data.summary?.labour_today ?? todayLabour.reduce((s, l) => s + l.amount, 0));
  const totalDue = Number(data.summary?.total_due ?? data.customers.reduce((s, c) => s + c.due, 0));
  const grossProfit = totalSales - cogs;
  const netProfit = grossProfit - totalExpenses - totalLabour;

  const dueBreak = [
    { name: "Overdue", value: data.customers.filter((c) => c.status === "Overdue").reduce((s, c) => s + c.due, 0), color: "#ef4444" },
    { name: "Due Today", value: data.customers.filter((c) => c.status === "Due Today").reduce((s, c) => s + c.due, 0), color: "#f59e0b" },
    { name: "Upcoming", value: data.customers.filter((c) => c.status === "Upcoming" && c.due > 0).reduce((s, c) => s + c.due, 0), color: "#16a34a" },
  ];
  const topCategories = todaySales.reduce((map, sale) => {
    const key = `${sale.item}|||${sale.specification || ""}`;
    map[key] = (map[key] || 0) + Number(sale.qty || 0);
    return map;
  }, {});
  const topSelling = Object.entries(topCategories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const paymentOverview = [
    { name: "Collected Today", value: Number(data.summary?.collected_today || 0), color: "#16a34a" },
    { name: "Sales Still Due", value: totalDue, color: "#ef4444" },
  ];
  const month = data.summary || {};
  const recentSales = data.sales.slice(0, 5);
  const recentPurchases = [...data.mandiPurchases, ...data.localPurchases].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
  const stockAlerts = data.stock.filter(s => Number(s.qty) <= 0 || /low|urgent|out/i.test(String(s.status || ""))).slice(0,5);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <StatCard icon={ShoppingBasket} color="green" label="Today's Purchase" value={fmt(totalPurchase)} sub={`Qty: ${fmtKg(todayMandi.reduce((s,p)=>s+p.qty,0)+todayLocal.reduce((s,p)=>s+p.qty,0))}`} />
        <StatCard icon={Truck} color="blue" label="Today's Sales" value={fmt(totalSales)} sub={`Qty: ${fmtKg(todaySales.reduce((s,p)=>s+p.qty,0))}`} />
        <StatCard icon={CircleDollarSign} color="purple" label="Today's Gross Profit" value={fmt(grossProfit)} sub={`Margin: ${totalSales ? ((grossProfit/totalSales)*100).toFixed(1) : 0}%`} />
        <StatCard icon={Wallet} color="orange" label="Outstanding Due" value={fmt(totalDue)} sub={`Customers: ${data.customers.filter(c=>c.due>0).length}`} trend="down" />
        <StatCard icon={BarChart3} color="teal" label="Today's Net Profit" value={fmt(netProfit)} sub="After expenses & labour" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <Panel title="Purchase Summary (Today)">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between text-gray-500">Mandi Purchase <span className="text-gray-800">{fmt(todayMandi.reduce((s,p)=>s+p.amount,0))}</span></li>
            <li className="flex justify-between text-gray-500">Local Purchase <span className="text-gray-800">{fmt(todayLocal.reduce((s,p)=>s+p.amount,0))}</span></li>
          </ul>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between text-sm"><span className="font-medium text-gray-700">Total Purchase</span><span className="font-semibold text-green-700">{fmt(totalPurchase)}</span></div>
        </Panel>
        <Panel title="Due Summary">
          <div className="h-32"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dueBreak} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>{dueBreak.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><RTooltip formatter={(v)=>fmt(v)}/></PieChart></ResponsiveContainer></div>
          <ul className="text-xs space-y-1 mt-2">{dueBreak.map(d=><li key={d.name} className="flex items-center justify-between text-gray-500"><span>{d.name}</span><span className="text-gray-700">{fmt(d.value)}</span></li>)}</ul>
        </Panel>
        <Panel title="Top Selling Sabji (Today)">
          {topSelling.length ? <ul className="space-y-2 text-sm">{topSelling.map(([key,qty])=>{const [item,specification]=key.split("|||"); return <li key={key} className="flex justify-between text-gray-500"><span>{itemLabel(item, data.masters, language)}{specification&&<span className="text-xs text-gray-400 block">{specification}</span>}</span><span className="text-gray-800">{fmtKg(qty)}</span></li>})}</ul> : <p className="text-sm text-gray-400 py-8 text-center">No sales recorded today.</p>}
        </Panel>
        <Panel title="Payment Overview">
          <div className="h-32"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentOverview} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>{paymentOverview.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><RTooltip formatter={(v)=>fmt(v)}/></PieChart></ResponsiveContainer></div>
          <ul className="text-xs space-y-1 mt-2">{paymentOverview.map(d=><li key={d.name} className="flex items-center justify-between text-gray-500"><span>{d.name}</span><span className="text-gray-700">{fmt(d.value)}</span></li>)}</ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Current Stock Snapshot" className="lg:col-span-2">
          <DataTable columns={[{key:"item",label:"Item",render:r=><span>{itemLabel(r.item, data.masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span>},{key:"qty",label:"Qty",render:r=>fmtKg(r.qty)},{key:"avgCost",label:"Avg. Cost",render:r=>fmt(r.avgCost)},{key:"sellingPrice",label:"Selling Price",render:r=>fmt(r.sellingPrice)},{key:"status",label:"Status",render:r=><Badge status={r.status||"Available"}/>}]} rows={data.stock.slice(0,8)} />
        </Panel>
        <Panel title="Recent Due List">
          {data.customers.filter(c=>c.due>0).slice(0,5).length ? <ul className="divide-y divide-gray-50 text-sm">{data.customers.filter(c=>c.due>0).slice(0,5).map(c=><li key={c.id} className="py-2.5 flex items-center justify-between"><div><p className="text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.phone||"No mobile"}</p></div><div className="text-right"><p className="font-medium text-gray-800">{fmt(c.due)}</p><Badge status={c.status}/></div></li>)}</ul> : <p className="text-sm text-gray-400 py-8 text-center">No outstanding dues.</p>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Last 7 Days">
          <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.salesTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/><XAxis dataKey="day" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} width={40}/><RTooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:12}}/><Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2} name="Sales"/><Line type="monotone" dataKey="purchase" stroke="#2563eb" strokeWidth={2} name="Purchase"/></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Recent Sales">
          {recentSales.length ? <ul className="space-y-2 text-sm">{recentSales.map(s=><li key={s.id} className="flex justify-between"><span className="text-gray-500">{itemLabel(s.item, data.masters, language)} · {s.customer}</span><span className="font-medium">{fmt(s.amount)}</span></li>)}</ul> : <p className="text-sm text-gray-400 py-8 text-center">No sales yet.</p>}
        </Panel>
        <Panel title="Stock Alerts">
          {stockAlerts.length ? <ul className="space-y-2 text-sm">{stockAlerts.map(s=><li key={s.id} className="flex justify-between"><span>{itemLabel(s.item, data.masters, language)}</span><span className="text-red-600">{fmtKg(s.qty)}</span></li>)}</ul> : <p className="text-sm text-gray-400 py-8 text-center">No stock alerts.</p>}
        </Panel>
      </div>

      <Panel title="This Month (Database Totals)">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div><p className="text-xs text-gray-400">Sales</p><p className="font-semibold">{fmt(month.sales_month)}</p></div>
          <div><p className="text-xs text-gray-400">Purchase</p><p className="font-semibold">{fmt(month.purchases_month)}</p></div>
          <div><p className="text-xs text-gray-400">COGS</p><p className="font-semibold">{fmt(month.cogs_month)}</p></div>
          <div><p className="text-xs text-gray-400">Gross Profit</p><p className="font-semibold text-green-700">{fmt(Number(month.sales_month || 0) - Number(month.cogs_month || 0))}</p></div>
          <div><p className="text-xs text-gray-400">Expenses + Labour</p><p className="font-semibold">{fmt(Number(month.expenses_month || 0) + Number(month.labour_month || 0))}</p></div>
          <div><p className="text-xs text-gray-400">Stock Value</p><p className="font-semibold">{fmt(month.stock_value)}</p></div>
        </div>
      </Panel>

      <Panel title="Today's Operating Costs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-gray-400">Purchase</p><p className="font-semibold">{fmt(totalPurchase)}</p></div>
          <div><p className="text-xs text-gray-400">Expenses</p><p className="font-semibold">{fmt(totalExpenses)}</p></div>
          <div><p className="text-xs text-gray-400">Labour</p><p className="font-semibold">{fmt(totalLabour)}</p></div>
          <div><p className="text-xs text-gray-400">Collected</p><p className="font-semibold text-green-700">{fmt(month.collected_today)}</p></div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------
   PURCHASE PAGES (Mandi / Local) — shared shape
--------------------------------------------------------------- */

function PurchasePage({ title, resource, rows, setRows, vendorLabel, refresh, masters }) {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteCheck, setDeleteCheck] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [specificationFilter, setSpecificationFilter] = useState("");
  const [form, setForm] = useState({ date: todayStr(), vendor: "" });
  const [lines, setLines] = useState([blankPurchaseLine(masters?.units || [])]);

  const items = [...new Set(rows.map(r => String(r.item || "").trim()).filter(Boolean))].sort();
  const specifications = [...new Set(rows.map(r => String(r.specification || "").trim()).filter(Boolean))].sort();
  const filteredRows = useMemo(() => rows.filter(r =>
    textMatch(r, ["vendor", "item", "specification"], search) &&
    (!itemFilter || String(r.item || "").trim().toLowerCase() === itemFilter.toLowerCase()) &&
    (!specificationFilter || String(r.specification || "").trim().toLowerCase() === specificationFilter.toLowerCase()) &&
    dateMatch(r, from, to)
  ), [rows, search, from, to, itemFilter, specificationFilter]);
  const total = filteredRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalQty = filteredRows.reduce((s, r) => s + Number(r.qty || 0), 0);

  const clearFilters = () => { setSearch(""); setFrom(""); setTo(""); setItemFilter(""); setSpecificationFilter(""); };
  const add = async () => {
    if (!form.vendor || !lines.length) return appAlert("Vendor and at least one item are required.");
    if (lines.some(line => !line.item || !line.quantityValue || !line.rate)) return appAlert("Every item needs an item name, quantity and rate.");
    const payload = lines.map(line => ({ ...line, quantityValue: Number(line.quantityValue), rate: Number(line.rate) }));
    setSaving(true);
    try {
      await api.create(resource, { date: form.date, vendor: form.vendor, items: payload });
      await refresh();
      setForm({ date: todayStr(), vendor: "" });
      setLines([blankPurchaseLine(masters?.units || [])]);
      setOpen(false);
    } catch (err) { appAlert("Couldn't save this purchase.\n" + err.message); }
    finally { setSaving(false); }
  };
  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.vendor || !edit.item || !edit.quantityValue || !edit.rate) {
      appAlert("Vendor, item, quantity and rate are required.");
      return;
    }
    const quantityValue = Number(edit.quantityValue);
    const rate = Number(edit.rate);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0 || !Number.isFinite(rate) || rate < 0) {
      appAlert("Enter valid quantity and rate.");
      return;
    }
    setSaving(true);
    try {
      await api.update(resource, edit.id, { date: edit.date, vendor: edit.vendor, item: edit.item, specification: edit.specification || "", quantityValue, quantityUnit: edit.quantityUnit || "Kg", rate });
      await refresh();
      setEdit(null);
    } catch (err) {
      appAlert("Couldn't update this purchase.\n" + err.message);
    } finally { setSaving(false); }
  };
  const del = async (id) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    setDeleteLoading(true);
    try {
      const impact = await api.checkPurchaseDelete(resource, id);
      setDeleteCheck({ row, impact });
    } catch (err) { appAlert("Couldn't check inventory impact.\n" + err.message); }
    finally { setDeleteLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteCheck?.row) return;
    setDeleteLoading(true);
    try {
      await api.remove(resource, deleteCheck.row.id);
      setDeleteCheck(null);
      await refresh();
    } catch (err) {
      try {
        const impact = await api.checkPurchaseDelete(resource, deleteCheck.row.id);
        setDeleteCheck({ row: deleteCheck.row, impact });
      } catch {
        appAlert("This purchase could not be deleted safely.\n" + err.message);
      }
    } finally { setDeleteLoading(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-4">
      <StatCard icon={ShoppingBasket} color="green" label={translateUiString(`Total ${title}`, language)} value={fmt(total)} sub={`${filteredRows.length} ${language === "hi" ? "में से" : "of"} ${rows.length} ${language === "hi" ? "प्रविष्टियां" : "entries"}`} />
      <StatCard icon={Boxes} color="blue" label="Total Quantity" value={fmtKg(totalQty)} />
      <StatCard icon={CircleDollarSign} color="orange" label="Avg. Rate" value={fmt(totalQty ? total / totalQty : 0) + "/Kg"} />
    </div>
    <Panel title={translateUiString(`${title} Entries`, language)} action={<Btn onClick={() => setOpen(true)}><Plus size={15} /> {language === "hi" ? "खरीद जोड़ें" : "Add Purchase"}</Btn>}>
      <FilterBar search={search} setSearch={setSearch} placeholder={language === "hi" ? (vendorLabel === "Mandi" ? "मंडी खोजें, आइटम…" : "विक्रेता/किसान खोजें, आइटम…") : `Search ${vendorLabel.toLowerCase()}, item, specification…`} onClear={clearFilters}>
        <select className={inputCls + " !w-auto bg-white"} value={itemFilter} onChange={e => setItemFilter(e.target.value)}>
          <option value="">{language === "hi" ? "सभी आइटम" : "All Items"}</option>{items.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className={inputCls + " !w-auto bg-white"} value={specificationFilter} onChange={e => setSpecificationFilter(e.target.value)}>
          <option value="">{language === "hi" ? "सभी स्पेसिफिकेशन" : "All Specifications"}</option>{specifications.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <DateFilters from={from} setFrom={setFrom} to={to} setTo={setTo} />
      </FilterBar>
      <DataTable onEdit={r => setEdit({ ...r })} onDelete={del} columns={[
        { key: "date", label: "Date" }, { key: "vendor", label: vendorLabel }, { key: "item", label: "Item", render:r=><span>{itemLabel(r.item, masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span> },
        { key: "qty", label: "Qty", render: r => `${r.quantityValue ?? r.qty} ${r.quantityUnit || "Kg"}` }, { key: "rate", label: "Rate/Kg", render: r => fmt(r.rate) },
        { key: "amount", label: "Amount", render: r => <span className="font-medium text-gray-800">{fmt(r.amount)}</span> },
      ]} rows={filteredRows} />
    </Panel>
    <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${title}`}>
      {edit && <>
        <Field label="Date"><input type="date" className={inputCls} value={edit.date?.slice(0,10) || ""} onChange={e => setEdit({ ...edit, date: e.target.value })} /></Field>
        <Field label={vendorLabel}><input className={inputCls} value={edit.vendor || ""} onChange={e => setEdit({ ...edit, vendor: e.target.value })} /></Field>
        <Field label="Item"><ItemAutocomplete items={masters?.items || []} value={edit.item || ""} onChange={v => setEdit(f => ({ ...f, item: v, specification: "" }))} specification={edit.specification || ""} onSpecificationChange={v => setEdit(f => ({ ...f, specification: v }))}/></Field>
        <QuantityFields units={masters?.units || []} value={edit.quantityValue ?? edit.qty ?? ""} unit={edit.quantityUnit || "Kg"} onValue={v => setEdit({ ...edit, quantityValue: v })} onUnit={v => setEdit({ ...edit, quantityUnit: v })}/>
        <Field label="Rate (₹/Kg)"><input type="number" min="0" className={inputCls} value={edit.rate ?? ""} onChange={e => setEdit({ ...edit, rate: e.target.value })} /></Field>
        <Btn className="w-full justify-center mt-2" onClick={saveEdit}>{saving ? "Saving…" : <><Check size={15}/> Save Changes</>}</Btn>
      </>}
    </Modal>
    <Modal open={open} onClose={() => setOpen(false)} title={`Add ${title}`}>
      <Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label={vendorLabel}><input className={inputCls} list={`vendors-${resource}`} placeholder="e.g. Azadpur Mandi" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} /><datalist id={`vendors-${resource}`}>{(masters?.vendors||[]).filter(v=>v.type===vendorLabel||v.type==="Both"||vendorLabel==="Vendor/Farmer").map(v=><option key={v.id} value={v.name}/>)}</datalist></Field>
      <MultiPurchaseLines lines={lines} setLines={setLines} masters={masters}/>
      <Btn className="w-full justify-center mt-3" onClick={add}>{saving ? "Saving…" : <><Check size={15} /> Save Purchase</>}</Btn>
    </Modal>
    <Modal open={!!deleteCheck} onClose={() => !deleteLoading && setDeleteCheck(null)} title={deleteCheck?.impact?.canDelete ? "Confirm Purchase Deletion" : "Purchase Cannot Be Deleted Safely"}>
      {deleteCheck && (() => {
        const { row, impact } = deleteCheck;
        const safe = !!impact?.canDelete;
        return <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${safe ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center ${safe ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}><XCircle size={19}/></div>
              <div><p className={`font-semibold ${safe ? "text-amber-900" : "text-red-900"}`}>{safe ? "Stock can be safely reversed" : "This purchase is already supporting later stock movements"}</p><p className="text-sm text-gray-600 mt-1">{safe ? "Deleting this record will also reverse its inventory receipt." : (impact?.reason || "Deleting it would make the inventory history invalid.")}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-[11px] text-gray-400 uppercase">Item</p><p className="font-semibold text-gray-800 mt-1">{itemLabel(row.item, masters, language)}</p>{row.specification && <p className="text-xs text-gray-500">{row.specification}</p>}</div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-[11px] text-gray-400 uppercase">Purchase Qty</p><p className="font-semibold text-gray-800 mt-1">{row.quantityValue ?? row.qty} {row.quantityUnit || "Kg"}</p></div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-[11px] text-gray-400 uppercase">Current Stock</p><p className="font-semibold text-gray-800 mt-1">{Number(impact?.currentStock ?? 0).toFixed(3)} Kg</p></div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-[11px] text-gray-400 uppercase">After Delete</p><p className={`font-semibold mt-1 ${safe ? "text-green-700" : "text-red-600"}`}>{impact?.remainingAfterDelete == null ? "—" : `${Number(impact.remainingAfterDelete).toFixed(3)} Kg`}</p></div>
          </div>
          {!safe && <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900"><strong>Recommended:</strong> keep this purchase. If it was entered incorrectly, correct/reverse the dependent sales or stock movement first. This is the same principle used by inventory/ERP systems that preserve the stock ledger instead of forcing negative inventory.</div>}
          <div className="flex justify-end gap-2 pt-1"><button type="button" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50" disabled={deleteLoading} onClick={() => setDeleteCheck(null)}>Keep Purchase</button>{safe ? <button type="button" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={deleteLoading} onClick={confirmDelete}>{deleteLoading ? "Deleting…" : "Delete Purchase"}</button> : <button type="button" className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => {setDeleteCheck(null);setEdit({...row});}}>Edit Purchase</button>}</div>
        </div>;
      })()}
    </Modal>
  </div>;
}

/* ---------------------------------------------------------------
   STOCK / INVENTORY PAGE
--------------------------------------------------------------- */

function StockPage({ stock, setStock, refresh, masters }) {
  const language = useLanguage();
  const [open, setOpen] = useState(false), [edit, setEdit] = useState(null), [search, setSearch] = useState(""), [statusFilter, setStatusFilter] = useState("");
  const [deleteCheck, setDeleteCheck] = useState(null), [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ item: "", specification:"", quantityValue: "", quantityUnit: "Kg", avgCost: "", sellingPrice: "", status: "Available" });
  const statuses = [...new Set(stock.map(r => r.status || "Available"))].sort();
  const filteredStock = useMemo(() => stock.filter(r => textMatch(r, ["item", "specification", "status"], search) && (!statusFilter || (r.status || "Available") === statusFilter)), [stock, search, statusFilter]);
  const totalValue = filteredStock.reduce((s, r) => s + Number(r.qty || 0) * Number(r.avgCost || 0), 0);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); };
  const add = async () => {
    if (!form.item || !form.quantityValue) return;
    try {
      const created = await api.create("stock", { item: form.item, specification:form.specification, quantityValue: Number(form.quantityValue), quantityUnit:form.quantityUnit, avgCost: Number(form.avgCost || 0), sellingPrice: Number(form.sellingPrice || 0), status: form.status });
      setStock([created, ...stock]);
      await refresh();
      setForm({ item: "", specification:"", quantityValue: "", quantityUnit: masters?.units?.[0]?.symbol || "Kg", avgCost: "", sellingPrice: "", status: "Available" });
      setOpen(false);
    }
    catch (err) { appAlert("Couldn't save this item.\n" + err.message); }
  };
  const saveEdit = async () => { if (!edit) return; try { await api.update("stock", edit.id, { status: edit.status, sellingPrice: Number(edit.sellingPrice || 0) }); await refresh(); setEdit(null); } catch (err) { appAlert("Couldn't update stock item.\n" + err.message); } };
  const del = async (id) => {
    try {
      setDeleteLoading(true);
      const check = await api.checkStockDelete(id);
      setDeleteCheck({ ...check, id });
    } catch (err) {
      setDeleteCheck({ id, error: err.message || "Failed to check this stock record." });
    } finally { setDeleteLoading(false); }
  };
  const confirmStockDelete = async () => {
    if (!deleteCheck?.id || !deleteCheck?.canDelete) return;
    try {
      setDeleteLoading(true);
      await api.remove("stock", deleteCheck.id);
      setDeleteCheck(null);
      await refresh();
    } catch (err) {
      setDeleteCheck(prev => ({ ...prev, error: err.message || "Couldn't delete this stock record." }));
    } finally { setDeleteLoading(false); }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-4"><StatCard icon={Boxes} color="green" label="Total Stock Value" value={fmt(totalValue)} /><StatCard icon={Boxes} color="blue" label="Total Quantity" value={fmtKg(filteredStock.reduce((s,r)=>s+Number(r.qty||0),0))} /><StatCard icon={Boxes} color="orange" label="Categories" value={filteredStock.length} /></div>
    <Panel title="Inventory" action={<Btn onClick={() => setOpen(true)}><Plus size={15} /> Add Item</Btn>}>
      <FilterBar search={search} setSearch={setSearch} placeholder="Search item or stock status…" onClear={clearFilters}>
        <select className={inputCls + " !w-auto bg-white"} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All Statuses</option>{statuses.map(st => <option key={st} value={st}>{st}</option>)}</select>
      </FilterBar>
      <DataTable onEdit={r => setEdit({ ...r })} onDelete={del} columns={[{key:"item",label:"Item",render:r=><span>{itemLabel(r.item, masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span>},{key:"qty",label:"Qty in Stock",render:r=>fmtKg(r.qty)},{key:"avgCost",label:"Avg. Cost/Kg",render:r=>fmt(r.avgCost)},{key:"sellingPrice",label:"Selling Price/Kg",render:r=>fmt(r.sellingPrice)},{key:"value",label:"Stock Value",render:r=><span className="font-medium text-gray-800">{fmt(Number(r.qty||0)*Number(r.avgCost||0))}</span>},{key:"status",label:"Status",render:r=><Badge status={r.status||"Available"}/>}]} rows={filteredStock}/>
    </Panel>
    <Modal open={open} onClose={() => setOpen(false)} title="Add Stock Item"><Field label="Item"><ItemAutocomplete items={masters?.items || []} value={form.item} onChange={v=>setForm(f=>({...f,item:v,specification:""}))} specification={form.specification} onSpecificationChange={v=>setForm(f=>({...f,specification:v}))}/></Field><QuantityFields units={masters?.units || []} value={form.quantityValue} unit={form.quantityUnit} onValue={v=>setForm({...form,quantityValue:v})} onUnit={v=>setForm({...form,quantityUnit:v})}/><Field label="Avg. Cost/Kg"><input type="number" min="0" className={inputCls} value={form.avgCost} onChange={e=>setForm({...form,avgCost:e.target.value})}/></Field><Field label="Selling Price/Kg"><input type="number" className={inputCls} value={form.sellingPrice} onChange={e=>setForm({...form,sellingPrice:e.target.value})}/></Field><Field label="Stock Status"><input className={inputCls} placeholder="e.g. Available, Low Stock, Reserved" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}/></Field><Btn className="w-full justify-center mt-2" onClick={add}><Check size={15}/> Save Item</Btn></Modal>
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Edit Stock Item">{edit&&<><p className="text-sm text-gray-600 mb-4">{itemLabel(edit.item, masters, language)} · {fmtKg(edit.qty)} in stock</p><Field label="Selling Price/Kg"><input type="number" className={inputCls} value={edit.sellingPrice??""} onChange={e=>setEdit({...edit,sellingPrice:e.target.value})}/></Field><Field label="Stock Status"><input className={inputCls} placeholder="e.g. Available, Low Stock, Reserved" value={edit.status||""} onChange={e=>setEdit({...edit,status:e.target.value})}/></Field><Btn className="w-full justify-center mt-2" onClick={saveEdit}><Check size={15}/> Save Changes</Btn></>}</Modal>
    <Modal open={!!deleteCheck} onClose={()=>!deleteLoading&&setDeleteCheck(null)} title={deleteCheck?.error ? "Unable to Check Stock" : deleteCheck?.canDelete ? "Delete Stock Record?" : "Stock Record Cannot Be Deleted"}>
      {deleteCheck && <div className="space-y-4">
        {deleteCheck.error ? <>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{deleteCheck.error}</div>
          <div className="flex justify-end"><button type="button" className="px-4 py-2 rounded-lg bg-gray-800 text-white" onClick={()=>setDeleteCheck(null)}>Close</button></div>
        </> : <>
          <div className={`rounded-xl border p-4 ${deleteCheck.canDelete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className={`font-semibold ${deleteCheck.canDelete ? "text-emerald-800" : "text-amber-900"}`}>{deleteCheck.canDelete ? "Safe to delete" : "Keep this inventory record"}</p>
            <p className={`text-sm mt-1 ${deleteCheck.canDelete ? "text-emerald-700" : "text-amber-800"}`}>{deleteCheck.reason}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="font-semibold text-gray-800">{itemLabel(deleteCheck.item, masters, language)}{deleteCheck.specification && <span className="text-sm text-gray-500"> · {deleteCheck.specification}</span>}</p>
            <p className="text-sm text-gray-500 mt-1">Current stock: <span className="font-medium text-gray-700">{fmtKg(deleteCheck.qty)}</span></p>
          </div>
          {Object.keys(deleteCheck.history || {}).length > 0 && <div className="grid grid-cols-3 gap-2 text-center">
            {[['purchase','Purchases'],['sale','Sales'],['opening','Opening']].map(([key,label]) => <div key={key} className="rounded-lg border border-gray-100 p-2"><p className="text-[10px] uppercase text-gray-400">{label}</p><p className="font-semibold text-gray-700">{deleteCheck.history?.[key] || 0}</p></div>)}
          </div>}
          {!deleteCheck.canDelete && <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900"><strong>Recommended:</strong> edit or reverse the related purchase/sale instead of deleting this stock row. This keeps the inventory ledger consistent.</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50" disabled={deleteLoading} onClick={()=>setDeleteCheck(null)}>Cancel</button>
            {deleteCheck.canDelete && <button type="button" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={deleteLoading} onClick={confirmStockDelete}>{deleteLoading ? "Deleting…" : "Delete Stock Record"}</button>}
          </div>
        </>}
      </div>}
    </Modal>
  </div>;
}

/* ---------------------------------------------------------------
   SALES / SUPPLY PAGE
--------------------------------------------------------------- */

function SalesPage({ sales, setSales, customers, payments = [], refresh, masters, stock = [], mandiPurchases = [], localPurchases = [] }) {
  const language = useLanguage();
  const [open,setOpen]=useState(false),[edit,setEdit]=useState(null),[paymentDetails,setPaymentDetails]=useState(null),[search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
  const [form,setForm]=useState({date:todayStr(),customer:"",phone:"",status:"Due",paymentMethod:"Cash",paymentProof:null,transactionId:""});
  const [lines,setLines]=useState([blankSaleLine(masters?.units || [])]);
  const filteredSales=useMemo(()=>sales.filter(r=>textMatch(r,["customer","phone","item","specification","status","payment_method"],search)&&(!statusFilter||r.status===statusFilter)&&dateMatch(r,from,to)),[sales,search,statusFilter,from,to]);
  const total=filteredSales.reduce((s,r)=>s+Number(r.amount||0),0);
  const salesItems = useMemo(() => (masters?.items || []).filter(i => i.active !== false), [masters]);
  const clearFilters=()=>{setSearch("");setStatusFilter("");setFrom("");setTo("");};
  const resetForm=()=>{setForm({date:todayStr(),customer:"",phone:"",status:"Due",paymentMethod:"Cash",paymentProof:null,transactionId:""});setLines([blankSaleLine(masters?.units || [])]);};
  const add=async()=>{
    if(!form.customer||!lines.length)return appAlert("Customer and at least one item are required.");
    if(lines.some(line=>!line.item||!line.quantityValue||!line.rate))return appAlert("Every item needs an item name, quantity and rate.");
    if(form.status==="Paid"&&form.paymentMethod==="Bank"&&!String(form.transactionId||"").trim())return appAlert("Transaction ID is required for Bank payments.");
    try{
      await api.create("sales",{date:form.date,customer:form.customer,phone:form.phone,items:lines.map(line=>({...line,quantityValue:Number(line.quantityValue),rate:Number(line.rate)})),status:form.status,paymentMethod:form.status==="Paid"?form.paymentMethod:null,paymentProof:form.status==="Paid"&&form.paymentMethod==="UPI"?form.paymentProof:null,transactionId:form.status==="Paid"&&form.paymentMethod==="Bank"?String(form.transactionId||"").trim():null});
      await refresh();setOpen(false);resetForm();
    }catch(err){appAlert("Couldn't save this sale.\n"+err.message)}
  };
  const del=async id=>{if(!await appConfirm("Delete this sale? The sold quantity will be returned to stock and customer due will be recalculated."))return;try{await api.remove("sales",id);await refresh()}catch(err){appAlert("Couldn't delete this sale.\n"+err.message)}};
  const saveEdit=async()=>{
    if(!edit)return;
    if(edit.status==="Paid"&&edit.paymentMethod==="Bank"&&!String(edit.transactionId||"").trim())return appAlert("Transaction ID is required for Bank payments.");
    try{await api.update("sales",edit.id,{status:edit.status,phone:edit.phone,paymentMethod:edit.status==="Paid"?(edit.paymentMethod||"Cash"):null,paymentProof:edit.status==="Paid"&&edit.paymentMethod==="UPI"?(edit.paymentProof||null):null,transactionId:edit.status==="Paid"&&edit.paymentMethod==="Bank"?String(edit.transactionId||"").trim():null});await refresh();setEdit(null)}catch(err){appAlert("Couldn't update sale.\n"+err.message)}
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-4"><StatCard icon={Truck} color="blue" label="Total Sales" value={fmt(total)} sub={`${filteredSales.length} of ${sales.length} entries`}/><StatCard icon={Boxes} color="green" label="Total Quantity Sold" value={fmtKg(filteredSales.reduce((s,r)=>s+Number(r.qty||0),0))}/><StatCard icon={Wallet} color="orange" label="Sales on Due" value={fmt(filteredSales.filter(r=>r.status==="Due").reduce((s,r)=>s+Number(r.amount||0),0))}/></div>
    <Panel title="Sales / Supply Entries" action={<Btn onClick={()=>setOpen(true)}><Plus size={15}/> New Supply (Sale)</Btn>}>
      <FilterBar search={search} setSearch={setSearch} placeholder="Search customer, mobile, item, specification…" onClear={clearFilters}><select className={inputCls+" !w-auto bg-white"} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All Statuses</option><option>Due</option><option>Paid</option></select><DateFilters from={from} setFrom={setFrom} to={to} setTo={setTo}/></FilterBar>
      <DataTable onDelete={del} onEdit={r=>setEdit({...r,phone:(customers.find(c=>c.name.trim().toLowerCase()===r.customer.trim().toLowerCase())||{}).phone||"",paymentMethod:r.payment_method||r.paymentMethod||"Cash",paymentProof:r.payment_proof||r.paymentProof||null,transactionId:r.transaction_id||r.transactionId||""})} columns={[
        {key:"date",label:"Date"},
        {key:"customer",label:"Customer"},
        {key:"item",label:"Item",render:r=><span>{itemLabel(r.item, masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span>},
        {key:"qty",label:"Qty",render:r=>`${r.quantityValue ?? r.qty} ${r.quantityUnit || "Kg"}`},
        {key:"rate",label:"Rate/Kg",render:r=>fmt(r.rate)},
        {key:"amount",label:"Amount",render:r=><span className="font-medium">{fmt(r.amount)}</span>},
        {key:"payment_method",label:"Method",render:r=>r.status==="Paid"?<button type="button" onClick={()=>setPaymentDetails(r)} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100">{r.payment_method||r.paymentMethod||"Cash"}</button>:<span className="text-xs text-gray-400">—</span>},
        {key:"status",label:"Status",render:r=><Badge status={r.status}/>}
      ]} rows={filteredSales}/>
    </Panel>
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Edit Sale / Customer Contact">{edit&&<><p className="text-sm text-gray-600 mb-4">{edit.customer} · {itemLabel(edit.item, masters, language)} · {fmt(edit.amount)}</p><Field label="Customer Mobile Number"><input type="tel" className={inputCls} placeholder="10 digit mobile number" value={edit.phone||""} onChange={e=>setEdit({...edit,phone:e.target.value})}/></Field><Field label="Payment Status"><select className={inputCls} value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value,paymentMethod:e.target.value==="Paid"?(edit.paymentMethod||"Cash"):"Cash",paymentProof:e.target.value==="Paid"?edit.paymentProof:null,transactionId:e.target.value==="Paid"?(edit.transactionId||""):""})}><option>Due</option><option>Paid</option></select></Field>{edit.status==="Paid"&&<><Field label="Payment Method"><select className={inputCls} value={edit.paymentMethod||"Cash"} onChange={e=>setEdit({...edit,paymentMethod:e.target.value,paymentProof:e.target.value==="UPI"?edit.paymentProof:null,transactionId:e.target.value==="Bank"?(edit.transactionId||""):""})}><option>Cash</option><option>UPI</option><option>Bank</option></select></Field>{edit.paymentMethod==="UPI"&&<PaymentProofField value={edit.paymentProof} onChange={v=>setEdit({...edit,paymentProof:v})}/>} {edit.paymentMethod==="Bank"&&<Field label="Transaction ID"><input type="text" className={inputCls} value={edit.transactionId||""} onChange={e=>setEdit({...edit,transactionId:e.target.value})} placeholder="Enter bank transaction ID"/></Field>}</>}<Btn className="w-full justify-center mt-2" onClick={saveEdit}><Check size={15}/> Save Sale</Btn></>}</Modal>
    <Modal open={open} onClose={()=>{setOpen(false);resetForm()}} title="New Supply (Sale)">
      <Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
      <div className="grid grid-cols-[1fr_150px] gap-3"><Field label="Customer"><input className={inputCls} list="sale-customers" value={form.customer} onChange={e=>{const value=e.target.value;const c=customers.find(x=>String(x.name||'').trim().toLowerCase()===value.trim().toLowerCase());setForm({...form,customer:value,phone:c?.phone||form.phone})}} placeholder="Customer name"/><datalist id="sale-customers">{customers.map(c=><option key={c.id} value={c.name}/>)}</datalist></Field><Field label="Mobile"><input className={inputCls} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="10 digit mobile"/></Field></div>
      <MultiSaleLines lines={lines} setLines={setLines} masters={masters}/>
      <div className="mt-3 border-t border-gray-100 pt-3"><Field label="Payment Status"><select className={inputCls} value={form.status} onChange={e=>setForm({...form,status:e.target.value,paymentMethod:e.target.value==="Paid"?(form.paymentMethod||"Cash"):"Cash",paymentProof:e.target.value==="Paid"&&form.paymentMethod==="UPI"?form.paymentProof:null,transactionId:e.target.value==="Paid"&&form.paymentMethod==="Bank"?form.transactionId:""})}><option>Due</option><option>Paid</option></select></Field>
      {form.status==="Paid"&&<Field label="Payment Method"><select className={inputCls} value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value,paymentProof:e.target.value==="UPI"?form.paymentProof:null,transactionId:e.target.value==="Bank"?form.transactionId:""})}><option>Cash</option><option>UPI</option><option>Bank</option></select></Field>}
      {form.status==="Paid"&&form.paymentMethod==="UPI"&&<PaymentProofField value={form.paymentProof} onChange={v=>setForm({...form,paymentProof:v})}/>} {form.status==="Paid"&&form.paymentMethod==="Bank"&&<Field label="Transaction ID"><input type="text" className={inputCls} value={form.transactionId||""} onChange={e=>setForm({...form,transactionId:e.target.value})} placeholder="Enter bank transaction ID"/></Field>}</div>
      <Btn className="w-full justify-center mt-3" onClick={add}><Check size={15}/> Save Sale</Btn>
    </Modal>

    <Panel title="Recent Payments"><DataTable columns={[{key:"date",label:"Date"},{key:"customer",label:"Customer"},{key:"sale_item",label:"Item",render:r=><span>{r.sale_item||"Customer Payment"}{r.sale_specification&&<span className="text-xs text-gray-400 block">{r.sale_specification}</span>}</span>},{key:"amount",label:"Amount",render:r=><span className="font-medium">{fmt(r.amount)}</span>},{key:"payment_method",label:"Method",render:r=><Badge status={r.payment_method||"Cash"}/>},{key:"sale_id",label:"Type",render:r=><span className="text-xs text-gray-500">{r.sale_id||r.source_sale_id?"Sale Payment":"Customer Payment"}</span>},{key:"payment_proof",label:"Proof",render:r=>r.payment_proof?<a href={r.payment_proof} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 hover:underline">View screenshot</a>:<span className="text-xs text-gray-400">—</span>},{key:"transaction_id",label:"Transaction ID",render:r=>r.transaction_id?<span className="text-xs font-medium break-all">{r.transaction_id}</span>:<span className="text-xs text-gray-400">—</span>},{key:"note",label:"Note",render:r=>r.note||"—"}]} rows={payments.slice(0,30)}/></Panel>
  </div>;
}




function CustomersPage({ customers = [], setCustomers, refresh }) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.phone || "").toLowerCase().includes(q) ||
      String(c.mobile || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">

      <Panel
        title="Customers"
        subtitle="Manage your customers and their outstanding dues"
      >

        <div className="mb-4">
          <input
            className={inputCls}
            placeholder="Search customer or mobile number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={[
            {
              key: "name",
              label: "Customer",
              render: r => (
                <span className="font-medium text-gray-800">
                  {r.name || "—"}
                </span>
              )
            },
            {
              key: "phone",
              label: "Mobile",
              render: r => r.phone || r.mobile || "—"
            },
            {
              key: "due",
              label: "Due",
              render: r => (
                <span className="font-medium text-red-600">
                  {fmt(Number(r.due || 0))}
                </span>
              )
            },
            {
              key: "status",
              label: "Status",
              render: r => (
                <Badge
                  status={
                    Number(r.due || 0) > 0
                      ? "Due"
                      : "Paid"
                  }
                />
              )
            }
          ]}
          rows={filteredCustomers}
        />

      </Panel>

    </div>
  );
}

function PaymentsPage({
  customers = [],
  payments = [],
  sales = [],
  refresh,
  collectedToday = 0,
  business = {},
  language = "en",
  masters = {}
}) {
  const [form, setForm] = useState({
    customerId: "",
    saleId: "",
    date: todayStr(),
    amount: "",
    note: "",
    paymentMethod: "Cash",
    paymentProof: null,
    transactionId: ""
  });

  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);

  const customer = useMemo(
    () =>
      customers.find(
        c => String(c.id) === String(form.customerId)
      ),
    [customers, form.customerId]
  );

  const dueSales = useMemo(
    () =>
      sales.filter(
        s =>
          String(s.customer || "").trim().toLowerCase() ===
            String(customer?.name || "").trim().toLowerCase() &&
          String(s.status || "").toLowerCase() === "due"
      ),
    [sales, customer]
  );

  const salePaid = saleId =>
    payments
      .filter(
        p =>
          String(p.sale_id || p.saleId || "") === String(saleId) &&
          !p.source_sale_id
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const selectedSale = useMemo(
    () =>
      sales.find(
        s => String(s.id) === String(form.saleId)
      ),
    [sales, form.saleId]
  );

  const saleDue = selectedSale
    ? Math.max(
        0,
        Number(
          selectedSale.total ||
            selectedSale.amount ||
            selectedSale.grand_total ||
            0
        ) - salePaid(selectedSale.id)
      )
    : 0;

  const resetForm = () => {
    setForm({
      customerId: "",
      saleId: "",
      date: todayStr(),
      amount: "",
      note: "",
      paymentMethod: "Cash",
      paymentProof: null,
      transactionId: ""
    });
  };

  const savePayment = async e => {
    e.preventDefault();

    if (!form.customerId) {
      alert("Please select customer");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Please enter valid amount");
      return;
    }

    if (
      form.paymentMethod === "Bank" &&
      !String(form.transactionId || "").trim()
    ) {
      alert("Please enter transaction ID");
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      body.append("customer_id", form.customerId);
      if (form.saleId) body.append("sale_id", form.saleId);
      body.append("date", form.date);
      body.append("amount", form.amount);
      body.append("note", form.note || "");
      body.append("payment_method", form.paymentMethod);

      if (form.transactionId) {
        body.append("transaction_id", form.transactionId);
      }

      if (form.paymentProof) {
        body.append("payment_proof", form.paymentProof);
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        body
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save payment");
      }

      resetForm();
      await refresh?.();
      alert("Payment added successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async id => {
    if (!window.confirm("Delete this payment?")) return;

    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete payment");
      }

      setDetails(null);
      await refresh?.();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete payment");
    }
  };

  const takePhoto = () => {
    document.getElementById("payment-camera-input")?.click();
  };

  const uploadScreenshot = () => {
    document.getElementById("payment-file-input")?.click();
  };

  return (
    <div className="space-y-6">

      <Panel
        title="Payments"
        subtitle="Record customer payments and manage outstanding dues"
      >
        <form onSubmit={savePayment} className="space-y-5">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium mb-1">
                Customer
              </label>

              <select
                value={form.customerId}
                onChange={e =>
                  setForm({
                    ...form,
                    customerId: e.target.value,
                    saleId: ""
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select customer</option>

                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Sale / Due
              </label>

              <select
                value={form.saleId}
                onChange={e =>
                  setForm({
                    ...form,
                    saleId: e.target.value
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
                disabled={!form.customerId}
              >
                <option value="">General payment</option>

                {dueSales.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.date || ""} — ₹
                    {Number(
                      s.total ||
                        s.amount ||
                        s.grand_total ||
                        0
                    ).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Date
              </label>

              <input
                type="date"
                value={form.date}
                onChange={e =>
                  setForm({
                    ...form,
                    date: e.target.value
                  })
                }
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e =>
                  setForm({
                    ...form,
                    amount: e.target.value
                  })
                }
                placeholder="Enter amount"
                className="w-full border rounded-lg px-3 py-2"
              />

              {saleDue > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Sale due: ₹
                  {saleDue.toLocaleString("en-IN")}
                </div>
              )}
            </div>

          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>

            <div className="flex flex-wrap gap-2">

              {["Cash", "UPI", "Bank"].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      paymentMethod: method
                    })
                  }
                  className={`px-4 py-2 rounded-lg border ${
                    form.paymentMethod === method
                      ? "bg-black text-white"
                      : "bg-white"
                  }`}
                >
                  {method}
                </button>
              ))}

            </div>
          </div>

          {form.paymentMethod === "UPI" && (
            <div className="border rounded-xl p-4 space-y-3">

              <div className="font-medium">
                UPI Payment Proof
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={takePhoto}
                  className="px-4 py-2 border rounded-lg"
                >
                  Take Photo
                </button>

                <button
                  type="button"
                  onClick={uploadScreenshot}
                  className="px-4 py-2 border rounded-lg"
                >
                  Upload Screenshot
                </button>

              </div>

              <input
                id="payment-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e =>
                  setForm({
                    ...form,
                    paymentProof:
                      e.target.files?.[0] || null
                  })
                }
              />

              <input
                id="payment-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e =>
                  setForm({
                    ...form,
                    paymentProof:
                      e.target.files?.[0] || null
                  })
                }
              />

              {form.paymentProof && (
                <div className="text-sm text-gray-600">
                  Selected: {form.paymentProof.name}
                </div>
              )}

            </div>
          )}

          {form.paymentMethod === "Bank" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Transaction ID
              </label>

              <input
                type="text"
                value={form.transactionId}
                onChange={e =>
                  setForm({
                    ...form,
                    transactionId: e.target.value
                  })
                }
                placeholder="Enter bank transaction ID"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Note
            </label>

            <textarea
              value={form.note}
              onChange={e =>
                setForm({
                  ...form,
                  note: e.target.value
                })
              }
              placeholder="Optional note"
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-black text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Payment"}
          </button>

        </form>
      </Panel>

      <Panel
        title="Payment History"
        subtitle="Recent customer payments"
      >

        <DataTable
          columns={[
            {
              key: "date",
              label: "Date"
            },
            {
              key: "customer",
              label: "Customer",
              render: r =>
                r.customer_name ||
                r.customer ||
                r.name ||
                "—"
            },
            {
              key: "amount",
              label: "Amount",
              render: r =>
                `₹${Number(
                  r.amount || 0
                ).toLocaleString("en-IN")}`
            },
            {
              key: "method",
              label: "Method",
              render: r => (
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => setDetails(r)}
                >
                  {r.payment_method ||
                    r.method ||
                    "Cash"}
                </button>
              )
            },
            {
              key: "note",
              label: "Note",
              render: r => r.note || "—"
            }
          ]}
          rows={payments.slice(0, 30)}
        />

      </Panel>

      {details && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setDetails(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-semibold">
                Payment Details
              </h3>

              <button
                onClick={() => setDetails(null)}
                className="text-gray-500 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">

              <div>
                <b>Method:</b>{" "}
                {details.payment_method ||
                  details.method ||
                  "Cash"}
              </div>

              <div>
                <b>Amount:</b> ₹
                {Number(
                  details.amount || 0
                ).toLocaleString("en-IN")}
              </div>

              {details.transaction_id && (
                <div>
                  <b>Transaction ID:</b>{" "}
                  <span className="break-all">
                    {details.transaction_id}
                  </span>
                </div>
              )}

              {details.note && (
                <div>
                  <b>Note:</b> {details.note}
                </div>
              )}

              {details.payment_proof && (
                <div>
                  <b>UPI Proof:</b>

                  <img
                    src={details.payment_proof}
                    alt="Payment proof"
                    className="mt-3 max-h-80 rounded-lg border object-contain"
                  />
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 mt-6">

              <button
                type="button"
                onClick={() => setDetails(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>

              {details.id && (
                <button
                  type="button"
                  onClick={() =>
                    deletePayment(details.id)
                  }
                  className="px-4 py-2 rounded-lg bg-red-600 text-white"
                >
                  Delete
                </button>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
/* ---------------------------------------------------------------
   EXPENSES PAGE
--------------------------------------------------------------- */

function ExpensesPage({ expenses, setExpenses, refresh, masters }) {
  const [open,setOpen]=useState(false),[search,setSearch]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
  const [form,setForm]=useState({date:todayStr(),category:"",note:"",amount:""});
  const filtered=useMemo(()=>expenses.filter(e=>textMatch(e,["category","note"],search)&&dateMatch(e,from,to)),[expenses,search,from,to]);
  const total=filtered.reduce((s,e)=>s+Number(e.amount||0),0); const clear=()=>{setSearch("");setFrom("");setTo("");};
  const add=async()=>{if(!form.category||!form.amount)return;try{const created=await api.create("expenses",{...form,amount:Number(form.amount)});setExpenses([created,...expenses]);await refresh();setForm({date:todayStr(),category:"",note:"",amount:""});setOpen(false)}catch(err){appAlert("Couldn't save this expense.\n"+err.message)}};
  const del=async id=>{setExpenses(expenses.filter(e=>e.id!==id));try{await api.remove("expenses",id)}catch(err){appAlert("Couldn't delete on the server — reload to resync.\n"+err.message)}};
  return <div className="space-y-5"><div className="flex flex-wrap gap-4"><StatCard icon={Receipt} color="orange" label="Total Expenses" value={fmt(total)} sub={`${filtered.length} of ${expenses.length} entries`}/></div><Panel title="Expense Log" action={<Btn onClick={()=>setOpen(true)}><Plus size={15}/> Add Expense</Btn>}><FilterBar search={search} setSearch={setSearch} placeholder="Search category or note…" onClear={clear}><DateFilters from={from} setFrom={setFrom} to={to} setTo={setTo}/></FilterBar><DataTable onDelete={del} columns={[{key:"date",label:"Date"},{key:"category",label:"Category"},{key:"note",label:"Note",render:r=>r.note||"—"},{key:"amount",label:"Amount",render:r=><span className="font-medium text-gray-800">{fmt(r.amount)}</span>}]} rows={filtered}/></Panel><Modal open={open} onClose={()=>setOpen(false)} title="Add Expense"><Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Category"><input className={inputCls} list="expense-categories" placeholder="e.g. Transport Fare" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/><datalist id="expense-categories">{(masters?.expenseCategories||[]).map(c=><option key={c.id} value={c.name}/>)}</datalist></Field><Field label="Note (optional)"><input className={inputCls} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></Field><Field label="Amount (₹)"><input type="number" className={inputCls} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Field><Btn className="w-full justify-center mt-2" onClick={add}><Check size={15}/> Save Expense</Btn></Modal></div>;
}

/* ---------------------------------------------------------------
   LABOUR / MAJDOOR PAGE
--------------------------------------------------------------- */

function LabourPage({ labour, setLabour, refresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), name: "", workType: "Loading", workers: "", amount: "" });
  const total = labour.reduce((s, l) => s + l.amount, 0);

  const add = async () => {
    if (!form.name || !form.workers || !form.amount) return;
    try {
      const created = await api.create("labour", { date: form.date, name: form.name, workType: form.workType, workers: Number(form.workers), amount: Number(form.amount) });
      setLabour([created, ...labour]);
      await refresh();
      setForm({ date: todayStr(), name: "", workType: "Loading", workers: "", amount: "" });
      setOpen(false);
    } catch (err) {
      appAlert("Couldn't save this labour entry.\n" + err.message);
    }
  };
  const del = async (id) => {
    setLabour(labour.filter((l) => l.id !== id));
    try {
      await api.remove("labour", id);
    } catch (err) {
      appAlert("Couldn't delete on the server — reload to resync.\n" + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <StatCard icon={HardHat} color="teal" label="Total Labour Cost" value={fmt(total)} sub={`${labour.length} entries`} />
        <StatCard icon={Users} color="blue" label="Workers Engaged" value={labour.reduce((s, l) => s + l.workers, 0)} />
      </div>

      <Panel title="Labour Log" action={<Btn onClick={() => setOpen(true)}><Plus size={15} /> Add Labour Entry</Btn>}>
        <DataTable
          onDelete={del}
          columns={[
            { key: "date", label: "Date" },
            { key: "name", label: "Crew" },
            { key: "workType", label: "Work Type" },
            { key: "workers", label: "Workers" },
            { key: "amount", label: "Amount", render: (r) => <span className="font-medium text-gray-800">{fmt(r.amount)}</span> },
          ]}
          rows={labour}
        />
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Labour Entry">
        <Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Crew / Worker Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Work Type">
          <select className={inputCls} value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })}>
            <option>Loading</option><option>Unloading</option><option>Sorting</option><option>Other</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="No. of Workers"><input type="number" className={inputCls} value={form.workers} onChange={(e) => setForm({ ...form, workers: e.target.value })} /></Field>
          <Field label="Amount (₹)"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        </div>
        <Btn className="w-full justify-center mt-2" onClick={add}><Check size={15} /> Save Entry</Btn>
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------
   REPORTS & ANALYTICS PAGE
--------------------------------------------------------------- */

function ReportsPage({ data }) {
  const language = useLanguage();
  const firstOfMonth = () => { const t=todayStr(); return `${t.slice(0,8)}01`; };
  const [from,setFrom]=useState(firstOfMonth), [to,setTo]=useState(todayStr()), [report,setReport]=useState(null), [loading,setLoading]=useState(true);
  const load=async(f=from,t=to)=>{setLoading(true);try{setReport(await api.getOverview(f,t));}catch(e){appAlert("Couldn't load report.\n"+e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const monthly=()=>{const now=todayStr();const [y,m]=now.split("-").map(Number);const f=`${y}-${String(m).padStart(2,"0")}-01`;const last=new Date(Date.UTC(y,m,0,12));const t=localDateStr(last);setFrom(f);setTo(t);load(f,t);};
  const topDemand=(report?.items||[]).slice().sort((a,b)=>b.sold_qty-a.sold_qty).slice(0,8);
  const topProfit=(report?.items||[]).slice().sort((a,b)=>b.profit-a.profit).slice(0,8);
  const purchase=(report?.items||[]).filter(i=>i.recommendation!=="Hold").sort((a,b)=>({URGENT:0,HIGH:1,MEDIUM:2}[a.priority]-({URGENT:0,HIGH:1,MEDIUM:2}[b.priority])||b.profit-a.profit));
  const totals=report?.totals||{};
  return <div className="space-y-5">
    <Panel title="Business Overview" action={<div className="flex flex-wrap gap-2"><input type="date" className={inputCls+" !w-auto"} value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" className={inputCls+" !w-auto"} value={to} onChange={e=>setTo(e.target.value)}/><Btn onClick={()=>load()}><RefreshCw size={14}/> Apply</Btn><Btn variant="outline" onClick={monthly}>This Month</Btn></div>}>
      {loading?<p className="text-sm text-gray-400 py-8 text-center">Calculating from database…</p>:<><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><StatCard icon={Truck} color="blue" label="Sales" value={fmt(totals.sales)}/><StatCard icon={ShoppingBasket} color="green" label="Purchase" value={fmt(totals.purchase)}/><StatCard icon={Boxes} color="teal" label="Sold Quantity" value={fmtKg(totals.sold_qty)}/><StatCard icon={Receipt} color="orange" label="COGS" value={fmt(totals.cogs)}/><StatCard icon={CircleDollarSign} color="purple" label="Gross Profit" value={fmt(totals.profit)}/></div></>}
    </Panel>
    {!loading&&<><Panel title={`${language === "hi" ? "दिनांकवार अवलोकन" : "Date-wise Overview"} (${from} ${language === "hi" ? "से" : "to"} ${to})`}><DataTable columns={[{key:"date",label:language === "hi" ? "दिनांक" : "Date"},{key:"sales",label:language === "hi" ? "बिक्री" : "Sales",render:r=>fmt(r.sales)},{key:"purchase",label:language === "hi" ? "खरीद" : "Purchase",render:r=>fmt(r.purchase)},{key:"sold_qty",label:language === "hi" ? "बिकी मात्रा" : "Sold",render:r=>fmtKg(r.sold_qty)},{key:"cogs",label:"COGS",render:r=>fmt(r.cogs)},{key:"profit",label:language === "hi" ? "सकल लाभ" : "Gross Profit",render:r=><span className="font-medium text-green-700">{fmt(r.profit)}</span>}]} rows={report.daily.map(r=>({...r,date:r.date?.slice(0,10)}))}/></Panel>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Panel title="High-Demand Sabji (by quantity sold)"><DataTable columns={[{key:"item",label:"Sabji",render:r=><span>{itemLabel(r.item, data.masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span>},{key:"sold_qty",label:"Sold",render:r=>fmtKg(r.sold_qty)},{key:"avg_daily_qty",label:"Avg/Day",render:r=>fmtKg(r.avg_daily_qty)}]} rows={topDemand}/></Panel><Panel title="Highest Profit Sabji"><DataTable columns={[{key:"item",label:"Sabji",render:r=><span>{itemLabel(r.item, data.masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span>},{key:"revenue",label:"Revenue",render:r=>fmt(r.revenue)},{key:"profit",label:"Profit",render:r=><span className="font-medium text-green-700">{fmt(r.profit)}</span>},{key:"margin",label:"Margin",render:r=>`${r.margin}%`}]} rows={topProfit}/></Panel></div>
    <Panel title="What Should I Purchase Next?"><p className="text-xs text-gray-500 mb-3">Recommendations use sales velocity, current stock coverage and profitability. Suggested quantity targets about 7 days of demand.</p><DataTable columns={[{key:"item",label:"Sabji",render:r=><span>{itemLabel(r.item, data.masters, language)}{r.specification&&<span className="text-xs text-gray-400 block">{r.specification}</span>}</span>},{key:"stock_qty",label:"Current Stock",render:r=>fmtKg(r.stock_qty)},{key:"stock_days",label:"Stock Cover",render:r=>r.stock_days===null?"No recent sales":`${r.stock_days} days`},{key:"avg_daily_qty",label:"Demand/Day",render:r=>fmtKg(r.avg_daily_qty)},{key:"profit",label:"Profit",render:r=>fmt(r.profit)},{key:"priority",label:"Priority",render:r=><Badge status={r.priority==='URGENT'?'Overdue':r.priority==='HIGH'?'Due Today':'Upcoming'}/>},{key:"suggested_qty",label:"Suggested Buy",render:r=>fmtKg(r.suggested_qty)}]} rows={purchase}/></Panel>
    </>}
  </div>;
}

/* ---------------------------------------------------------------
   WHATSAPP BILLS PAGE
--------------------------------------------------------------- */

function WhatsAppPage({ bills, setBills, business, refresh }) {
  const language = useLanguage();
  const [search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState(""),[typeFilter,setTypeFilter]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
  const filtered=useMemo(()=>bills.filter(b=>textMatch(b,["customer","phone","kind","status","message"],search)&&(!statusFilter||b.status===statusFilter)&&(!typeFilter||b.kind===typeFilter)&&dateMatch(b,from,to)),[bills,search,statusFilter,typeFilter,from,to]);
  const clear=()=>{setSearch("");setStatusFilter("");setTypeFilter("");setFrom("");setTo("");};
  const messageFor = b => `Hello ${b.customer}, your outstanding amount with ${business?.name||"SabziSetu"} is ${fmt(b.amount)}. Please make the payment at your earliest convenience. Thank you.`;
  const send=async(id)=>{const bill=bills.find(b=>b.id===id); if(!bill||bill.kind==="Payment")return; if(openWhatsApp(bill.phone,messageFor(bill))){try{await api.update("whatsapp-bills",id,{status:"Opened"}); await refresh();}catch(err){appAlert("Couldn't save on the server — reload to resync.\n"+err.message)}}};
  const sendAll=async()=>{
    const pending=filtered.filter(b=>b.kind!=="Payment" && b.status==="Not sent" && waPhone(b.phone));
    if(!pending.length){appAlert(language==="hi"?"भेजने के लिए कोई लंबित बिल नहीं है।":"There are no pending bills with valid mobile numbers to open.");return;}
    const confirmed=await appConfirm(language==="hi"?`${pending.length} ग्राहकों के लिए व्हाट्सऐप संदेश खोलें?\n\nप्रत्येक संदेश व्हाट्सऐप में पहले से भरा हुआ खुलेगा। संदेश अपने-आप नहीं भेजा जाएगा।`:`Open WhatsApp messages for ${pending.length} customers?\n\nEach message will open pre-filled in WhatsApp. Messages are not sent automatically.`);
    if(!confirmed)return;
    for(const b of pending){
      if(openWhatsApp(b.phone,messageFor(b))){
        try{await api.update("whatsapp-bills",b.id,{status:"Opened"}); await refresh()}catch(err){console.error(err)}
      }
      await new Promise(r=>setTimeout(r,450));
    }
  };
  const openedCount=filtered.filter(b=>b.status==="Opened").length;
  return <div className="space-y-5"><div className="flex flex-wrap gap-4"><StatCard icon={MessageCircle} color="green" label="WhatsApp Opened" value={openedCount}/><StatCard icon={MessageCircle} color="orange" label="Pending" value={filtered.filter(b=>b.status==="Not sent").length}/></div><Panel title="WhatsApp Bills" action={<Btn variant="outline" onClick={sendAll}><Send size={14}/> Open All Pending</Btn>}><FilterBar search={search} setSearch={setSearch} placeholder="Search customer or mobile…" onClear={clear}><select className={inputCls+" !w-auto bg-white"} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="">All Types</option><option value="Bill">Bill</option><option value="Reminder">Reminder</option><option value="Payment">Payment</option></select><select className={inputCls+" !w-auto bg-white"} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All Statuses</option><option>Not sent</option><option>Opened</option><option>Recorded</option></select><DateFilters from={from} setFrom={setFrom} to={to} setTo={setTo}/></FilterBar><DataTable columns={[{key:"customer",label:"Customer"},{key:"phone",label:"Phone",render:r=><span className="flex items-center gap-1 text-gray-500"><Phone size={13}/> {r.phone||"—"}</span>},{key:"date",label:"Date"},{key:"kind",label:"Type",render:r=><Badge status={r.kind||"Bill"}/>},{key:"amount",label:"Amount",render:r=><span className="font-medium text-gray-800">{fmt(r.amount)}</span>},{key:"payment_method",label:"Method",render:r=>r.kind==="Payment"?(r.payment_method||"—"):<span className="text-xs text-gray-400">—</span>},{key:"payment_proof",label:"Proof",render:r=>r.kind==="Payment"&&r.payment_proof?<a href={r.payment_proof} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 hover:underline">View</a>:<span className="text-xs text-gray-400">—</span>},{key:"status",label:"Status",render:r=><Badge status={r.status}/>} ,{key:"action",label:"",render:r=>r.kind==="Payment"?<span className="text-xs text-gray-400">Payment recorded</span>:r.status==="Not sent"?<Btn variant="ghost" onClick={()=>send(r.id)}><Send size={13}/> Open WhatsApp</Btn>:<span className="text-xs text-gray-400">Opened</span>}]} rows={filtered}/></Panel></div>;
}

/* ---------------------------------------------------------------
   NOTIFICATIONS PAGE
--------------------------------------------------------------- */

function NotificationsPage({ notifications, setNotifications, data, refresh }) {
  const language = useLanguage();
  const [search,setSearch]=useState(""),[readFilter,setReadFilter]=useState(""),[typeFilter,setTypeFilter]=useState("");
  const types=[...new Set(notifications.map(n=>n.action_type).filter(Boolean))].sort();
  const filtered=useMemo(()=>notifications.filter(n=>textMatch(n,["text","action_type","action_value"],search)&&(!readFilter||(readFilter==="Unread"?!n.read:n.read))&&(!typeFilter||n.action_type===typeFilter)),[notifications,search,readFilter,typeFilter]);
  const clear=()=>{setSearch("");setReadFilter("");setTypeFilter("");};
  const markRead=async id=>{const previous=notifications;setNotifications(notifications.map(n=>n.id===id?{...n,read:true}:n));try{await api.update("notifications",id,{read:true})}catch(err){setNotifications(previous);appAlert(err.message)}}
  const markAll=async()=>{const previous=notifications;setNotifications(notifications.map(n=>({...n,read:true})));try{await api.markAllNotificationsRead()}catch(err){setNotifications(previous);appAlert(err.message)}}
  return <div className="space-y-5"><Panel title={language === "hi" ? "सूचनाएं" : "Notifications"} action={<Btn variant="outline" onClick={markAll}>{language === "hi" ? "सभी को पढ़ा हुआ करें" : "Mark all as read"}</Btn>}><FilterBar search={search} setSearch={setSearch} placeholder={language === "hi" ? "सूचनाएं खोजें…" : "Search notifications…"} onClear={clear}><select className={inputCls+" !w-auto bg-white"} value={readFilter} onChange={e=>setReadFilter(e.target.value)}><option value="">{language === "hi" ? "सभी" : "All"}</option><option value="Unread">{language === "hi" ? "अपठित" : "Unread"}</option><option value="Read">{language === "hi" ? "पढ़ी हुई" : "Read"}</option></select>{types.length>0&&<select className={inputCls+" !w-auto bg-white"} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="">{language === "hi" ? "सभी प्रकार" : "All Types"}</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select>}</FilterBar><ul className="divide-y divide-gray-50">{filtered.map(n=><li key={n.id} className={`py-3 flex items-start gap-3 ${!n.read?"bg-green-50/40 -mx-2 px-2 rounded-lg":""}`}><span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read?"bg-green-600":"bg-transparent"}`}/><div className="flex-1"><p className="text-sm text-gray-700">{translateNotification(n, language, data.masters)}</p><div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-400">{translateUiString(n.time, language)}</p>{n.action_type==="whatsapp"&&n.action_value&&<a href={whatsappUrl(n.action_value,n.action_message||`${n.text} Please make the payment at your earliest convenience. Thank you.`)} target="_blank" rel="noopener noreferrer" onClick={()=>{const message=n.action_message||`${n.text} Please make the payment at your earliest convenience. Thank you.`; const customerText=String(n.text||"").replace(/ has an overdue payment.*$/,"" ).replace(/ has a payment.*$/,"" ); const m=String(message).match(/₹([\d,]+(?:\.\d+)?)/); void markRead(n.id); api.logWhatsAppReminder({customer:customerText,phone:n.action_value,amount:Number((m?.[1]||"0").replace(/,/g,"")),message}).then(()=>refresh()).catch(err=>console.error("Failed to update WhatsApp Bills:",err));}} className="text-xs text-green-700 font-medium hover:underline">{language === "hi" ? "व्हाट्सऐप रिमाइंडर भेजें" : "Send WhatsApp reminder"}</a>}</div></div>{!n.read&&<button onClick={()=>markRead(n.id)} className="text-xs text-green-700 hover:underline">{language === "hi" ? "पढ़ा हुआ करें" : "Mark read"}</button>}</li>)}{filtered.length===0&&<li className="text-center text-gray-400 text-sm py-8">{language === "hi" ? "आपके फ़िल्टर से कोई सूचना मेल नहीं खाती।" : "No notifications match your filters."}</li>}</ul></Panel></div>;
}

/* ---------------------------------------------------------------
   SETTINGS PAGE
--------------------------------------------------------------- */

function SettingsPage({ business, setBusiness, masters, refreshMasters, stock = [], mandiPurchases = [], localPurchases = [], sales = [] }) {
  const [form, setForm] = useState(business);
  const [saved, setSaved] = useState(false);
  const [waSendAllEnabled, setWaSendAllEnabled] = useState(readWaSendAll(business));
  const [lowStockThreshold, setLowStockThreshold] = useState(Number(business?.low_stock_threshold_kg ?? 50));
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordShow, setPasswordShow] = useState({ current: false, next: false, confirm: false });
  useEffect(()=>{setForm(business);setWaSendAllEnabled(readWaSendAll(business));setLowStockThreshold(Number(business?.low_stock_threshold_kg ?? 50))},[business]);
  const [item, setItem] = useState({nameEn:"",nameHi:"",specifications:""});
  const [unit, setUnit] = useState({name:"",symbol:"",kgMultiplier:""});
  const [vendor, setVendor] = useState({name:"",type:"Both"});
  const [expenseCat, setExpenseCat] = useState("");
  const save = async () => { try { const updated=await api.saveSettings({...form, whatsappSendAllEnabled: waSendAllEnabled, lowStockThresholdKg: Number(lowStockThreshold)}); setBusiness(updated); setForm(updated); setWaSendAllEnabled(readWaSendAll(updated)); setSaved(true); setTimeout(()=>setSaved(false),2000); } catch(err){appAlert("Couldn't save settings.\n"+err.message)} };
  const changeAdminPassword = async (e) => {
    e.preventDefault();
    const { current, next, confirm } = passwordForm;
    if (!current || !next || !confirm) { appAlert("Please fill all password fields."); return; }
    if (next.length < 8) { appAlert("New password must be at least 8 characters."); return; }
    if (next !== confirm) { appAlert("New passwords do not match."); return; }
    if (current === next) { appAlert("New password must be different from the current password."); return; }
    try {
      setPasswordBusy(true);
      await api.changePassword(current, next, confirm);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordModalOpen(false);
      setPasswordShow({ current: false, next: false, confirm: false });
      appAlert("Password changed successfully.");
    } catch (err) {
      appAlert(err?.message || "Unable to change password.");
    } finally { setPasswordBusy(false); }
  };
  const togglePasswordVisibility = (field) => setPasswordShow(prev => ({ ...prev, [field]: !prev[field] }));

  const toggleWhatsAppSendAll = async () => {
    const previous = waSendAllEnabled;
    const next = !previous;
    // Optimistic UI update; it is rolled back if the database save fails.
    setWaSendAllEnabled(next);
    try {
      const updated = await api.setWhatsAppSendAll(next);
      const enabled = updated?.whatsappSendAllEnabled === true || updated?.whatsapp_send_all_enabled === true;
      setBusiness(prev => ({ ...prev, ...updated, whatsappSendAllEnabled: enabled, whatsapp_send_all_enabled: enabled }));
      setForm(prev => ({ ...prev, ...updated, whatsappSendAllEnabled: enabled, whatsapp_send_all_enabled: enabled }));
      setWaSendAllEnabled(enabled);
    } catch (err) {
      setWaSendAllEnabled(previous);
      appAlert("Couldn't save WhatsApp Send to All setting.\n" + err.message);
    }
  };
  const addItem=async()=>{if(!item.nameEn.trim())return;try{await api.createMaster("items",{nameEn:item.nameEn,nameHi:item.nameHi,specifications:item.specifications.split(",")});setItem({nameEn:"",nameHi:"",specifications:""});await refreshMasters()}catch(e){appAlert(e.message)}};
  const addSpec=async(id)=>{const name=await appPrompt("Specification name (e.g. Langda Mango)");if(!name?.trim())return;try{await api.addItemSpecification(id,{name:name.trim()});await refreshMasters()}catch(e){appAlert(e.message)}};
  const addUnit=async()=>{if(!unit.name||!unit.symbol||!unit.kgMultiplier)return;try{await api.createMaster("units",{...unit,kgMultiplier:Number(unit.kgMultiplier)});setUnit({name:"",symbol:"",kgMultiplier:""});await refreshMasters()}catch(e){appAlert(e.message)}};
  const addVendor=async()=>{if(!vendor.name)return;try{await api.createMaster("vendors",vendor);setVendor({name:"",type:"Both"});await refreshMasters()}catch(e){appAlert(e.message)}};
  const addExpense=async()=>{if(!expenseCat.trim())return;try{await api.createMaster("expense-categories",{name:expenseCat});setExpenseCat("");await refreshMasters()}catch(e){appAlert(e.message)}};
  const masterItems = useMemo(() => (masters?.items || []), [masters]);
  const deactivateItem = async (id, name) => {
    if (!await appConfirm(`Deactivate "${name}"? It will no longer be allowed in new purchase/sales/stock entries. Historical records will remain safe.`)) return;
    try { await api.updateItemMaster(id, { active: false }); await refreshMasters(); }
    catch (e) { appAlert(e.message); }
  };
  const activateItem = async (id) => {
    try { await api.updateItemMaster(id, { active: true }); await refreshMasters(); }
    catch (e) { appAlert(e.message); }
  };
  const deleteItem = async (id, name) => {
    if (!await appConfirm(`Permanently delete "${name}" from Item Master? This is allowed only when the item has no stock or transaction history.`)) return;
    try { await api.deleteItemMaster(id); await refreshMasters(); }
    catch (e) { appAlert(e.message); }
  };
  return <div className="space-y-5">
    <Panel title="Business Profile"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Business Name"><input className={inputCls} value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Owner Name"><input className={inputCls} value={form.owner||""} onChange={e=>setForm({...form,owner:e.target.value})}/></Field><Field label="Tagline"><input className={inputCls} value={form.tagline||""} onChange={e=>setForm({...form,tagline:e.target.value})}/></Field><Field label="Currency Symbol"><input className={inputCls} value={form.currency||"₹"} onChange={e=>setForm({...form,currency:e.target.value})}/></Field></div><Btn onClick={save}><Check size={15}/> Save Business</Btn>{saved&&<span className="ml-3 text-sm text-green-600">Saved.</span>}</Panel>
    <Panel title="Admin Controls" className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div><h4 className="font-semibold text-gray-800">WhatsApp “Send to All”</h4><p className="text-xs text-gray-500 mt-1">Turn this option on or off. When off, the Send to All button is removed from Payments & Due.</p></div>
        <button type="button" onClick={toggleWhatsAppSendAll} className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${waSendAllEnabled?"bg-emerald-600":"bg-gray-300"}`} aria-label="Toggle WhatsApp Send to All">
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow mt-1 transition ${waSendAllEnabled?"translate-x-6":"translate-x-1"}`}/>
        </button>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4">
        <div className="min-w-0"><h4 className="font-semibold text-gray-800">Change Admin Password</h4><p className="text-xs text-gray-500 mt-1">Verify your current password, then create a new password for this admin account.</p></div>
        <Btn variant="outline" onClick={() => setPasswordModalOpen(true)}><LockKeyhole size={14}/> Change Password</Btn>
      </div>
      <p className="text-xs text-amber-600">Note: the current WhatsApp link method opens each customer's pre-filled message. Automatic bulk sending will require the official WhatsApp Cloud API later.</p>
    </Panel>
    {passwordModalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!passwordBusy)setPasswordModalOpen(false)}}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
          <div><div className="flex items-center gap-2 text-emerald-800"><LockKeyhole size={18}/><h3 className="text-lg font-bold text-gray-900">Change Password</h3></div><p className="text-xs text-gray-500 mt-1">Your current password is required for security.</p></div>
          <button type="button" disabled={passwordBusy} onClick={()=>setPasswordModalOpen(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18}/></button>
        </div>
        <form onSubmit={changeAdminPassword} className="p-6 space-y-4">
          {[['current','Current password','current-password'],['next','New password','new-password'],['confirm','Confirm new password','new-password']].map(([key,label,autoComplete])=><div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="relative"><input type={passwordShow[key]?'text':'password'} autoComplete={autoComplete} value={passwordForm[key]} onChange={e=>setPasswordForm(prev=>({...prev,[key]:e.target.value}))} className={`${inputCls} pr-11 h-11 rounded-xl`} placeholder={key==='current'?'Enter current password':key==='next'?'Enter new password':'Re-enter new password'} />
              <button type="button" onClick={()=>togglePasswordVisibility(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">{passwordShow[key]?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </div>)}
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">Use at least 8 characters. After changing it, other active sessions for this admin account will be signed out.</div>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="outline" disabled={passwordBusy} onClick={()=>setPasswordModalOpen(false)}>Cancel</Btn><Btn type="submit" disabled={passwordBusy}>{passwordBusy?<RefreshCw size={14} className="animate-spin"/>:<Check size={14}/>} {passwordBusy?'Changing…':'Change Password'}</Btn></div>
        </form>
      </div>
    </div>}
    <Panel title="Master Settings" className="space-y-6">
      <div><h4 className="font-semibold text-gray-800 mb-1">1. Vegetable / Item Master</h4><p className="text-xs text-gray-500 mb-3">Control English name, Hindi name and optional specifications. These names power suggestions everywhere.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2"><input className={inputCls} placeholder="English name" value={item.nameEn} onChange={e=>setItem({...item,nameEn:e.target.value})}/><input className={inputCls} placeholder="Hindi name" value={item.nameHi} onChange={e=>setItem({...item,nameHi:e.target.value})}/><input className={inputCls} placeholder="Specifications, comma separated" value={item.specifications} onChange={e=>setItem({...item,specifications:e.target.value})}/></div><Btn className="mt-2" onClick={addItem}><Plus size={14}/> Add / Update Item</Btn><div className="mt-4 divide-y border rounded-xl">{masterItems.map(i=><div key={i.id} className="p-3 flex items-center justify-between gap-3"><div><b className="text-sm">{i.nameEn}</b>{i.nameHi&&<span className="text-sm text-gray-400 ml-2">{i.nameHi}</span>}{i.active===false&&<span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}<div className="text-xs text-gray-400 mt-1">{i.specifications?.length?i.specifications.map(x=>x.name).join(" · "):"No specifications yet"}</div></div><div className="flex items-center gap-2"><Btn variant="outline" onClick={()=>addSpec(i.id)}>+ Specification</Btn>{i.active===false?<Btn variant="outline" onClick={()=>activateItem(i.id)}>Activate</Btn>:<Btn variant="outline" onClick={()=>deactivateItem(i.id,i.nameEn)}>Deactivate</Btn>}<button type="button" disabled={i.hasHistory} onClick={()=>deleteItem(i.id,i.nameEn)} className={`p-2 ${i.hasHistory ? "text-gray-200 cursor-not-allowed" : "text-gray-300 hover:text-red-600"}`} title={i.hasHistory ? "Cannot permanently delete an item with transaction history. Deactivate it instead." : "Permanently delete item"}><Trash2 size={16}/></button></div></div>)}</div></div>
      <div><h4 className="font-semibold text-gray-800 mb-1">2. Quantity Unit Master</h4><p className="text-xs text-gray-500 mb-3">All stock is stored internally in Kg. This master controls conversion.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2"><input className={inputCls} placeholder="Unit name" value={unit.name} onChange={e=>setUnit({...unit,name:e.target.value})}/><input className={inputCls} placeholder="Symbol" value={unit.symbol} onChange={e=>setUnit({...unit,symbol:e.target.value})}/><input type="number" min="0" step="0.001" className={inputCls} placeholder="1 unit = ? Kg" value={unit.kgMultiplier} onChange={e=>setUnit({...unit,kgMultiplier:e.target.value})}/></div><Btn className="mt-2" onClick={addUnit}><Plus size={14}/> Add / Update Unit</Btn><div className="flex flex-wrap gap-2 mt-3">{(masters?.units||[]).map(u=><span key={u.id} className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">1 {u.symbol} = {u.kgMultiplier} Kg</span>)}</div></div>
      <div><h4 className="font-semibold text-gray-800 mb-1">3. Vendor / Supplier Master</h4><div className="flex flex-wrap gap-2"><input className={inputCls+" !w-64"} placeholder="Vendor / Mandi name" value={vendor.name} onChange={e=>setVendor({...vendor,name:e.target.value})}/><select className={inputCls+" !w-auto"} value={vendor.type} onChange={e=>setVendor({...vendor,type:e.target.value})}><option>Mandi</option><option>Local</option><option>Both</option></select><Btn onClick={addVendor}><Plus size={14}/> Add Vendor</Btn></div><div className="flex flex-wrap gap-2 mt-3">{(masters?.vendors||[]).map(v=><span key={v.id} className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">{v.name} · {v.type}</span>)}</div></div>
      <div><h4 className="font-semibold text-gray-800 mb-1">4. Expense Category Master</h4><div className="flex gap-2"><input className={inputCls+" !max-w-sm"} placeholder="e.g. Fuel" value={expenseCat} onChange={e=>setExpenseCat(e.target.value)}/><Btn onClick={addExpense}><Plus size={14}/> Add Category</Btn></div><div className="flex flex-wrap gap-2 mt-3">{(masters?.expenseCategories||[]).map(c=><span key={c.id} className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">{c.name}</span>)}</div></div>
      <div><h4 className="font-semibold text-gray-800 mb-1">5. Business Rules</h4><div className="max-w-md mb-3"><Field label="Low Stock Alert Threshold (Kg)"><input type="number" min="0" step="0.001" className={inputCls} value={lowStockThreshold} onChange={e=>setLowStockThreshold(e.target.value)} /><p className="text-xs text-gray-400 mt-1">Notifications alert when current stock is at or below this amount.</p></Field></div><p className="text-xs text-gray-500">Quantity conversion, item naming, vendor lists, expense categories and low-stock threshold are controlled above. Transaction totals remain database-driven; no hardcoded quantities or prices are used.</p></div>
    </Panel>
  </div>;
}

/* ---------------------------------------------------------------
   BACKUP / EXPORT PAGE
--------------------------------------------------------------- */

function BackupPage({ data }) {
  const [lastBackup, setLastBackup] = useState("Not backed up this session");

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sabzisetu-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackup(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  };

  const downloadCsv = (rows, name) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).filter((k) => k !== "id");
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <Panel title="Full Backup">
        <p className="text-sm text-gray-500 mb-3">Last backup: <span className="text-gray-700">{lastBackup}</span></p>
        <Btn onClick={download}><Download size={15} /> Download Full Backup (JSON)</Btn>
      </Panel>

      <Panel title="Export Individual Sheets (CSV)">
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={() => downloadCsv(data.mandiPurchases, "mandi-purchases")}>Mandi Purchases</Btn>
          <Btn variant="outline" onClick={() => downloadCsv(data.localPurchases, "local-purchases")}>Local Purchases</Btn>
          <Btn variant="outline" onClick={() => downloadCsv(data.stock, "stock")}>Stock</Btn>
          <Btn variant="outline" onClick={() => downloadCsv(data.sales, "sales")}>Sales</Btn>
          <Btn variant="outline" onClick={() => downloadCsv(data.customers, "customers")}>Customers</Btn>
          <Btn variant="outline" onClick={() => downloadCsv(data.expenses, "expenses")}>Expenses</Btn>
          <Btn variant="outline" onClick={() => downloadCsv(data.labour, "labour")}>Labour</Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------
   ROOT APP
--------------------------------------------------------------- */

const EMPTY_BUSINESS = { name: "SabziSetu", owner: "Owner", tagline: "Smart Trading, Higher Earning", currency: "₹" };

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError("Enter your username and password."); return; }
    try {
      setBusy(true); setError("");
      const result = await api.login(username, password);
      localStorage.setItem("sabzisetu-admin-token", result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err?.message?.includes("Invalid username") ? "Invalid username or password." : String(err.message || "Unable to sign in."));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] bg-white rounded-[28px] shadow-2xl overflow-hidden border border-white/20">
        <div className="hidden lg:flex relative p-10 xl:p-14 text-white flex-col justify-between overflow-hidden bg-emerald-950">
          <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-emerald-800/60" />
          <div className="absolute -left-28 -bottom-28 w-80 h-80 rounded-full bg-green-700/30" />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-lg mb-7"><ShoppingBasket size={24}/></div>
            <p className="text-xs uppercase tracking-[.2em] text-emerald-300 font-semibold mb-3">SabziSetu Admin</p>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">Run your trading<br/>business with clarity.</h1>
            <p className="mt-5 max-w-md text-emerald-200 leading-7">A clean command centre for purchases, inventory, sales, payments, customers and daily operations.</p>
          </div>
          <div className="relative flex items-center gap-3 text-sm text-emerald-300"><span className="w-2 h-2 rounded-full bg-green-400"/> Secure admin access <span className="text-emerald-700">•</span> India time</div>
        </div>

        <div className="p-7 sm:p-10 xl:p-14 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-9">
            <div className="w-11 h-11 rounded-2xl bg-emerald-800 text-white flex items-center justify-center"><ShoppingBasket size={21}/></div>
            <div><p className="font-bold text-gray-900 text-lg">SabziSetu</p><p className="text-xs text-gray-500">Admin Portal</p></div>
          </div>
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-700 mb-2">Welcome back</p>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mt-2">Use your administrator credentials to continue.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Users size={17}/></span><input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} className={`${inputCls} pl-10 h-12 rounded-xl`} placeholder="Admin username"/></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><LockKeyhole size={17}/></span><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className={`${inputCls} pl-10 pr-11 h-12 rounded-xl`} placeholder="Your password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            </div>
            {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button disabled={busy} className="w-full h-12 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold shadow-lg shadow-emerald-900/10 transition flex items-center justify-center gap-2">
              {busy ? <RefreshCw size={17} className="animate-spin"/> : <LockKeyhole size={17}/>} {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="mt-7 pt-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400"><span>SabziSetu Admin</span><span>Protected session</span></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [authStatus, setAuthStatus] = useState("checking"); // checking | authenticated | logged_out
  const [adminUser, setAdminUser] = useState(null);
  const [language, setLanguageState] = useState(() => localStorage.getItem("sabzisetu-language") || "en");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const [business, setBusiness] = useState(EMPTY_BUSINESS);
  const [mandiPurchases, setMandiPurchases] = useState([]);
  const [localPurchases, setLocalPurchases] = useState([]);
  const [stock, setStock] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [labour, setLabour] = useState([]);
  const [whatsappBills, setWhatsappBills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [summary, setSummary] = useState({ collected_today: 0 });
  const [masters, setMasters] = useState({items:[],units:[],vendors:[],expenseCategories:[]});

  const loadAll = () => {
    setStatus("loading");
    Promise.all([
      api.getSettings(),
      api.getMasters(),
      api.list("mandi-purchases"),
      api.list("local-purchases"),
      api.list("stock"),
      api.list("sales"),
      api.list("customers"),
      api.listPayments(),
      api.list("expenses"),
      api.list("labour"),
      api.list("whatsapp-bills"),
      api.list("notifications"),
      api.getTrend(),
      api.getSummary(),
    ])
      .then(([biz, masterData, mandi, local, stk, sls, custs, pays, exp, lab, wa, notifs, trend, sum]) => {
        setBusiness(biz);
        setMasters(masterData);
        setMandiPurchases(mandi);
        setLocalPurchases(local);
        setStock(stk);
        setSales(sls);
        setCustomers(custs);
        setPayments(pays);
        setExpenses(exp);
        setLabour(lab);
        setWhatsappBills(wa);
        setNotifications(notifs);
        setSalesTrend(trend);
        setSummary(sum);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  };

  const setLanguage = (next) => {
    setLanguageState(next);
    localStorage.setItem("sabzisetu-language", next);
  };

  const logout = async () => {
    try { if (localStorage.getItem("sabzisetu-admin-token")) await api.logout(); } catch (_) {}
    localStorage.removeItem("sabzisetu-admin-token");
    setAdminUser(null); setAuthStatus("logged_out"); setStatus("loading");
  };

  const handleLogin = (user) => { setAdminUser(user); setAuthStatus("authenticated"); };

  useEffect(() => {
    const expired = () => {
      localStorage.removeItem("sabzisetu-admin-token");
      setAdminUser(null); setAuthStatus("logged_out");
    };
    window.addEventListener("sabzisetu-auth-expired", expired);
    return () => window.removeEventListener("sabzisetu-auth-expired", expired);
  }, []);

  useEffect(() => {
    if (authStatus !== "checking") return;
    if (!localStorage.getItem("sabzisetu-admin-token")) { setAuthStatus("logged_out"); return; }
    api.me().then(({ user }) => { setAdminUser(user); setAuthStatus("authenticated"); }).catch(() => {
      localStorage.removeItem("sabzisetu-admin-token"); setAuthStatus("logged_out");
    });
  }, [authStatus]);

  useEffect(() => {
    const run = () => applyUiLanguage(language);
    run();
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; run(); });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => { if (authStatus === "authenticated") loadAll(); }, [authStatus]);

  const data = {
    business, masters, mandiPurchases, localPurchases, stock, sales, customers,
    expenses, labour, whatsappBills, notifications, payments, salesTrend, summary,
  };

  if (authStatus === "checking") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><RefreshCw className="animate-spin mx-auto mb-3 text-green-700" size={28}/><p className="text-sm text-gray-500">Checking secure session…</p></div></div>;
  }
  if (authStatus === "logged_out") return <LoginPage onLogin={handleLogin} />;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-3 text-green-700" size={28} />
          <p className="text-gray-500 text-sm">Loading data from the database…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center">
          <p className="font-semibold text-gray-800 mb-2">Couldn't reach the API</p>
          <p className="text-sm text-gray-500 mb-4">
            Make sure the backend server is running (<code className="bg-gray-100 px-1 rounded">npm run server</code>)
            and that <code className="bg-gray-100 px-1 rounded">server/.env</code> has a working <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code>.
          </p>
          <p className="text-xs text-red-500 mb-4 break-words">{errorMsg}</p>
          <Btn onClick={loadAll} className="justify-center w-full"><RefreshCw size={14} /> Retry</Btn>
        </div>
      </div>
    );
  }

  let content;
  switch (page) {
    case "dashboard": content = <DashboardPage data={data} />; break;
    case "mandi": content = <PurchasePage title="Mandi Purchase" resource="mandi-purchases" vendorLabel="Mandi" rows={mandiPurchases} setRows={setMandiPurchases} refresh={loadAll} masters={masters} />; break;
    case "local": content = <PurchasePage title="Local Purchase" resource="local-purchases" vendorLabel="Vendor/Farmer" rows={localPurchases} setRows={setLocalPurchases} refresh={loadAll} masters={masters} />; break;
    case "stock": content = <StockPage stock={stock} setStock={setStock} refresh={loadAll} masters={masters} />; break;
    case "sales": content = <SalesPage sales={sales} setSales={setSales} customers={customers} payments={payments} setCustomers={setCustomers} refresh={loadAll} masters={masters} stock={stock} mandiPurchases={mandiPurchases} localPurchases={localPurchases} />; break;
    case "customers": content = <CustomersPage customers={customers} setCustomers={setCustomers} refresh={loadAll} />; break;
    case "payments": content = <PaymentsPage customers={customers} payments={payments} sales={sales} refresh={loadAll} collectedToday={summary?.collected_today ?? 0} business={business} language={language} masters={masters} />; break;
    case "expenses": content = <ExpensesPage expenses={expenses} setExpenses={setExpenses} refresh={loadAll} masters={masters} />; break;
    case "labour": content = <LabourPage labour={labour} setLabour={setLabour} refresh={loadAll} />; break;
    case "reports": content = <ReportsPage data={data} />; break;
    case "whatsapp": content = <WhatsAppPage bills={whatsappBills} setBills={setWhatsappBills} business={business} refresh={loadAll} />; break;
    case "notifications": content = <NotificationsPage notifications={notifications} setNotifications={setNotifications} data={data} refresh={loadAll} />; break;
    case "settings": content = <SettingsPage business={business} setBusiness={setBusiness} masters={masters} stock={stock} mandiPurchases={mandiPurchases} localPurchases={localPurchases} sales={sales} refreshMasters={async()=>setMasters(await api.getMasters())} />; break;
    case "backup": content = <BackupPage data={data} />; break;
    default: content = null;
  }

  return (
    <LanguageContext.Provider value={language}>
    <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden">
      <div className="flex min-h-screen">
        <Sidebar page={page} setPage={setPage} business={business} mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} user={adminUser} onLogout={logout} />
        <main className="flex-1 min-w-0 md:ml-64 p-3 sm:p-4 md:p-6 max-w-[1400px]">
          <Topbar page={page} setPage={setPage} business={business} notifications={notifications} setNotifications={setNotifications} data={data} onMenu={() => setMobileNavOpen(true)} language={language} setLanguage={setLanguage} />
          {content}
        </main>
      </div>
      <AppDialogHost />
    </div>
    </LanguageContext.Provider>
  );
}


