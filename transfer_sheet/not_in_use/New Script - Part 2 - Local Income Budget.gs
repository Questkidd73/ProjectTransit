/**
 * ============================================================================
 * PART 2: LOCAL INCOME BUDGET FUNCTIONS
 * ============================================================================
 */

function runLocalIncomeBudgetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.LOCAL_INCOME_BUDGET);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'Local Income Budget sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) lastRow = 6;
  
  // Column K: USD Equivalent = Local Amount / Exchange Rate
  var usdFormula = '=IF(AND(NOT(ISBLANK(B6)),NOT(ISBLANK(J6))),J6/VLOOKUP(B6,Config!$A$2:$B$6,2,FALSE),"")';
  sheet.getRange('K6:K' + lastRow).setFormula(usdFormula);
  
  // Column L: Status (default "Planned")
  var statusFormula = '=IF(NOT(ISBLANK(B6)),IF(ISBLANK(L6),"Planned",L6),"")';
  sheet.getRange('L6:L' + lastRow).setFormula(statusFormula);
  
  SpreadsheetApp.getUi().alert('Success', 'Local Income Budget formulas updated!', SpreadsheetApp.getUi().ButtonSet.OK);
}

function logLocalIncomeBudget() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(SHEETS.LOCAL_INCOME_BUDGET);
  var logSheet = ss.getSheetByName(SHEETS.LOG_LOCAL_INCOME);
  
  if (!sourceSheet || !logSheet) {
    SpreadsheetApp.getUi().alert('Error', 'Required sheets not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert('Log Local Income Budget', 'Log all current budget items?', ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) return;
  
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('No Data', 'No budget items to log.', ui.ButtonSet.OK);
    return;
  }
  
  var sourceData = sourceSheet.getRange(6, 1, lastRow - 5, 12).getValues();
  var timestamp = new Date();
  var user = getCurrentUser();
  var logData = [];
  
  for (var i = 0; i < sourceData.length; i++) {
    var row = sourceData[i];
    if (!row[1]) continue; // Skip if no site
    
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
      row[9],                   // I: Budgeted Amount (Local Currency)
      getCurrencyForSite(row[1]).currency, // J: Local Currency Code
      '',                       // K: Actual Amount Received (empty)
      '',                       // L: Variance (Local)
      exchangeRate,             // M: Exchange Rate at Budget
      '',                       // N: Exchange Rate at Actual
      row[10],                  // O: Budgeted USD Equivalent
      '',                       // P: Actual USD Equivalent
      '',                       // Q: USD Variance
      row[11] || 'Planned',     // R: Status
      ''                        // S: Notes
    ]);
  }
  
  if (logData.length === 0) {
    ui.alert('No Data', 'No valid budget items to log.', ui.ButtonSet.OK);
    return;
  }
  
  var logLastRow = getLastRowInColumn(logSheet, 1);
  logSheet.getRange(logLastRow + 1, 1, logData.length, 19).setValues(logData);
  
  // Clear source sheet
  sourceSheet.getRange(6, 1, lastRow - 5, 12).clearContent();
  
  ui.alert('Success', logData.length + ' budget items logged!', ui.ButtonSet.OK);
  updateYTDSummaryFromLogs();
}

function enterLocalIncomeActuals() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Enter Actual Amounts',
    'Go to "' + SHEETS.LOG_LOCAL_INCOME + '" sheet:\n\n' +
    '1. Find your logged items\n' +
    '2. Enter actual amount in column K\n' +
    '3. System will calculate variance\n' +
    '4. Update status in column R',
    ui.ButtonSet.OK
  );
}

function calculateLocalIncomeVariances() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_LOCAL_INCOME);
  if (!logSheet) return;
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) return;
  
  // Column L: Local Variance = Actual - Budgeted
  var localVarFormula = '=IF(AND(NOT(ISBLANK(I6)),NOT(ISBLANK(K6))),K6-I6,"")';
  logSheet.getRange('L6:L' + lastRow).setFormula(localVarFormula);
  
  // Column N: Exchange Rate at Actual (if actual entered)
  var rateFormula = '=IF(NOT(ISBLANK(K6)),VLOOKUP(D6,Config!$A$2:$B$6,2,FALSE),"")';
  logSheet.getRange('N6:N' + lastRow).setFormula(rateFormula);
  
  // Column P: Actual USD Equivalent
  var actualUSDFormula = '=IF(AND(NOT(ISBLANK(K6)),NOT(ISBLANK(N6))),K6/N6,"")';
  logSheet.getRange('P6:P' + lastRow).setFormula(actualUSDFormula);
  
  // Column Q: USD Variance
  var usdVarFormula = '=IF(AND(NOT(ISBLANK(O6)),NOT(ISBLANK(P6))),P6-O6,"")';
  logSheet.getRange('Q6:Q' + lastRow).setFormula(usdVarFormula);
}
