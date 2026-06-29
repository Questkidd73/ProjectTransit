# Testing Guide - Multi-Currency Budget System

## Overview
This guide will walk you through testing the updated budget management system with the critical changes implemented.

## Pre-Testing Setup

### 1. Create Test Google Spreadsheet
1. Create a new Google Spreadsheet
2. Name it: "Budget Management System - TEST"

### 2. Install Updated Scripts
Copy these 5 files into Apps Script editor:
- ✅ **UPDATED Script - Part 1 - Foundation.gs**
- ✅ **New Script - Part 2 - Local Income Budget.gs** (no changes needed)
- ✅ **New Script - Part 3 - US Transfer Budget.gs** (no changes needed)
- ✅ **UPDATED Script - Part 4 - IN OUT Budget.gs**
- ✅ **UPDATED Script - Part 5 - YTD and Reporting.gs**

### 3. Create Required Sheets

#### Sheet 1: Config
```
A1: Site          B1: Exchange Rate    C1: Currency    D1: Last Updated
A2: Mexico        B2: 17.0             C2: MXN
A3: Nigeria       B3: 1580.0           C3: NGN
A4: India         B4: 83.0             C4: INR
A5: USA           B5: 1.0              C5: USD
```

#### Sheet 2: Budget Planning: Local Income
**Headers (Row 5):**
```
A5: ID
B5: Site
C5: Program
D5: Item Description
E5: Category
F5: Month/Period
G5: Exchange Rate
H5: Notes
I5: [blank]
J5: Amount (Local Currency)
K5: USD Equivalent
L5: Status
```

#### Sheet 3: Budget Planning: US Transfer
Same structure as Local Income

#### Sheet 4: IN/OUT Budget
**Headers (Row 5):**
```
A5: ID
B5: Type
C5: Site
D5: Program
E5: Item Description
F5: Category
G5: Month/Period
H5: Exchange Rate
I5: Notes
J5: [blank]
K5: Amount (USD)
L5: Local Currency Equivalent
M5: Status
N5: Signed Amount
```

#### Sheet 5: Log: Local Income Budget
**Headers (Row 5):**
```
A5: Log ID
B5: Timestamp
C5: Logged By
D5: Site
E5: Program
F5: Item Description
G5: Category
H5: Month/Period
I5: Budgeted Amount (Local)
J5: Local Currency Code
K5: Actual Amount Received
L5: Variance (Local)
M5: Exchange Rate at Budget
N5: Exchange Rate at Actual
O5: Budgeted USD Equivalent
P5: Actual USD Equivalent
Q5: USD Variance
R5: Status
S5: Notes
```

#### Sheet 6: Log: US Transfer Budget
**Headers (Row 5):**
```
A5: Log ID
B5: Timestamp
C5: Logged By
D5: Site
E5: Program
F5: Item Description
G5: Category
H5: Month/Period
I5: Requested Amount (Local)
J5: Local Currency Code
K5: Requested USD Equivalent
L5: Exchange Rate at Request
M5: Actual USD Sent
N5: Exchange Rate at Transfer
O5: Actual Local Currency Received
P5: USD Variance
Q5: Local Currency Variance
R5: Transfer Date
S5: Transfer Method
T5: Transfer Reference #
U5: Status
V5: Finance Notes
W5: Site Notes
```

#### Sheet 7: Log: IN/OUT Budget
**Headers (Row 5):**
```
A5: Log ID
B5: Timestamp
C5: Logged By
D5: Type
E5: Site
F5: Program
G5: Item Description
H5: Category
I5: Month/Period
J5: Budgeted Amount (USD)
K5: Currency Code (USD)
L5: Budgeted Local Currency Equivalent
M5: Local Currency Code
N5: Actual USD Amount
O5: Actual Local Currency Sent
P5: Variance (USD)
Q5: Variance (Local)
R5: Exchange Rate at Budget
S5: Exchange Rate at Actual
T5: Status
U5: Notes
```

#### Sheet 8: Log: YTD Summary
**Headers (Row 5):**
```
A5: Year
B5: Site
C5: Program
D5: Local Currency Code
E5: YTD Budgeted Local Income (Local)
F5: YTD Budgeted US Transfer (Local)
G5: YTD Budgeted IN/OUT Net (Local)
H5: YTD Total Budget (Local)
I5: YTD Total Budget (USD)
J5: YTD Actual Local Income (Local)
K5: YTD Actual US Transfer (Local)
L5: YTD Actual IN/OUT Net (Local)
M5: YTD Total Actual (Local)
N5: YTD Total Actual (USD)
O5: YTD Variance (Local)
P5: YTD Variance (USD)
Q5: YTD USD Actually Spent by Finance
R5: YTD Local Currency Actually Sent
S5: Exchange Rate Impact
T5: Last Updated
U5: Updated By
```

