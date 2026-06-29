# Budget Management System V4.0 - Implementation Notes

**Date:** December 12, 2025  
**Version:** 4.0  
**Status:** Phase 1 Complete - Basic Structure Implemented

---

## Overview

This version adapts the Budget Management System to work with the new sheet structure featuring:
- **Budget Entry** - Master budget with all 12 months
- **Budget Transfer Planning** - Itemized planning sheet
- **Budget Transfer Request** - Program-level request sheet (what gets submitted)
- **In/Out Request** - Non-budget items request sheet

---

## What Was Implemented (Phase 1)

### 1. **Updated Constants (Part 1 - Foundation.gs)**
- New sheet name constants matching the new structure
- Exchange rate now reads from **File Setup** sheet (cells I18:K19)
- Kept existing log sheet names (to be overhauled later)

### 2. **Budget Request Submission (Part 2)**
**Function:** `submitBudgetRequest()`
- Reads from **Budget Transfer Request** sheet
- Gets month from cell D2 (dropdown)
- Copies columns: **C, D, J-S, V-AE** (24 columns total)
- Adds Transfer Month and Transfer Date
- Clears request sheet after submission (columns J-AE)

**Columns Copied:**
- C, D: US Netsuite Category, Clase
- J-S: Transfer budget MXN, Banorte MXN, Local account 2 MXN, Local account 3 MXN, PNC USD, Payments to others USD, Current month budget tracking (4 columns)
- V-AE: Transfer budget USD, Banorte USD, Local account 2 USD, Local account 3 USD, PNC USD, Payments to others USD, Current month and YTD tracking (5 columns)

### 3. **IN/OUT Request Submission (Part 2)**
**Function:** `submitInOutRequest()`
- Reads from **In/Out Request** sheet
- Gets month from cell D2 (dropdown)
- Copies columns: **C, D, J, M-O, Q, W-AE** (17 columns total)
- Adds Transfer Month and Transfer Date
- Clears specific columns after submission

**Columns Copied:**
- C, D: US Netsuite Category, Clase
- J: Banorte USD?
- M-O: PNC USD, Payments to others USD, Current month transfer budget MXN
- Q: YTD transfer budget MXN
- W-AE: Banorte USD, Local account 2 USD, Local account 3 USD, PNC USD, Payments to others USD, Current month and YTD tracking (9 columns)

### 4. **Exchange Rate Management**
**Function:** `getExchangeRate()`
- Reads from **File Setup** sheet
- Checks cells I18, J18, K18, I19, J19, K19 in order
- Returns first valid rate found
- Throws error if no valid rate exists

**Function:** `updateExchangeRate()`
- Prompts user for new rate
- Updates cell I18 in File Setup sheet

### 5. **Utility Functions**
- `clearRequestSheets()` - Clears both Budget and IN/OUT request sheets
- `checkSetup()` - Diagnostic tool to verify all sheets exist and exchange rate is valid
- `getLastRowInColumn()` - Helper to find last row with data

### 6. **Menu System**
Updated menu with new functions:
- Setup Budget Request Formulas (placeholder)
- Submit Budget Request ✅
- Setup IN/OUT Request Formulas (placeholder)
- Submit IN/OUT Request ✅
- Diagnose Setup ✅
- Finance submenu (temporarily disabled)
- Clear Request Sheets ✅

---

## What's NOT Yet Implemented

### 1. **Formula Setup Functions**
- `runBudgetRequestFormulas()` - Should pull data from Budget Entry based on selected month
- `runInOutRequestFormulas()` - Should set up budget tracking formulas

**Why Not Implemented:**
- Need to understand how Budget Entry data should map to Budget Request
- Need to know which columns are formulas vs. user-entered data
- The note "sum/fs matching both C and D, copied across" suggests complex matching logic

### 2. **Log Sheet Integration**
- Log sheets kept as-is (will be overhauled later per user request)
- Finance functions temporarily disabled
- Report functions not updated

### 3. **Currency Conversion**
- No automatic conversion between MXN and USD columns
- Exchange rate is read but not yet applied to calculations
- Need to clarify which columns should auto-convert

---

## File Structure

