# Critical Changes Required for Implementation

## Overview
The following changes must be made to the script files before implementation based on updated requirements.

## 1. IN/OUT Budget - USD Only (CRITICAL)

### Current Implementation
- IN/OUT budget uses local currency based on site
- Exchange rate applied like other budgets

### Required Change
**IN/OUT must ALWAYS be USD-based with NO exchange rate deduction**

### Why This Matters
When a USD gift is received, it should be sent to the site in the exact local currency equivalent without any exchange rate loss. 

**Example:**
- $100 USD gift received
- Exchange rate: 17.0 MXN/USD
- Site receives: 1,700 MXN (full amount, no deduction)

### Files to Update

#### Part 4 - IN OUT Budget.gs
**Function: `runInOutBudgetFormulas()`**
- Change Column L formula to NOT use exchange rate lookup
- IN/OUT amounts should be entered in USD
- Local currency equivalent calculated at full exchange rate (no deduction)

**Current:**
```javascript
var usdFormula = '=IF(AND(NOT(ISBLANK(C6)),NOT(ISBLANK(K6))),K6/VLOOKUP(C6,Config!$A$2:$B$6,2,FALSE),"")';
```

**Should be:**
```javascript
// IN/OUT is always USD-based
// Column K should be USD amount
// Column L should be local currency equivalent (K * exchange rate)
var localFormula = '=IF(AND(NOT(ISBLANK(C6)),NOT(ISBLANK(K6))),K6*VLOOKUP(C6,Config!$A$2:$B$6,2,FALSE),"")';
```

**Function: `logInOutTransaction()`**
- Update to reflect USD as primary currency
- Local currency as calculated field (not entered)

#### IMPLEMENTATION_GUIDE.md
**Section: D. IN/OUT Budget**
Update column structure:
- Column K: Amount (USD) ← Changed from "Local Currency"
- Column L: Local Currency Equivalent (formula) ← Changed from "USD Equivalent"

Add note:
```
IMPORTANT: IN/OUT Budget is ALWAYS USD-based. When a USD gift is received,
it is sent to the site in full local currency equivalent with no exchange
rate deduction. Enter amounts in Column K as USD.
```

## 2. Programs List

### Required Programs
Update SITE_CONFIG or create PROGRAMS constant:

```javascript
const PROGRAMS = [
  'Strong Families Cancun',
  'Hope Program Cancun',
  'Reggio Emilia',
  'Transition Program Cancun',
  'All Programs Cancun',
  'International Operations'
];
```

### Files to Update

#### Part 1 - Foundation.gs
Add PROGRAMS constant after SHEETS constant.

#### IMPLEMENTATION_GUIDE.md
Update all sheet structures to include Program dropdown with these exact values.

## 3. Finance Report - USD by Transfer Date

### Current Implementation
- Finance report shows "All USD disbursements"

### Required Change
**Report must show: "USD Actually Sent by Transfer Date"**

### Files to Update

#### Part 5 - YTD and Reporting.gs
**Function: `generateFinanceDeptReport()`**

Update to:
```javascript
function generateFinanceDeptReport() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Finance Department Report',
    'Finance Report shows:\n\n' +
    '1. USD Actually Sent by Transfer Date\n' +
    '2. Pending transfer requests\n' +
    '3. Reconciliation status\n' +
    '4. Total USD spent YTD\n\n' +
    'Check "' + SHEETS.LOG_US_TRANSFER + '" sheet\n' +
    'Sort by Transfer Date (Column R) for chronological view.',
    ui.ButtonSet.OK
  );
}
```

## 4. Site Report - Local Currency by Program Budget Month

### Current Implementation
- Site report shows "YTD Local Currency Received"

### Required Change
**Report must show: "Local Currency Actually Sent by Program Budget Month"**

### Files to Update

#### Part 5 - YTD and Reporting.gs
**Function: `generateSiteReconciliationReport()`**

Update to:
```javascript
function generateSiteReconciliationReport() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Site Reconciliation Report',
    'Site Reconciliation shows:\n\n' +
    '1. Local Currency Actually Sent by Program Budget Month\n' +
    '2. Expected vs Actual local currency received\n' +
    '3. Exchange rate variances\n' +
    '4. Outstanding confirmations\n\n' +
    'Check "' + SHEETS.LOG_US_TRANSFER + '" sheet\n' +
    'Group by Program (Column E) and Month/Period (Column H).',
    ui.ButtonSet.OK
  );
}
```

## 5. Itemized Reports - Two Levels

### Required
Two levels of itemization:
1. **Itemized by Line** - Detailed line items (already exists)
2. **Itemized by Program Budget** - Overall ministry budget (needs addition)

### Files to Update

#### Part 5 - YTD and Reporting.gs

**Add new function:**
```javascript
function generateProgramBudgetSummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  // Prompt for site
  var siteResponse = ui.prompt(
    'Program Budget Summary',
    'Enter site name:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (siteResponse.getSelectedButton() !== ui.Button.OK) return;
  var site = siteResponse.getResponseText();
  
  // Aggregate by program (not line item)
  // Show overall ministry budget
  // Group all line items into program totals
  
  var report = 'OVERALL MINISTRY BUDGET - ' + site + '\n';
  report += '='.repeat(70) + '\n\n';
  
  // Loop through PROGRAMS and sum all line items per program
  for (var i = 0; i < PROGRAMS.length; i++) {
    var program = PROGRAMS[i];
    var programTotal = calculateProgramTotal(site, program);
    report += program.padEnd(40) + formatCurrency(programTotal.local, programTotal.currency).padStart(15) + 
              '  $' + programTotal.usd.toFixed(2).padStart(10) + '\n';
  }
  
  // Display report
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;">' + report + '</pre>'
  ).setWidth(800).setHeight(600);
  
  ui.showModalDialog(htmlOutput, 'Program Budget Summary - ' + site);
}
```

**Update menu in Part 1 - Foundation.gs:**
```javascript
.addSubMenu(ui.createMenu("📈 Reports")
  .addItem("YTD Summary", "generateYTDReport")
  .addItem("Finance Report", "generateFinanceDeptReport")
  .addItem("Transfer Request (Line Items)", "generateItemizedTransferRequest")
  .addItem("Program Budget Summary", "generateProgramBudgetSummary"))
```

## Implementation Priority

### HIGH PRIORITY (Must fix before go-live)
1. ✅ IN/OUT Budget USD-only logic
2. ✅ Programs list constant
3. ✅ Finance report by transfer date
4. ✅ Site report by program budget month

### MEDIUM PRIORITY (Should add soon)
5. ⏳ Program Budget Summary report (itemized by program)

## Testing Checklist

After making changes:
- [ ] Test IN/OUT with USD gift → verify full local currency sent
- [ ] Verify all program dropdowns show correct 6 programs
- [ ] Test Finance report sorts by transfer date
- [ ] Test Site report groups by program and month
- [ ] Test both itemized reports (line items and program budget)

## Notes

### IN/OUT Budget Logic
The key difference is that IN/OUT represents funds that are already in USD (gifts, donations) that need to be sent to sites without any exchange rate loss. The organization absorbs any exchange costs, so sites receive the full equivalent.

**Regular Transfer Budget:** Site requests local currency need → converted to USD
**IN/OUT Budget:** USD received → converted to full local currency (no loss)

---

**Status:** Changes documented, ready to implement  
**Date:** November 24, 2025  
**Priority:** HIGH - Implement before go-live