#### Sheet 9: Program Summary
**Headers (Row 5):**
```
A5: Site
B5: Program
C5: Full Itemized Budget (Local)
D5: Local Projected Income
E5: Local Carry Over
F5: US Paid Expenses (USD)
G5: Transfer Needed
H5: Currency
```

## Test Cases

### TEST 1: System Validation ✅

**Steps:**
1. Close and reopen spreadsheet
2. Verify "Budget Management" menu appears
3. Click **Budget Management > Admin > Validate Data**

**Expected Result:**
```
✅ All checks passed!
Sites: 6
Programs: 6
Sheets: 11
```

---

### TEST 2: IN/OUT Budget - USD Only (CRITICAL) ✅

**Purpose:** Verify IN/OUT is USD-based with full local currency equivalent

**Test Data:**
Go to "IN/OUT Budget" sheet, Row 6:
```
B6: IN
C6: Mexico
D6: Strong Families Cancun
E6: Donation from John Smith
F6: Donations
G6: November 2025
K6: 100
```

**Steps:**
1. Click **Budget Management > IN/OUT (USD Only) > Run Formulas**
2. Check Column L (should show 1,700 MXN = 100 * 17.0)
3. Check Column M (should show "Pending")
4. Check Column N (should show 100)

**Expected Results:**
- L6: 1700 (Local Currency Equivalent)
- M6: Pending
- N6: 100 (Signed Amount)

**Verification:**
✅ Site receives FULL 1,700 MXN (no exchange rate deduction)
✅ Formula: USD * Exchange Rate (not USD / Exchange Rate)

---

### TEST 3: Programs List ✅

**Steps:**
1. Go to any budget planning sheet
2. Click on Program column (Column C)
3. Create dropdown with these values:
   - Strong Families Cancun
   - Hope Program Cancun
   - Reggio Emilia
   - Transition Program Cancun
   - All Programs Cancun
   - International Operations

**Expected Result:**
✅ All 6 programs available in dropdown

---

### TEST 4: Local Income Budget ✅

**Test Data:**
Go to "Budget Planning: Local Income" sheet, Row 6:
```
B6: Mexico
C6: Strong Families Cancun
D6: Local Fundraiser Event
E6: Fundraising
F6: November 2025
J6: 50000
```

**Steps:**
1. Click **Budget Management > Local Income > Run Formulas**
2. Check K6 (USD Equivalent)
3. Click **Budget Management > Local Income > Log Budget**
4. Check "Log: Local Income Budget" sheet

**Expected Results:**
- K6: ≈ 2941.18 (50000 / 17.0)
- Log sheet has new entry with Log ID format: 2025-11-MEX-STRO-###

---

### TEST 5: US Transfer Request ✅

**Test Data:**
Go to "Budget Planning: US Transfer" sheet, Row 6:
```
B6: Mexico
C6: Hope Program Cancun
D6: Staff Salaries
E6: Personnel
F6: December 2025
J6: 85000
```

**Steps:**
1. Click **Budget Management > US Transfer > Run Formulas**
2. Check K6 (USD Equivalent)
3. Click **Budget Management > US Transfer > Submit Request**
4. Check "Log: US Transfer Budget" sheet

**Expected Results:**
- K6: 5000 (85000 / 17.0)
- Log sheet has entry with Status = "Requested"

---

### TEST 6: Finance Records USD Disbursement ✅

