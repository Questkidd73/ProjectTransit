/**
 * ============================================================================
 * CUN BUDGET MANAGEMENT SYSTEM - PART 3: FINANCE FUNCTIONS (V4.0)
 * ============================================================================
 * Version: 4.0 | Updated: 2025-12-12
 * Purpose: Finance Department operations (kept from V3.0 for now)
 * Note: These functions reference log sheets which will be overhauled later
 */

function recordFinalizationDate() {
  var ui = SpreadsheetApp.getUi();
  
  ui.alert(
    'Record Finalization Date',
    'Finance Department Instructions:\n\n' +
    '1. Go to "Log: YTD Budget" or "Log: YTD In/Out" sheet\n' +
    '2. Find the requests you want to finalize\n' +
    '3. In the finalization date column, enter today\'s date\n' +
    '4. The request will be marked as finalized\n\n' +
    'Tip: You can select multiple cells and enter the date once.',
    ui.ButtonSet.OK
  );
}

function viewPendingRequests() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var budgetSheet = ss.getSheetByName(SHEETS.LOG_YTD_BUDGET);
  var inoutSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
  
  if (!budgetSheet || !inoutSheet) {
    ui.alert('Error', 'Log sheets not found. Please check sheet names.', ui.ButtonSet.OK);
    return;
  }
  
  ui.alert('Info', 'Pending requests view is temporarily disabled while log sheets are being overhauled.', ui.ButtonSet.OK);
}

function approveRequests() {
  var ui = SpreadsheetApp.getUi();
  
  ui.alert('Info', 'Approve requests function is temporarily disabled while log sheets are being overhauled.', ui.ButtonSet.OK);
}

function viewYTDSummary() {
  var ui = SpreadsheetApp.getUi();
  
  ui.alert('Info', 'YTD Summary is temporarily disabled while log sheets are being overhauled.', ui.ButtonSet.OK);
}
