# Final Scripts - Based on CUN 2025 Monthly Transfer Request Template

## Overview
I've analyzed your existing "Copy of CUN 2025 Monthly Transfer Request" Google Sheet and created scripts that match its exact structure and workflow.

## What I Found in Your Template

### Sheet Structure:
1. **Setup Tab**
   - Site: CUN
   - Year: 2025
   - Currency: MXN
   - Local account names (Bancrea, Local account 2, Local account 3)
   - Exchange rate tracking (Cell C53)
   - Rate date (Cell C54)
   - Non-budget expense categories list

2. **Request: Budget Tab**
   - Programs dropdown (Strong Families Cancun, Hope Program Cancun, etc.)
   - Line item descriptions
   - Account columns (Local account 1 USD, Local account 2 USD, Local account 3 USD, PNC USD, Payments to others USD)
   - Total USD and Total MXN calculations

3. **Request: Non-budget Tab**
   - Similar structure for non-budget items
   - Categories from Setup sheet

4. **Summary Tab**
   - Shows "Last Logged Month" in cell G3
   - Summary by program and category
   - Monthly columns (July highlighted in your screenshot)
   - Request by account breakdown
   - Budget over/under calculations

5. **Other Tabs**
   - Site resources
   - Salary transfers
   - Full budget
   - Transfer budget

## Scripts Created to Match This Structure

### ✅ FINAL Script - Part 1 - Foundation.gs

**Key Changes from Previous Version:**
- **Setup-based configuration** instead of Config sheet
  - Reads from Setup sheet cells (C14-C19, C53-C54)
  - Exchange rate from Setup!C53
  - Site, year, currency from Setup sheet

- **Account types** matching your template:
  - Local account 1 USD
  - Local account 2 USD
  - Local account 3 USD
  - PNC USD
  - Payments to others USD

- **Non-budget categories** from your Setup sheet:
  - Mission Trips: Food
  - Mission Trips: Projects
  - Mission Trips
  - Projects & Improvements
  - Ministry Partnerships
  - Mission Trips Tools
  - Mission Trip Transportation
  - Van
  - Child Sponsorship Gifts
  - Mission Trips Hotel
  - Accounting
  - Burress Donations All Programs

- **Sheet names** matching your template:
  - Setup
  - Request: Budget
  - Request: Non-budget
  - Site resources
  - Salary transfers
  - Full budget
  - Transfer budget
  - Summary Budget Requests by Category: Chosen Month

- **Programs** (same 6 programs):
  - Strong Families Cancun
  - Hope Program Cancun
  - Reggio Emilia
  - Transition Program Cancun
  - All Programs Cancun
  - International Operations

### ✅ FINAL Script - Part 2 - Budget Requests.gs

**Functions:**
1. **createBudgetRequest()** - Guides user to Request: Budget sheet
2. **createNonBudgetRequest()** - Guides user to Request: Non-budget sheet
3. **submitTransferRequest()** - Logs requests and updates summary
4. **logBudgetRequests()** - Logs budget items with all account columns
5. **logNonBudgetRequests()** - Logs non-budget items
6. **updateMonthlySummary()** - Updates "Last Logged Month" in Summary sheet (G3)

**Log Structure:**
- Request ID (generated)
- Timestamp
- Submitted By
- Site (from Setup)
- Year (from Setup)
- Month
- Type (Budget or Non-Budget)
- Program/Category
- Line Item Description
- Category
- Local Account 1 USD
- Local Account 2 USD
- Local Account 3 USD
- PNC USD
- Payments to Others USD
- Total USD
- Total MXN
- Exchange Rate (from Setup!C53)
- Status (Requested/Disbursed)
- Finance Notes
- Disbursement Date
- Reference Number

### ✅ FINAL Script - Part 3 - Finance and Reporting.gs

**Functions:**
1. **recordUSDDisbursement()** - Finance updates status and details
2. **viewPendingRequests()** - Shows all requests with Status = "Requested"
3. **generateMonthlySummary()** - Monthly breakdown by program and account
4. **generateYTDReport()** - Year-to-date totals by program and month
5. **generateTransferRequestReport()** - Formatted transfer request for Finance
6. **generateBudgetVsActual()** - Compares budget to actual disbursements

## Menu Structure