```
transfer_sheet/
├── INTEGRATED Script - Part 1 - Foundation.gs (NEW V4.0)
├── INTEGRATED Script - Part 2 - Request Submission.gs (NEW V4.0)
├── INTEGRATED Script - Part 3 - Finance Functions.gs (NEW V4.0 - minimal)
├── OLD_INTEGRATED Script - Part 1 - Foundation.gs (BACKUP)
├── OLD_INTEGRATED Script - Part 2 - Request Submission.gs (BACKUP)
├── OLD_INTEGRATED Script - Part 3 - Finance Functions.gs (BACKUP)
└── not_in_use/ (older scripts)
```

---

## Testing Checklist

### Budget Request Submission
- [ ] Select month in Budget Transfer Request (D2)
- [ ] Enter data in account columns (J-AE)
- [ ] Run "Submit Budget Request" from menu
- [ ] Verify data appears in Log: YTD Budget
- [ ] Verify request sheet is cleared
- [ ] Verify Transfer Month and Date are set correctly

### IN/OUT Request Submission
- [ ] Select month in In/Out Request (D2)
- [ ] Enter data in account columns (J, M-O, Q, W-AE)
- [ ] Run "Submit IN/OUT Request" from menu
- [ ] Verify data appears in Log: YTD In/Out
- [ ] Verify request sheet is cleared
- [ ] Verify Transfer Month and Date are set correctly

### Exchange Rate
- [ ] Run "Diagnose Setup" - should show exchange rate
- [ ] Verify rate is read from File Setup sheet
- [ ] Test updating rate with "Update Exchange Rate" function

---

## Next Steps (Phase 2)

1. **Implement Formula Setup Functions**
   - Understand Budget Entry → Budget Request mapping
   - Implement `runBudgetRequestFormulas()`
   - Implement `runInOutRequestFormulas()`

2. **Add Currency Conversion**
   - Determine which columns need auto-conversion
   - Apply exchange rate to MXN ↔ USD conversions

3. **Overhaul Log Sheets**
   - Update log sheet structure to match new request sheets
   - Update Finance functions to work with new logs
   - Re-enable report functions

4. **Add Validation**
   - Check for required data before submission
   - Validate month selection
   - Validate numeric values in account columns

---

## Known Issues

1. **Formula Setup Not Implemented**
   - Users must manually enter data in request sheets
   - Budget Request formulas should pull from Budget Entry

2. **Finance Functions Disabled**
   - View Pending Requests - disabled
   - Approve Requests - disabled
   - YTD Summary - disabled
   - Will be re-enabled after log sheet overhaul

3. **No Currency Conversion**
   - Exchange rate is read but not applied
   - Users must manually convert between MXN and USD

---

## Questions for User

1. **Budget Entry → Budget Request Mapping:**
   - How should data from Budget Entry (12 months) map to Budget Request (single month)?
   - Which columns in Budget Request are formulas vs. user-entered?
   - What does "sum/fs matching both C and D, copied across" mean?

2. **Currency Conversion:**
   - Which columns should auto-convert from MXN to USD?
   - Which columns should auto-convert from USD to MXN?
   - Or are they independent (user enters both)?

3. **Log Sheet Structure:**
   - When ready to overhaul, what should the new log structure be?
   - Should it match the request sheets exactly?
   - What additional columns are needed?

---

## Installation Instructions

### For Google Apps Script:

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete all existing code files
4. Create 3 new files:
   - `Part 1 - Foundation.gs`
   - `Part 2 - Request Submission.gs`
   - `Part 3 - Finance Functions.gs`
5. Copy the content from each file in the transfer_sheet folder
6. Save and refresh your Google Sheet
7. The "Budget Management" menu should appear

### First Time Setup:

1. Go to **Budget Management → Diagnose Setup**
2. Verify all sheets are found
3. Verify exchange rate is valid
4. If exchange rate is missing, set it in File Setup sheet (I18:K19)

---

## Change Log

### V4.0 (2025-12-12)
- Complete restructure for new Budget Entry system
- Updated sheet name constants
- Exchange rate from File Setup sheet
- Budget Request submission implemented
- IN/OUT Request submission implemented
- Finance functions temporarily disabled
- Old scripts backed up with "OLD_" prefix

### V3.0 (Previous)
- Budget Transfer Planning Sheet structure
- IN/OUT Planning Sheet structure
- Log sheets with specific column counts
- Finance functions operational
