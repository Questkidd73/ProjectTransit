# Installation Guide - Integrated Budget Management Scripts

## Overview

These scripts are designed to work **WITH** your existing CUN 2025 Monthly Transfer Request template, enhancing it with automation while preserving all existing functionality.

## What These Scripts Do

### ✅ Automate
- Move data from Request sheets to Log: YTD sheets with one click
- Set Transfer Month automatically
- Clear Request sheets after submission

### ✅ Validate
- Check data before submission
- Verify required fields are filled
- Warn about potential issues

### ✅ Track
- View pending requests (not yet finalized)
- Approve multiple requests at once
- Generate YTD summaries

### ✅ Preserve
- All existing sheets remain unchanged
- All existing formulas continue to work
- All existing reports still function

## Installation Steps

### 1. Open Your Template

Open your "Copy of CUN 2025 Monthly Transfer Request" Google Sheet

### 2. Open Apps Script Editor

- Click **Extensions** > **Apps Script**
- You'll see the Apps Script editor

### 3. Delete Existing Code (if any)

- If there's a file called "Code.gs" with default code, delete it or clear it

### 4. Create Script Files

Click the **+** button next to "Files" and create 3 new script files:

#### File 1: Foundation
- Name: `Foundation`
- Paste contents of: **INTEGRATED Script - Part 1 - Foundation.gs**

#### File 2: RequestSubmission
- Name: `RequestSubmission`
- Paste contents of: **INTEGRATED Script - Part 2 - Request Submission.gs**

#### File 3: FinanceFunctions
- Name: `FinanceFunctions`
- Paste contents of: **INTEGRATED Script - Part 3 - Finance Functions.gs**

### 5. Save the Project

- Click the disk icon or **Ctrl+S** / **Cmd+S**
- Name your project: "CUN Budget Management"

### 6. Close and Reopen Spreadsheet

- Close the Apps Script editor
- Close your Google Sheet
- Reopen your Google Sheet
- You should see a new menu: **Budget Management**

### 7. Grant Permissions (First Time Only)

When you first use a menu function:
1. You'll see a permission dialog
2. Click "Continue"
3. Select your Google account
4. Click "Advanced" > "Go to CUN Budget Management (unsafe)"
5. Click "Allow"

This is normal for custom scripts!

## Menu Structure

```
Budget Management
├── 📊 Submit Request
│   ├── Submit Budget Request
│   ├── Submit Non-Budget Request
│   └── Validate Before Submit
│
├── 💵 Finance
│   ├── Record Finalization Date
│   ├── View Pending Requests
│   └── Approve Selected Requests
│
├── 📈 Reports
│   ├── Refresh All Reports
│   ├── View Current Month Summary
│   └── View YTD Summary
│
└── ⚙️ Admin
    ├── Update Exchange Rate
    ├── Clear Request Sheets
    ├── Validate Data
    └── Open Script
```

## How to Use

### For Site Staff (Creating Requests)

#### 1. Create Budget Request

1. Go to **Request: Budget** sheet
2. Fill in your budget items (rows 6+)
   - KEY: Unique identifier (e.g., 1001, 1002)
   - Main Account, Sub-1, Sub-2: Account hierarchy
   - Description: What you're requesting
   - Account/Program: Select program
   - Fill in account columns (J-N): Banorte, Local 2, Local 3, PNC, Payments to others
   - Total USD (column O) should calculate automatically

3. When ready, click **Budget Management > Submit Request > Validate Before Submit**
   - Check for any errors
   - Fix any issues

4. Click **Budget Management > Submit Request > Submit Budget Request**
   - Enter the month (e.g., "January")
   - Confirm submission
   - Data moves to "Log: YTD Budget"
   - Request sheet clears automatically

#### 2. Create Non-Budget Request

1. Go to **Request: Non-budget** sheet
2. Fill in your non-budget items (rows 6+)
   - Main Account, Sub-1, Sub-2: Account hierarchy
   - Description: What you're requesting
   - Account/Program: Select program or category
   - Fill in account columns (I-M)
   - Total USD (column N) should calculate automatically

