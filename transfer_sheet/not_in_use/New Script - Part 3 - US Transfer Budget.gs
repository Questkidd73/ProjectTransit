/**
 * ============================================================================
 * PART 3: US TRANSFER BUDGET FUNCTIONS
 * ============================================================================
 */

function runUSTransferBudgetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.US_TRANSFER_BUDGET);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'US Transfer Budget sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) lastRow = 6;
  
  // Column K: USD Equivalent (what needs to be sent)
  var usdFormula = '=IF(AND(NOT(ISBLANK(B6)),NOT(ISBLANK(J6))),J6/VLOOKUP(B6,Config!$A$2:$B$6,2,FALSE),"")';
  sheet.getRange('K6:K' + lastRow).setFormula(usdFormula);
  
  // Column L: Status (default "Requested")
  var statusFormula = '=IF(NOT(ISBLANK(B6)),IF(ISBLANK(L6),"Requested",L6),"")';
  sheet.getRange('L6:L' + lastRow).setFormula(statusFormula);
  
  SpreadsheetApp.getUi().alert('Success', 'US Transfer Budget formulas updated!', SpreadsheetApp.getUi().ButtonSet.OK);
}

function submitTransferRequest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(SHEETS.US_TRANSFER_BUDGET);
  var logSheet = ss.getSheetByName(SHEETS.LOG_US_TRANSFER);
  
  if (!sourceSheet || !logSheet) {
    SpreadsheetApp.getUi().alert('Error', 'Required sheets not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert('Submit Transfer Request', 'Submit all requests to Finance?', ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) return;
  
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('No Data', 'No transfer requests to submit.', ui.ButtonSet.OK);
    return;
  }
  
  var sourceData = sourceSheet.getRange(6, 1, lastRow - 5, 12).getValues();
  var timestamp = new Date();
  var user = getCurrentUser();
  var logData = [];
  
  for (var i = 0; i < sourceData.length; i++) {
    var row = sourceData[i];
    if (!row[1]) continue;
    
    var logID = generateLogID(row[1], row[2]);
    var exchangeRate = row[6] ? row[6] : getExchangeRate(getCurrencyForSite(row[1]).currency);
    
    logData.push([
      logID,                    // A: Log ID
      timestamp,                // B: Timestamp
      user,                     // C: Logged By
      row[1],                   // D: Site
      row[2],                   // E: Program
      row[3],                   // F: Item Description
      row[4],                   // G: Category
      row[5],                   // H: Month/Period
      row[9],                   // I: Requested Amount (Local Currency)
      getCurrencyForSite(row[1]).currency, // J: Local Currency Code
      row[10],                  // K: Requested USD Equivalent
      exchangeRate,             // L: Exchange Rate at Request
      '',                       // M: Actual USD Sent (Finance enters)
      '',                       // N: Exchange Rate at Transfer
      '',                       // O: Actual Local Currency Received (Site enters)
      '',                       // P: USD Variance
      '',                       // Q: Local Currency Variance
      '',                       // R: Transfer Date
      '',                       // S: Transfer Method
      '',                       // T: Transfer Reference #
      'Requested',              // U: Status
      '',                       // V: Finance Notes
      ''                        // W: Site Notes
    ]);
  }
  
  if (logData.length === 0) {
    ui.alert('No Data', 'No valid transfer requests.', ui.ButtonSet.OK);
    return;
  }
  
  var logLastRow = getLastRowInColumn(logSheet, 1);
  logSheet.getRange(logLastRow + 1, 1, logData.length, 23).setValues(logData);
  
  sourceSheet.getRange(6, 1, lastRow - 5, 12).clearContent();
  
  ui.alert('Success', logData.length + ' transfer requests submitted!', ui.ButtonSet.OK);
}

function recordUSDDisbursement() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Record USD Disbursement',
    'Finance Department Instructions:\n\n' +
    '1. Go to "' + SHEETS.LOG_US_TRANSFER + '" sheet\n' +
    '2. Find requests with Status = "Requested"\n' +
    '3. Enter actual USD sent in column M\n' +
    '4. Enter transfer date in column R\n' +
    '5. Enter transfer method in column S\n' +
    '6. Enter reference # in column T\n' +
    '7. Add notes in column V\n' +
    '8. Change status to "Sent"\n\n' +
    'System will calculate expected local currency.',
    ui.ButtonSet.OK
  );
}

function confirmLocalCurrencyReceipt() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Confirm Local Currency Receipt',
    'Site Instructions:\n\n' +
    '1. Go to "' + SHEETS.LOG_US_TRANSFER + '" sheet\n' +
    '2. Find transfers with Status = "Sent"\n' +
    '3. Enter actual local currency received in column O\n' +
    '4. Add notes in column W\n' +
    '5. Change status to "Received"\n\n' +
    'System will calculate variances and update YTD.',
    ui.ButtonSet.OK
  );
}

function reconcileTransfer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_US_TRANSFER);
  if (!logSheet) return;
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) return;
  
  // Column N: Exchange Rate at Transfer (when Finance sends)
  var rateFormula = '=IF(NOT(ISBLANK(M6)),VLOOKUP(D6,Config!$A$2:$B$6,2,FALSE),"")';
  logSheet.getRange('N6:N' + lastRow).setFormula(rateFormula);
  
  // Column P: USD Variance = Actual USD Sent - Requested USD
  var usdVarFormula = '=IF(AND(NOT(ISBLANK(K6)),NOT(ISBLANK(M6))),M6-K6,"")';
  logSheet.getRange('P6:P' + lastRow).setFormula(usdVarFormula);
  
  // Column Q: Local Currency Variance = Actual Received - Requested
  var localVarFormula = '=IF(AND(NOT(ISBLANK(I6)),NOT(ISBLANK(O6))),O6-I6,"")';
  logSheet.getRange('Q6:Q' + lastRow).setFormula(localVarFormula);
  
  var ui = SpreadsheetApp.getUi();
  ui.alert('Reconciliation Complete', 'Transfer variances calculated. Check YTD Summary.', ui.ButtonSet.OK);
  
  updateYTDSummaryFromLogs();
}

function calculateTransferNeed(site, program) {
  // This calculates: Full Budget - Local Income - Carry Over - US Paid Expenses
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheet = ss.getSheetByName(SHEETS.PROGRAM_SUMMARY);
  
  if (!summarySheet) return 0;
  
  // Find the row for this site/program combination
  var data = summarySheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === site && data[i][1] === program) {
      var fullBudget = data[i][2] || 0;
      var localIncome = data[i][3] || 0;
      var carryOver = data[i][4] || 0;
      var usPaidExpenses = data[i][5] || 0;
      
      var transferNeed = fullBudget - localIncome - carryOver - usPaidExpenses;
      return Math.max(0, transferNeed); // Don't return negative
    }
  }
  
  return 0;
}