**Steps:**
1. Go to "Log: US Transfer Budget" sheet
2. Find the row from TEST 5
3. Enter in that row:
   - M: 5000 (Actual USD Sent)
   - R: 2025-12-01 (Transfer Date)
   - S: Wire Transfer (Transfer Method)
   - T: WT-2025-1201-001 (Reference #)
   - U: Sent (Status)
   - V: Processed on time (Finance Notes)

**Expected Results:**
- Column N shows exchange rate (17.0)
- System calculates expected local currency

---

### TEST 7: Site Confirms Receipt ✅

**Steps:**
1. Same row as TEST 6
2. Enter:
   - O: 84500 (Actual Local Currency Received)
   - W: Received via bank transfer (Site Notes)
   - U: Received (Status)

**Expected Results:**
- Column P shows USD Variance: 0
- Column Q shows Local Variance: -500 (84500 - 85000)

---

### TEST 8: YTD Summary Update ✅

**Steps:**
1. Click **Budget Management > Reports > YTD Summary**
2. Check "Log: YTD Summary" sheet

**Expected Results:**
- Entries for Mexico - Strong Families Cancun
- Entries for Mexico - Hope Program Cancun
- Shows budgeted and actual amounts
- Shows variances

---

### TEST 9: Finance Report by Transfer Date ✅

**Steps:**
1. Click **Budget Management > Reports > Finance Report (by Transfer Date)**
2. Read the instructions

**Expected Message:**
```
Finance Report shows USD Actually Sent by Transfer Date:
1. All USD disbursements by site/program
2. Pending transfer requests
3. Reconciliation status
4. Total USD spent YTD

Check "Log: US Transfer Budget" sheet
Sort by Transfer Date (Column R) for chronological view.
```

**Manual Verification:**
1. Go to "Log: US Transfer Budget"
2. Click Column R header
3. Data > Sort sheet by column R, A→Z
4. Verify entries sorted by transfer date

---

### TEST 10: Site Report by Budget Month ✅

**Steps:**
1. Click **Budget Management > Reports > Site Report (by Budget Month)**
2. Read the instructions

**Expected Message:**
```
Site Report shows Local Currency Actually Sent by Program Budget Month:
1. Local Currency Actually Sent by Program Budget Month
2. Expected vs Actual local currency received
3. Exchange rate variances
4. Outstanding confirmations

Check "Log: US Transfer Budget" sheet
Group by Program (Column E) and Month/Period (Column H).
```

---

### TEST 11: Itemized Transfer Request (Line Items) ✅

**Steps:**
1. Click **Budget Management > Reports > Transfer Request (Line Items)**
2. Enter "Mexico" when prompted
3. Enter "December 2025" when prompted

**Expected Result:**
- Dialog shows itemized breakdown
- Groups by program
- Shows line items within each program
- Shows local currency and USD amounts
- Shows totals

---

### TEST 12: Program Budget Summary ✅

**Steps:**
1. Click **Budget Management > Reports > Program Budget Summary**
2. Enter "Mexico" when prompted

**Expected Result:**
- Dialog shows overall ministry budget
- Lists all 6 programs
- Shows totals for each program (not line items)
- Shows grand total

---

## Critical Verification Checklist

### IN/OUT Budget - USD Only
- [ ] Column K labeled "Amount (USD)"
- [ ] Column L labeled "Local Currency Equivalent"
- [ ] Formula in L: `=K * Exchange Rate` (NOT K / Exchange Rate)
- [ ] $100 USD → 1,700 MXN (full amount, no deduction)
- [ ] Menu shows "IN/OUT (USD Only)"

### Programs
- [ ] All 6 programs in PROGRAMS constant
- [ ] Programs available in dropdowns
- [ ] Program Budget Summary report works

### Finance Report
- [ ] Shows "USD Actually Sent by Transfer Date"
- [ ] Instructions mention sorting by Column R
- [ ] Column R is Transfer Date

### Site Report
- [ ] Shows "Local Currency Actually Sent by Program Budget Month"
- [ ] Instructions mention grouping by Program and Month
- [ ] Columns E (Program) and H (Month/Period) referenced

### Reports
- [ ] Transfer Request (Line Items) - detailed breakdown
- [ ] Program Budget Summary - overall ministry budget
- [ ] Both reports available in menu

## Test Results Template

```
TEST RESULTS - [Date]
Tester: [Name]

✅ TEST 1: System Validation - PASSED
✅ TEST 2: IN/OUT USD Only - PASSED
✅ TEST 3: Programs List - PASSED
✅ TEST 4: Local Income Budget - PASSED
✅ TEST 5: US Transfer Request - PASSED
✅ TEST 6: Finance Records USD - PASSED
✅ TEST 7: Site Confirms Receipt - PASSED
✅ TEST 8: YTD Summary - PASSED
✅ TEST 9: Finance Report - PASSED
✅ TEST 10: Site Report - PASSED
✅ TEST 11: Transfer Request (Line Items) - PASSED
✅ TEST 12: Program Budget Summary - PASSED

CRITICAL VERIFICATIONS:
✅ IN/OUT is USD-based with full local currency
✅ All 6 programs configured
✅ Finance report by transfer date
✅ Site report by budget month
✅ Two-level itemization (line items + program budget)

ISSUES FOUND:
[List any issues]

READY FOR PRODUCTION: YES / NO
```

## Next Steps After Testing

1. ✅ All tests pass
2. ✅ Critical verifications complete
3. ⏳ Deploy to production spreadsheet
4. ⏳ Train users
5. ⏳ Go live

---

**Version:** 2.1  
**Last Updated:** November 24, 2025  
**Status:** Ready for Testing