3. Click **Budget Management > Submit Request > Submit Non-Budget Request**
   - Enter the month
   - Confirm submission
   - Data moves to "Log: YTD Non-budget"
   - Request sheet clears automatically

### For Finance Department

#### 1. View Pending Requests

Click **Budget Management > Finance > View Pending Requests**

This shows all requests that don't have a finalization date yet.

#### 2. Approve Individual Requests

1. Go to **Log: YTD Budget** or **Log: YTD Non-budget** sheet
2. Find the request you want to approve
3. In column W (Budget) or column S (Non-budget), enter today's date
4. The request is now finalized!

#### 3. Approve All Pending Requests

Click **Budget Management > Finance > Approve Selected Requests**

This sets today's date for ALL pending requests at once.

#### 4. View Reports

- **Current Month Summary**: Budget Management > Reports > View Current Month Summary
- **YTD Summary**: Budget Management > Reports > View YTD Summary

### For Administrators

#### 1. Update Exchange Rate

Click **Budget Management > Admin > Update Exchange Rate**

This updates the rate in Setup sheet (C53).

#### 2. Clear Request Sheets

Click **Budget Management > Admin > Clear Request Sheets**

This clears both Request: Budget and Request: Non-budget sheets.

**Warning:** This cannot be undone! Only use if you need to start fresh.

#### 3. Validate Data

Click **Budget Management > Admin > Validate Data**

This checks:
- Setup sheet configuration
- Required sheets exist
- Programs configured
- Exchange rate valid

## Workflow Example

### Monthly Budget Request Cycle

**Week 1: Site Creates Request**
1. Site staff fill out Request: Budget sheet
2. Site staff validate the request
3. Site staff submit for January
4. Data moves to Log: YTD Budget with Transfer Month = "January"

**Week 2: Finance Reviews**
1. Finance clicks "View Pending Requests"
2. Finance reviews the requests
3. Finance processes transfers
4. Finance clicks "Approve Selected Requests" or manually enters finalization dates

**Week 3: Reporting**
1. Anyone can view YTD Summary
2. Reports automatically update based on Log sheets
3. Finance can track by account, program, or month

## Key Features

### ✅ Data Integrity
- Original data preserved in Log sheets
- No data loss
- Complete audit trail

### ✅ Flexibility
- Can approve requests individually or in bulk
- Can validate before submitting
- Can clear and restart if needed

### ✅ Reporting
- YTD summaries by program
- YTD summaries by month
- Pending request tracking
- Works with existing report sheets

## Troubleshooting

### Menu doesn't appear
- Close and reopen the spreadsheet
- Check that scripts are saved
- Check browser console for errors

### "Sheet not found" error
- Run: Budget Management > Admin > Validate Data
- Check that all required sheets exist
- Check sheet names match exactly

### Permission denied
- Grant permissions when prompted
- Check that you have edit access to the spreadsheet

### Data not copying
- Check that Request sheet has data starting in row 6
- Check that KEY field (Budget) or Main Account (Non-budget) is filled
- Run validation first

## What's Preserved

Your existing template functionality is **100% preserved**:

✅ All existing formulas continue to work
✅ All existing report sheets still function
✅ All existing FIN: sheets still track data
✅ All existing calculations remain accurate
✅ All existing sheet structure unchanged

The scripts **ADD** functionality, they don't replace anything!

## Support

### Common Questions

**Q: Will this break my existing template?**
A: No! The scripts only read from Request sheets and write to Log sheets. All existing functionality is preserved.

**Q: Can I still manually enter data in Log sheets?**
A: Yes! You can still manually edit Log sheets if needed.

**Q: What if I make a mistake?**
A: You can manually edit the Log sheets to fix any errors. The scripts don't prevent manual edits.

**Q: Can I use this for multiple sites?**
A: Yes! The scripts are designed to work with any site code in the Setup sheet.

## Version History

- **Version 3.0** (2025-11-25): Integrated with existing CUN template
  - Works with existing Log sheets
  - Preserves all existing functionality
  - Adds automation and validation

---

**Status:** ✅ Ready for Installation  
**Compatibility:** CUN 2025 Monthly Transfer Request Template  
**Last Updated:** November 25, 2025
