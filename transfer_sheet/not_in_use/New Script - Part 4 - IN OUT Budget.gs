/**
 * ============================================================================
 * PART 4: IN/OUT BUDGET FUNCTIONS
 * ============================================================================
 */

function runInOutBudgetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.IN_OUT_BUDGET);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'IN/OUT Budget sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) lastRow = 6;
  
  // Column L: USD Equivalent
  var usdFormula = '=IF(AND(NOT(ISBLANK(C6)),NOT(ISBLANK(K6))),K6/VLOOKUP(C6,Config!$A$2:$B$6,2,FALSE),"")';
  sheet.getRange('L6:L' + lastRow).setFormula(usdFormula);
  
  // Column M: Status (default "Pending")
  var statusFormula = '=IF(NOT(ISBLANK(C6)),IF(ISBLANK(M6),"Pending",M6),"")';
  sheet.getRange('M6:M' + lastRow).setFormula(statusFormula);
  
  // Column N: Signed Amount (positive for IN, negative for OUT)
  var signedFormula = '=IF(B6="IN",K6,IF(B6="OUT",-K6,""))';
  sheet.getRange('N6:N' + lastRow).setFormula(signedFormula);
  
  SpreadsheetApp.getUi().alert('Success', 'IN/OUT Budget formulas updated!', SpreadsheetApp.getUi().ButtonSet.OK);
}

function logInOutTransaction() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(SHEETS.IN_OUT_BUDGET);
  var logSheet = ss.getSheetByName(SHEETS.LOG_IN_OUT);
  
  if (!sourceSheet || !logSheet) {
    SpreadsheetApp.getUi().alert('Error', 'Required sheets not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert('Log IN/OUT Transactions', 'Log all current transactions?', ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) return;
  
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('No Data', 'No transactions to log.', ui.ButtonSet.OK);
    return;
  }
  
  var sourceData = sourceSheet.getRange(6, 1, lastRow - 5, 14).getValues();
  var timestamp = new Date();
  var user = getCurrentUser();
  var logData = [];
  
  for (var i = 0; i < sourceData.length; i++) {
    var row = sourceData[i];
    if (!row[2]) continue; // Skip if no site
    
    var logID = generateLogID(row[2], row[3]);
    var exchangeRate = row[7] ? row[7] : getExchangeRate(getCurrencyForSite(row[2]).currency);
    
    logData.push([
      logID,                    // A: Log ID
      timestamp,                // B: Timestamp
      user,                     // C: Logged By
      row[1],                   // D: Type (IN/OUT)
      row[2],                   // E: Site
      row[3],                   // F: Program
      row[4],                   // G: Item Description
      row[5],                   // H: Category
      row[6],                   // I: Month/Period
      row[10],                  // J: Budgeted Amount (Local Currency)
      getCurrencyForSite(row[2]).currency, // K: Local Currency Code
      '',                       // L: Actual Amount
      '',                       // M: Variance (Local)
      exchangeRate,             // N: Exchange Rate at Budget
      '',                       // O: Exchange Rate at Actual
      row[11],                  // P: Budgeted USD Equivalent
      '',                       // Q: Actual USD Equivalent
      '',                       // R: USD Variance
      row[12] || 'Pending',     // S: Status
      ''                        // T: Notes
    ]);
  }
  
  if (logData.length === 0) {
    ui.alert('No Data', 'No valid transactions to log.', ui.ButtonSet.OK);
    return;
  }
  
  var logLastRow = getLastRowInColumn(logSheet, 1);
  logSheet.getRange(logLastRow + 1, 1, logData.length, 20).setValues(logData);
  
  sourceSheet.getRange(6, 1, lastRow - 5, 14).clearContent();
  
  ui.alert('Success', logData.length + ' transactions logged!', ui.ButtonSet.OK);
  updateYTDSummaryFromLogs();
}

function enterInOutActuals() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Enter Actual Amounts',
    'Go to "' + SHEETS.LOG_IN_OUT + '" sheet:\n\n' +
    '1. Find your logged transactions\n' +
    '2. Enter actual amount in column L\n' +
    '3. System will calculate variance\n' +
    '4. Update status in column S',
    ui.ButtonSet.OK
  );
}

function calculateInOutNetByProgram() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_IN_OUT);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert('Error', 'IN/OUT log sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) {
    SpreadsheetApp.getUi().alert('No Data', 'No transactions to calculate.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // Calculate variances in log sheet
  // Column M: Local Variance
  var localVarFormula = '=IF(AND(NOT(ISBLANK(J6)),NOT(ISBLANK(L6))),L6-J6,"")';
  logSheet.getRange('M6:M' + lastRow).setFormula(localVarFormula);
  
  // Column O: Exchange Rate at Actual
  var rateFormula = '=IF(NOT(ISBLANK(L6)),VLOOKUP(E6,Config!$A$2:$B$6,2,FALSE),"")';
  logSheet.getRange('O6:O' + lastRow).setFormula(rateFormula);
  
  // Column Q: Actual USD Equivalent
  var actualUSDFormula = '=IF(AND(NOT(ISBLANK(L6)),NOT(ISBLANK(O6))),L6/O6,"")';
  logSheet.getRange('Q6:Q' + lastRow).setFormula(actualUSDFormula);
  
  // Column R: USD Variance
  var usdVarFormula = '=IF(AND(NOT(ISBLANK(P6)),NOT(ISBLANK(Q6))),Q6-P6,"")';
  logSheet.getRange('R6:R' + lastRow).setFormula(usdVarFormula);
  
  SpreadsheetApp.getUi().alert('Success', 'IN/OUT net calculations updated!', SpreadsheetApp.getUi().ButtonSet.OK);
  
  updateYTDSummaryFromLogs();
}
