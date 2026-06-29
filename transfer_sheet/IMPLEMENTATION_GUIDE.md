# Multi-Currency Budget Management System - Implementation Guide

## Overview
This is a complete revamp of the budget management system to support multiple sites with different currencies, itemized tracking, and comprehensive logging with budget vs actual analysis.

## Files Created

### Backup
- **App Script for review - BACKUP [date]** - Original script preserved

### New Script Files (5 Parts)
1. **New Script - Part 1 - Foundation.gs** - Core configuration, menu, currency functions
2. **New Script - Part 2 - Local Income Budget.gs** - Local income budget management
3. **New Script - Part 3 - US Transfer Budget.gs** - US transfer request management
4. **New Script - Part 4 - IN OUT Budget.gs** - IN/OUT budget tracking
5. **New Script - Part 5 - YTD and Reporting.gs** - YTD summaries and reports

## Implementation Steps

### Step 1: Create Required Sheets

Create the following sheets in your Google Spreadsheet:

#### A. Config Sheet
**Purpose:** Store exchange rates and configuration

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Site | Exchange Rate | Currency | Last Updated |
| Mexico | 17.0 | MXN | |
| Nigeria | 1580.0 | NGN | |
| India | 83.0 | INR | |
| USA | 1.0 | USD | |

**Headers in Row 1:**
- A1: Site
- B1: Exchange Rate
- C1: Currency
- D1: Last Updated

#### B. Budget Planning: Local Income
**Purpose:** Plan how sites will spend locally-generated funds

**Columns (Row 5 headers):**
- A: ID
- B: Site (dropdown: Mexico, Nigeria, India, USA, Haiti, Dominican Republic)
- C: Program
- D: Item Description
- E: Category
- F: Month/Period
- G: Exchange Rate (formula: pulls from Config)
- H: Notes
- I: [blank]
- J: Amount (Local Currency)
- K: USD Equivalent (formula)
- L: Status

**Data starts at Row 6**

#### C. Budget Planning: US Transfer
**Purpose:** Plan how sites will spend US CORP transfers

**Same column structure as Local Income Budget**

#### D. IN/OUT Budget
**Purpose:** Track income and expenses outside regular budget

**Columns (Row 5 headers):**
- A: ID
- B: Type (dropdown: IN, OUT)
- C: Site
- D: Program
- E: Item Description
- F: Category
- G: Month/Period
- H: Exchange Rate
- I: Notes
- J: [blank]
- K: Amount (Local Currency)
- L: USD Equivalent (formula)
- M: Status
- N: Signed Amount (formula: positive for IN, negative for OUT)

#### E. Program Summary
**Purpose:** Consolidated view per program

**Columns:**
- A: Site
- B: Program
- C: Full Itemized Budget (Local)
- D: Local Projected Income
- E: Local Carry Over
- F: US Paid Expenses (USD)
- G: Transfer Needed (calculated)
- H: Currency

#### F. Log: Local Income Budget
**Purpose:** Historical log of local income budget items

**Columns (Row 5 headers):**
- A: Log ID
- B: Timestamp
- C: Logged By
- D: Site
- E: Program
- F: Item Description
- G: Category
- H: Month/Period
- I: Budgeted Amount (Local Currency)
- J: Local Currency Code
- K: Actual Amount Received
- L: Variance (Local)
- M: Exchange Rate at Budget
- N: Exchange Rate at Actual
- O: Budgeted USD Equivalent
- P: Actual USD Equivalent
- Q: USD Variance
- R: Status
- S: Notes

#### G. Log: US Transfer Budget
**Purpose:** Track US transfer requests and disbursements

**Columns (Row 5 headers):**
- A: Log ID
- B: Timestamp
- C: Logged By
- D: Site
- E: Program
- F: Item Description
- G: Category
- H: Month/Period
- I: Requested Amount (Local Currency)
- J: Local Currency Code
- K: Requested USD Equivalent
- L: Exchange Rate at Request
- M: Actual USD Sent (Finance enters)
- N: Exchange Rate at Transfer
- O: Actual Local Currency Received (Site enters)
- P: USD Variance
- Q: Local Currency Variance
- R: Transfer Date
- S: Transfer Method
- T: Transfer Reference #
- U: Status
- V: Finance Notes
- W: Site Notes

#### H. Log: IN/OUT Budget
**Purpose:** Log of IN/OUT transactions

**Columns (Row 5 headers):**
- A: Log ID
- B: Timestamp
- C: Logged By
- D: Type (IN/OUT)
- E: Site
- F: Program
- G: Item Description
- H: Category
- I: Month/Period
- J: Budgeted Amount (Local Currency)
- K: Local Currency Code
- L: Actual Amount
- M: Variance (Local)
- N: Exchange Rate at Budget
- O: Exchange Rate at Actual
- P: Budgeted USD Equivalent
- Q: Actual USD Equivalent
- R: USD Variance
- S: Status
- T: Notes

#### I. Log: YTD Summary
**Purpose:** Year-to-date rollup by program and site