```
Budget Management
├── 📊 Budget Request
│   ├── Create Budget Request
│   ├── Create Non-Budget Request
│   └── Submit Request
│
├── 💵 Finance
│   ├── Record USD Disbursement
│   └── View Pending Requests
│
├── 📈 Reports
│   ├── Monthly Summary
│   ├── YTD Summary
│   ├── Transfer Request Report
│   └── Budget vs Actual
│
└── ⚙️ Admin
    ├── Update Exchange Rate
    ├── Refresh Calculations
    ├── Validate Data
    └── Open Script
```

## How It Works with Your Template

### Workflow:

1. **Setup** (One-time)
   - Setup sheet already configured with site, year, currency, accounts
   - Exchange rate in C53
   - Programs and categories defined

2. **Create Request**
   - User clicks "Create Budget Request" or "Create Non-Budget Request"
   - Goes to appropriate Request sheet
   - Enters line items and amounts in account columns
   - Formulas calculate USD and MXN totals

3. **Submit Request**
   - User clicks "Submit Request"
   - System logs all items to Log: Transfer Requests sheet
   - Updates "Last Logged Month" in Summary sheet (G3)
   - Clears Request sheets for next month

4. **Finance Processing**
   - Finance clicks "View Pending Requests" to see what needs processing
   - Goes to Log sheet
   - Updates Status to "Disbursed"
   - Adds disbursement date and reference number

5. **Reporting**
   - Monthly Summary: Breakdown by program and account
   - YTD Summary: Year-to-date totals
   - Transfer Request Report: Formatted for Finance Department
   - Budget vs Actual: Compare planned to actual

## Key Differences from Previous Scripts

| Feature | Previous Scripts | New FINAL Scripts |
|---------|-----------------|-------------------|
| **Configuration** | Config sheet | Setup sheet (matches your template) |
| **Exchange Rate** | Config!B2-B5 | Setup!C53 |
| **Site Info** | Hardcoded | Setup!C14-C16 |
| **Accounts** | Generic | 5 specific accounts matching template |
| **Budget Types** | Local Income, US Transfer, IN/OUT | Budget and Non-Budget |
| **Sheet Names** | Generic | Exact match to your template |
| **Summary** | Separate YTD sheet | Updates existing Summary sheet |
| **Non-Budget** | IN/OUT Budget | Request: Non-budget with categories |

## Installation

### Option 1: Add to Existing Template
1. Open your "Copy of CUN 2025 Monthly Transfer Request" sheet
2. Extensions > Apps Script
3. Add 3 new script files:
   - Foundation
   - BudgetRequests
   - FinanceReporting
4. Paste the FINAL scripts
5. Save and refresh

### Option 2: Create Log Sheets
Your template needs these additional sheets for logging:
- **Log: Transfer Requests** (22 columns - see structure above)
- **Log: Disbursements** (optional, for Finance tracking)
- **Log: YTD Summary** (optional, for aggregated data)

## Testing Checklist

- [ ] Setup sheet has all required data
- [ ] Exchange rate in Setup!C53
- [ ] Programs match your 6 programs
- [ ] Request: Budget sheet exists
- [ ] Request: Non-budget sheet exists
- [ ] Summary sheet exists with G3 for "Last Logged Month"
- [ ] Create Log: Transfer Requests sheet
- [ ] Test: Create budget request
- [ ] Test: Submit request
- [ ] Test: View pending requests
- [ ] Test: Generate monthly summary

## Benefits of This Approach

✅ **Matches your existing workflow** - No need to change your template structure
✅ **Uses your Setup sheet** - All configuration in one place
✅ **Preserves your formulas** - Summary sheet formulas still work
✅ **Adds automation** - Logging and reporting without manual work
✅ **Finance-friendly** - Clear pending requests and disbursement tracking
✅ **Audit trail** - Complete log of all requests with timestamps

## Next Steps

1. ✅ Review the 3 FINAL script files
2. ⏳ Add Log: Transfer Requests sheet to your template
3. ⏳ Install scripts in your template
4. ⏳ Test with sample data
5. ⏳ Train users on new menu functions

---

**Version:** 2.2 (Final - Based on CUN Template)  
**Date:** November 25, 2025  
**Status:** ✅ Ready for Installation
