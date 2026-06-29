/**
 * ============================================================================
 * PART 2: BUDGET REQUEST FUNCTIONS
 * ============================================================================
 * Handles Budget and Non-Budget request creation and submission
 */

function createBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  
  // Prompt for month
  var monthResponse = ui.prompt(
    'Create Budget Request',
    'Enter month (e.g., January, February, etc.):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;
  var month = monthResponse.getResponseText();
  
  if (MONTHS.indexOf(month) === -1) {
    ui.alert('Error', 'Invalid month. Please enter a valid month name.', ui.ButtonSet.OK);
    return;
  }
  
  ui.alert(
    'Create Budget Request',
    'Go to "' + SHEETS.REQUEST_BUDGET + '" sheet to enter your budget request.\n\n' +
    'Instructions:\n' +
    '1. Select the program from the dropdown\n' +
    '2. Enter line items and amounts\n' +
    '3. Select which account to use\n' +
    '4. System will calculate USD and MXN totals\n' +
    '5. Click "Submit Request" when ready',
    ui.ButtonSet.OK
  );
}

function createNonBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  
  ui.alert(
    'Create Non-Budget Request',
    'Go to "' + SHEETS.REQUEST_NON_BUDGET + '" sheet to enter non-budget items.\n\n' +
    'Non-Budget Categories:\n' +
    NON_BUDGET_CATEGORIES.slice(0, 5).join('\n') + '\n...and more\n\n' +
    'Instructions:\n' +
    '1. Select category from dropdown\n' +
    '2. Enter description and amount\n' +
    '3. Select account\n' +
    '4. Click "Submit Request" when ready',
    ui.ButtonSet.OK
  );
}

function submitTransferRequest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Submit Transfer Request',
    'This will:\n' +
    '1. Log all budget and non-budget requests\n' +
    '2. Create transfer request for Finance\n' +
    '3. Clear the request sheets\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    // Get month from user
    var monthResponse = ui.prompt(
      'Submit Transfer Request',
      'Enter month for this request:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (monthResponse.getSelectedButton() !== ui.Button.OK) return;
    var month = monthResponse.getResponseText();
    
    // Log budget requests
    var budgetCount = logBudgetRequests(month);
    
    // Log non-budget requests
    var nonBudgetCount = logNonBudgetRequests(month);
    
    // Update summary
    updateMonthlySummary(month);
    
    ui.alert(
      'Success',
      'Transfer request submitted!\n\n' +
      'Budget items: ' + budgetCount + '\n' +
      'Non-budget items: ' + nonBudgetCount + '\n\n' +
      'Request logged and sent to Finance.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to submit request: ' + e.message, ui.ButtonSet.OK);
  }
}

function logBudgetRequests(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.REQUEST_BUDGET);
  var logSheet = ss.getSheetByName(SHEETS.LOG_REQUESTS);
  
  if (!requestSheet || !logSheet) {
    throw new Error('Required sheets not found');
  }
  
  var config = getSetupConfig();
  var lastRow = requestSheet.getLastRow();
  if (lastRow < 6) return 0;
  
  var data = requestSheet.getRange(6, 1, lastRow - 5, 15).getValues();
  var timestamp = new Date();
  var user = getCurrentUser();
  var logData = [];
  var count = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // Skip if no program
    
    var requestID = generateRequestID(row[0], month);
    
    logData.push([
      requestID,                  // A: Request ID
      timestamp,                  // B: Timestamp
      user,                       // C: Submitted By
      config.site,                // D: Site
      config.year,                // E: Year
      month,                      // F: Month
      'Budget',                   // G: Type
      row[0],                     // H: Program
      row[1],                     // I: Line Item Description
      row[2],                     // J: Category
      row[3] || 0,                // K: Local Account 1 USD
      row[4] || 0,                // L: Local Account 2 USD
      row[5] || 0,                // M: Local Account 3 USD
      row[6] || 0,                // N: PNC USD
      row[7] || 0,                // O: Payments to Others USD
      row[8] || 0,                // P: Total USD
      row[9] || 0,                // Q: Total MXN
      config.exchangeRate,        // R: Exchange Rate
      'Requested',                // S: Status
      '',                         // T: Finance Notes
      '',                         // U: Disbursement Date
      ''                          // V: Reference Number
    ]);
    count++;
  }
  
  if (logData.length > 0) {
    var logLastRow = getLastRowInColumn(logSheet, 1);
    logSheet.getRange(logLastRow + 1, 1, logData.length, 22).setValues(logData);
    
    // Clear request sheet
    requestSheet.getRange(6, 1, lastRow - 5, 15).clearContent();
  }
  
  return count;
}

function logNonBudgetRequests(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.REQUEST_NON_BUDGET);
  var logSheet = ss.getSheetByName(SHEETS.LOG_REQUESTS);
  
  if (!requestSheet || !logSheet) {
    throw new Error('Required sheets not found');
  }
  
  var config = getSetupConfig();
  var lastRow = requestSheet.getLastRow();
  if (lastRow < 6) return 0;
  
  var data = requestSheet.getRange(6, 1, lastRow - 5, 15).getValues();
  var timestamp = new Date();
  var user = getCurrentUser();
  var logData = [];
  var count = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // Skip if no category
    
    var requestID = generateRequestID('NonBudget', month);
    
    logData.push([
      requestID,                  // A: Request ID
      timestamp,                  // B: Timestamp
      user,                       // C: Submitted By
      config.site,                // D: Site
      config.year,                // E: Year
      month,                      // F: Month
      'Non-Budget',               // G: Type
      row[0],                     // H: Category (used as Program for non-budget)
      row[1],                     // I: Line Item Description
      row[0],                     // J: Category
      row[2] || 0,                // K: Local Account 1 USD
      row[3] || 0,                // L: Local Account 2 USD
      row[4] || 0,                // M: Local Account 3 USD
      row[5] || 0,                // N: PNC USD
      row[6] || 0,                // O: Payments to Others USD
      row[7] || 0,                // P: Total USD
      row[8] || 0,                // Q: Total MXN
      config.exchangeRate,        // R: Exchange Rate
      'Requested',                // S: Status
      '',                         // T: Finance Notes
      '',                         // U: Disbursement Date
      ''                          // V: Reference Number
    ]);
    count++;
  }
  
  if (logData.length > 0) {
    var logLastRow = getLastRowInColumn(logSheet, 1);
    logSheet.getRange(logLastRow + 1, 1, logData.length, 22).setValues(logData);
    
    // Clear request sheet
    requestSheet.getRange(6, 1, lastRow - 5, 15).clearContent();
  }
  
  return count;
}

function updateMonthlySummary(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheet = ss.getSheetByName(SHEETS.SUMMARY);
  
  if (!summarySheet) return;
  
  // Update the "Last Logged Month" cell
  summarySheet.getRange('G3').setValue(month);
  
  // Trigger recalculation of summary formulas
  SpreadsheetApp.flush();
}