**Columns (Row 5 headers):**
- A: Year
- B: Site
- C: Program
- D: Local Currency Code
- E: YTD Budgeted Local Income (Local)
- F: YTD Budgeted US Transfer (Local)
- G: YTD Budgeted IN/OUT Net (Local)
- H: YTD Total Budget (Local)
- I: YTD Total Budget (USD)
- J: YTD Actual Local Income (Local)
- K: YTD Actual US Transfer (Local)
- L: YTD Actual IN/OUT Net (Local)
- M: YTD Total Actual (Local)
- N: YTD Total Actual (USD)
- O: YTD Variance (Local)
- P: YTD Variance (USD)
- Q: YTD USD Actually Spent by Finance
- R: YTD Local Currency Actually Sent
- S: Exchange Rate Impact
- T: Last Updated
- U: Updated By

### Step 2: Install the Script

1. Open your Google Spreadsheet
2. Go to **Extensions > Apps Script**
3. Delete any existing code
4. Copy and paste each of the 5 script files into the Apps Script editor:
   - Create a new file for each part (File > New > Script file)
   - Name them: Foundation, LocalIncome, USTransfer, InOut, YTDReporting
   - Paste the corresponding code
5. Save the project (Ctrl+S or Cmd+S)
6. Close the Apps Script editor

### Step 3: Initial Setup

1. **Refresh the spreadsheet** - Close and reopen it
2. You should see a new menu: **Budget Management**
3. Click **Budget Management > Admin > Update Rates**
4. Verify exchange rates in the Config sheet
5. Click **Budget Management > Admin > Validate Data**
6. Ensure all validation checks pass

### Step 4: Test the System

#### Test Local Income Budget:
1. Go to "Budget Planning: Local Income" sheet
2. Enter a test budget item:
   - Site: Mexico
   - Program: Test Program
   - Item: Test Item
   - Amount: 10000 (MXN)
3. Click **Budget Management > Local Income > Run Formulas**
4. Verify USD equivalent is calculated
5. Click **Budget Management > Local Income > Log Budget**
6. Check "Log: Local Income Budget" sheet for the logged item

#### Test US Transfer:
1. Go to "Budget Planning: US Transfer" sheet
2. Enter a test transfer request
3. Click **Budget Management > US Transfer > Run Formulas**
4. Click **Budget Management > US Transfer > Submit Request**
5. Check "Log: US Transfer Budget" sheet

#### Test YTD Summary:
1. Click **Budget Management > Reports > YTD Summary**
2. Check "Log: YTD Summary" sheet
3. Verify totals are calculated correctly

## User Workflows

### For Site Staff:

#### Creating Local Income Budget:
1. Open "Budget Planning: Local Income"
2. Enter budget items with local currency amounts
3. Run formulas to calculate USD equivalents
4. Submit for logging

#### Requesting US Transfer:
1. Open "Budget Planning: US Transfer"
2. Enter itemized transfer needs
3. Run formulas
4. Submit transfer request to Finance

#### Confirming Receipt:
1. Open "Log: US Transfer Budget"
2. Find transfers with Status = "Sent"
3. Enter actual local currency received
4. Update status to "Received"

### For Finance Department:

#### Recording Disbursements:
1. Open "Log: US Transfer Budget"
2. Find requests with Status = "Requested"
3. Enter actual USD sent
4. Enter transfer details (date, method, reference)
5. Update status to "Sent"

#### Viewing Reports:
1. Click **Budget Management > Reports > Finance Report**
2. Review pending requests
3. Check reconciliation status

### For Management:

#### Viewing YTD Performance:
1. Click **Budget Management > Reports > YTD Summary**
2. Review budget vs actual by program
3. Check exchange rate impact

#### Generating Transfer Requests:
1. Click **Budget Management > Reports > Transfer Request**
2. Enter site and month
3. Review itemized request report

## Key Features

### Multi-Currency Support
- Automatic currency conversion based on Config sheet
- Site-specific currency handling
- Exchange rate tracking at budget and actual

### Itemized Tracking
- Line-item detail for all budgets
- Program-level aggregation
- Category-based analysis

### Budget vs Actual
- Budgeted amounts logged with exchange rate
- Actual amounts entered as received
- Automatic variance calculation

### Finance Department Tracking
- USD actually spent tracking
- Transfer method and reference recording
- Reconciliation with site receipts

### YTD Analysis
- Cumulative totals by program
- Budget vs actual comparison
- Exchange rate impact analysis

## Troubleshooting

### Exchange Rate Errors
- Verify Config sheet has all sites listed
- Check exchange rates are positive numbers
- Update rates using Admin menu

### Formula Errors
- Ensure all required sheets exist
- Check column headers match exactly
- Run "Validate Data" from Admin menu

### Logging Issues
- Verify data starts at Row 6
- Check Site column is not empty
- Ensure formulas have been run first

## Support

For questions or issues:
1. Check this implementation guide
2. Review the inline comments in the script
3. Use the Validate Data function to check setup
4. Contact your system administrator

## Version History

- **Version 2.0** (2025-11-24): Complete revamp with multi-currency support
- **Version 1.0**: Original budget management system (backed up)
