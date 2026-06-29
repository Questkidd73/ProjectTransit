/**
 * ============================================================================
 * PART 2: REQUEST SUBMISSION
 * ============================================================================
 * Handles moving data from Request sheets to Log: YTD sheets
 */

function submitBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get month from cell D2
  var requestSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  var month = requestSheet.getRange("D2").getValue();
  
  if (!month || month === '') {
    ui.alert('Error', 'Please enter a month in cell D2 of the Budget Transfer Planning Sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  // Validate month
  if (MONTHS.indexOf(month) === -1) {
    ui.alert('Error', 'Invalid month in cell D2. Please enter a valid month name (e.g., January).', ui.ButtonSet.OK);
    return;
  }
  
  // Confirm submission
  var result = ui.alert(
    'Confirm Submission',
    'This will:\n' +
    '1. Copy all budget requests to Log: YTD Budget\n' +
    '2. Set Transfer Month to: ' + month + '\n' +
    '3. Clear the Request: Budget sheet\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    var count = copyBudgetRequestToLog(month);
    
    if (count === 0) {
      ui.alert('No Data', 'No budget requests found to submit.', ui.ButtonSet.OK);
      return;
    }
    
    // Clear ONLY the request columns (J-N), timestamp (W), and month (D2)
    var lastRow = requestSheet.getLastRow();
    if (lastRow > 5) {
      // Clear request amounts (columns J-N)
      requestSheet.getRange(6, 10, lastRow - 5, 5).clearContent(); // J-N
      // Clear timestamp column W
      requestSheet.getRange(6, 23, lastRow - 5, 1).clearContent(); // W
    }
    // Clear month cell D2
    requestSheet.getRange("D2").clearContent();
    // Clear status cells G1:G4
    requestSheet.getRange("G1:G4").clearContent();
    
    ui.alert(
      'Success',
      'Budget request submitted!\n\n' +
      'Items submitted: ' + count + '\n' +
      'Month: ' + month + '\n\n' +
      'Check "Log: YTD Budget" sheet for details.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to submit request: ' + e.message, ui.ButtonSet.OK);
  }
}

function copyBudgetRequestToLog(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_BUDGET);
  
  if (!requestSheet || !logSheet) {
    throw new Error('Required sheets not found');
  }
  
  var lastRow = requestSheet.getLastRow();
  if (lastRow < 6) return 0;
  
  var exchangeRate = getExchangeRate();
  
  // Get all data from Request sheet (starting row 6, columns A-U only)
  // Columns V, W, X will be set by code below
  var data = requestSheet.getRange(6, 1, lastRow - 5, 21).getValues();
  var logData = [];
  var count = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    
    // Skip empty rows (check if KEY field is empty)
    if (!row[0] || row[0] === '') continue;
    
    // CURRENCY CONVERSION:
    // Column H (index 7): Budget MXN - keep as entered
    // Column I (index 8): Budget USD - convert from MXN if needed
    if (row[7] && (!row[8] || row[8] === 0)) {
      // If MXN is filled but USD is empty, convert
      row[8] = row[7] / exchangeRate;
    }
    
    // Convert account amounts (columns J-N, indices 9-13) if entered in local currency
    // Uses smart detection based on currency type (MXN, INR, NGN, etc.)
    for (var col = 9; col <= 13; col++) {
      if (row[col] && isLikelyLocalCurrency(row[col])) {
        // Amount detected as local currency, convert to USD
        row[col] = convertLocalToUSD(row[col]);
      }
    }
    
    // Column O (index 14): Total USD - recalculate
    row[14] = (row[9] || 0) + (row[10] || 0) + (row[11] || 0) + (row[12] || 0) + (row[13] || 0);
    
    // Column Q (index 16): Total MXN - recalculate
    row[16] = row[14] * exchangeRate;
    
    // Set Transfer Month (column V, index 21)
    row[21] = month;
    
    // Set Transfer Date (column W, index 22) to current date
    var date = new Date();
    var formattedDate = Utilities.formatDate(date, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "MM/dd/yyyy");
    row[22] = formattedDate;
    
    // Keep all other data as-is
    logData.push(row);
    count++;
  }
  
  if (logData.length > 0) {
    // Find last row in log sheet
    var logLastRow = getLastRowInColumn(logSheet, 1);
    
    // Append to log sheet (23 columns A-W, X remains empty)
    logSheet.getRange(logLastRow + 1, 1, logData.length, 23).setValues(logData);
  }
  
  return count;
}

function submitNonBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get month from cell D2 (new method)
  var requestSheet = ss.getSheetByName(SHEETS.INOUT_PLANNING);
  var month = requestSheet.getRange("D2").getValue();
  
  if (!month || month === '') {
    ui.alert('Error', 'Please enter a month in cell D2 of the IN/OUT Planning Sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  // Validate month
  if (MONTHS.indexOf(month) === -1) {
    ui.alert('Error', 'Invalid month in cell D2. Please enter a valid month name (e.g., January).', ui.ButtonSet.OK);
    return;
  }
  
  // Confirm submission
  var result = ui.alert(
    'Confirm Submission',
    'This will:\n' +
    '1. Copy all IN/OUT requests to Log: YTD In/Out\n' +
    '2. Set Transfer Month to: ' + month + '\n' +
    '3. Clear the IN/OUT Planning Sheet\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    var count = copyNonBudgetRequestToLog(month);
    
    if (count === 0) {
      ui.alert('No Data', 'No IN/OUT requests found to submit.', ui.ButtonSet.OK);
      return;
    }
    
    // Clear data rows, month, and status (matching old script behavior)
    var lastRow = requestSheet.getLastRow();
    if (lastRow > 5) {
      // Clear all data rows A6:T (20 columns)
      requestSheet.getRange(6, 1, lastRow - 5, 20).clearContent();
    }
    // Clear month cell D2
    requestSheet.getRange("D2").clearContent();
    // Clear status cells G1:G4
    requestSheet.getRange("G1:G4").clearContent();
    
    ui.alert(
      'Success',
      'IN/OUT request submitted!\n\n' +
      'Items submitted: ' + count + '\n' +
      'Month: ' + month + '\n\n' +
      'Check "Log: YTD In/Out" sheet for details.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to submit request: ' + e.message, ui.ButtonSet.OK);
  }
}

function copyNonBudgetRequestToLog(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.INOUT_PLANNING);
  var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
  
  if (!requestSheet) {
    throw new Error('IN/OUT Planning Sheet not found. Looking for: "' + SHEETS.INOUT_PLANNING + '"');
  }
  if (!logSheet) {
    throw new Error('Log sheet not found. Looking for: "' + SHEETS.LOG_YTD_INOUT + '"');
  }
  Logger.log('Found sheets - Planning: ' + requestSheet.getName() + ', Log: ' + logSheet.getName());
  
  var lastRow = requestSheet.getLastRow();
  Logger.log('IN/OUT lastRow: ' + lastRow);
  if (lastRow < 6) return 0;
  
  var exchangeRate = getExchangeRate();
  Logger.log('Exchange rate: ' + exchangeRate);
  
  // Get all data from Request sheet (starting row 6, columns A-R only)
  // We'll add columns S, T, U (Transfer Month, Transfer Date, Total Local Currency) to each row
  var data = requestSheet.getRange(6, 1, lastRow - 5, 18).getValues();
  Logger.log('Total rows to process: ' + data.length);
  var logData = [];
  var count = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    
    // Skip empty rows (check if there are any request amounts in columns J-N)
    // J=index 9 (Banorte), K=10 (Local 2), L=11 (Local 3), M=12 (PNC), N=13 (Payments to others)
    Logger.log('Row ' + (i+6) + ' - J:' + row[9] + ' K:' + row[10] + ' L:' + row[11] + ' M:' + row[12] + ' N:' + row[13]);
    var hasAmount = (row[9] || row[10] || row[11] || row[12] || row[13]);
    if (!hasAmount) {
      Logger.log('Row ' + (i+6) + ' skipped - no amounts in J-N');
      continue;
    }
    Logger.log('Row ' + (i+6) + ' processing - has amounts');
    
    // CURRENCY CONVERSION:
    // Column H (index 7): MXN budget amount - keep as entered
    // Column I (index 8): USD budget equivalent - convert if needed
    if (row[7] && (!row[8] || row[8] === 0)) {
      // If MXN is filled but USD is empty, convert
      row[8] = convertLocalToUSD(row[7]);
    }
    
    // Convert account amounts (columns J-N, indices 9-13) if entered in local currency
    // Uses smart detection based on currency type (MXN, INR, NGN, etc.)
    for (var col = 9; col <= 13; col++) {
      if (row[col] && isLikelyLocalCurrency(row[col])) {
        // Amount detected as local currency, convert to USD
        row[col] = convertLocalToUSD(row[col]);
      }
    }
    
    // Column O (index 14): Total USD - recalculate
    row[14] = (row[9] || 0) + (row[10] || 0) + (row[11] || 0) + (row[12] || 0) + (row[13] || 0);
    
    // Column Q (index 16): Total ESTIMATED local currency - recalculate
    row[16] = row[14] * exchangeRate;
    
    // Set Transfer Month (column S, index 18)
    row[18] = month;
    
    // Set Transfer Date (column T, index 19) to current date
    var date = new Date();
    var formattedDate = Utilities.formatDate(date, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "MM/dd/yyyy");
    row[19] = formattedDate;
    
    // Set Total Local Currency (column U, index 20) - replaces VLOOKUP formula
    row[20] = row[14] * exchangeRate; // Total USD * exchange rate
    
    // Keep all other data as-is
    logData.push(row);
    count++;
  }
  
  if (logData.length > 0) {
    // Find last row in log sheet
    var logLastRow = getLastRowInColumn(logSheet, 1);
    
    // Append to log sheet (21 columns A-U)
    logSheet.getRange(logLastRow + 1, 1, logData.length, 21).setValues(logData);
  }
  
  return count;
}

// ============================================================================
// SETUP BUDGET FORMULAS - EXACT COPY FROM OLD SCRIPT
// ============================================================================

function runBudgetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName("Budget Transfer Planning Sheet")
  var sourceSheet = ss.getSheetByName("Transfer Commitment")
  
  if (!sheet || !sourceSheet) {
    ui.alert('Error', 'Required sheets not found. Check sheet names.', ui.ButtonSet.OK);
    return;
  }
  
  // Check if Transfer Commitment has data
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('Error', 'Transfer Commitment sheet has no data (last row: ' + lastRow + '). Data should start at row 6.', ui.ButtonSet.OK);
    return;
  }
  
  var range = sheet.getRange("A:W");

  // Clear formula columns only (user will manually copy A-G from Transfer Commitment)
  var clearRange = sheet.getRange("H6:W");
  clearRange.clearContent();

  var lookuprange = [];
  lookuprange[0] = "6:";
  // Get last row from SOURCE sheet (Transfer Commitment), not destination!
  lookuprange[1] = sourceSheet.getLastRow();

  // ** Budget MXN ** //
  var cell = sheet.getRange("H"+lookuprange[0] + "H"+lookuprange[1]);
  // Direct INDEX without named range - look up account in column A, month in row 5
  cell.setFormula("=IFERROR(INDEX('Transfer Commitment'!$H:$S,MATCH($A6,'Transfer Commitment'!$A:$A,0),MATCH($D$2,'Transfer Commitment'!$H$5:$S$5,0)),)")

  // ** Budget USD ** //
  var cell = sheet.getRange("I"+lookuprange[0] + "I"+lookuprange[1]);
  cell.setFormula("=IF(ISBLANK(H6),,IFERROR(H6/'Transfer Commitment'!$G$4,))")

  // ** Total USD ** //
  var cell = sheet.getRange("O"+lookuprange[0] + "O"+lookuprange[1]);
  cell.setFormula("=SUM(J6:N6)")

  // ** Budget over / (under) USD ** //
  var cell = sheet.getRange("P"+lookuprange[0] + "P"+lookuprange[1]);
  cell.setFormula("=IFERROR(O6-I6,\"\")")

  // ** Total MXN ** //
  var cell = sheet.getRange("Q"+lookuprange[0] + "Q"+lookuprange[1]);
  cell.setFormula("=O6*Q$3")

  // ** Budget over / (under) MXN ** //
  var cell = sheet.getRange("R"+lookuprange[0] + "R"+lookuprange[1]);
  cell.setFormula("=IFERROR(Q6-H6,\"\")")

  // Transfer Month //
  var cell = sheet.getRange("V"+lookuprange[0] + "V"+lookuprange[1]);
  cell.setFormula("=$D$2")

  // YTD Budgeted Amount USD //
  var cell = sheet.getRange("S"+lookuprange[0] + "S"+lookuprange[1]);
  cell.setFormula("=IF($D$2='Transfer Commitment'!H$5,SUM('Transfer Commitment'!$V6),IF($D$2='Transfer Commitment'!I$5,SUM('Transfer Commitment'!$V6:$W6),IF($D$2='Transfer Commitment'!J$5,SUM('Transfer Commitment'!$V6:X6),IF($D$2='Transfer Commitment'!K$5,SUM('Transfer Commitment'!$V6:Y6),IF($D$2='Transfer Commitment'!L$5,SUM('Transfer Commitment'!$V6:Z6),IF($D$2='Transfer Commitment'!M$5,SUM('Transfer Commitment'!$V6:AA6),IF($D$2='Transfer Commitment'!N$5,SUM('Transfer Commitment'!$V6:AB6),IF($D$2='Transfer Commitment'!O$5,SUM('Transfer Commitment'!$V6:AC6),IF($D$2='Transfer Commitment'!P$5,SUM('Transfer Commitment'!$V6:AD6),IF($D$2='Transfer Commitment'!Q$5,SUM('Transfer Commitment'!$V6:AE6),IF($D$2='Transfer Commitment'!R$5,SUM('Transfer Commitment'!$V6:AF6),IF($D$2='Transfer Commitment'!S$5,SUM('Transfer Commitment'!$V6:AG6),))))))))))))")

  // YTD Actual Amount USD //
  var cell = sheet.getRange("T"+lookuprange[0] + "T"+lookuprange[1]);
  cell.setFormula("=O6+SUMIF('Log: YTD Budget'!$A6:$A,$A6,'Log: YTD Budget'!O6:O)")

  // YTD over/under USD //
  var cell = sheet.getRange("U"+lookuprange[0] + "U"+lookuprange[1]);
  cell.setFormula("=T6-S6")
  
  SpreadsheetApp.getUi().alert(
    'Setup Complete',
    'Budget formulas have been set up in rows 6-' + lookuprange[1] + '.\n\n' +
    'NEXT STEPS:\n' +
    '1. Enter a month in cell D2 (e.g., "January")\n' +
    '2. Columns H (Budget MXN) and I (Budget USD) will auto-populate\n' +
    '3. Use "Autofill Budget → Column J" to copy Budget USD to request column\n' +
    '4. Adjust amounts in columns J-N as needed\n' +
    '5. When ready, use "Submit Budget Request" to log',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

}

// ============================================================================
// FIX REPORT FORMULAS - Update old sheet names
// ============================================================================

function fixReportFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var reportSheets = [
    'Report: Budget Category by Month',
    'Report: Budget by Category',
    'Report: Budget by Item',
    'Report: Current Month Request Summary'
  ];
  
  var fixedCount = 0;
  
  for (var i = 0; i < reportSheets.length; i++) {
    var sheet = ss.getSheetByName(reportSheets[i]);
    if (!sheet) continue;
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    if (lastRow < 1 || lastCol < 1) continue;
    
    var range = sheet.getRange(1, 1, lastRow, lastCol);
    var formulas = range.getFormulas();
    var hasChanges = false;
    
    for (var row = 0; row < formulas.length; row++) {
      for (var col = 0; col < formulas[row].length; col++) {
        if (formulas[row][col] && formulas[row][col].indexOf('Transfer budget') > -1) {
          formulas[row][col] = formulas[row][col].replace(/Transfer budget/g, 'Transfer Commitment');
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      range.setFormulas(formulas);
      fixedCount++;
    }
  }
  
  ui.alert(
    'Report Formulas Fixed',
    'Updated ' + fixedCount + ' report sheet(s).\n\n' +
    'All references to "Transfer budget" have been changed to "Transfer Commitment".',
    ui.ButtonSet.OK
  );
}

// ============================================================================
// IN/OUT (NON-BUDGET) FORMULAS
// ============================================================================

function runNonBudgetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName("IN/OUT Planning Sheet");
  
  if (!sheet) {
    ui.alert('Error', 'IN/OUT Planning Sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  // ** Total USD ** //
  var cell = sheet.getRange("O" + lookuprange[0] + "O" + lookuprange[1]);
  cell.setFormula("=SUM(J6:N6)");
  
  // ** Total MXN ** //
  var cell = sheet.getRange("Q" + lookuprange[0] + "Q" + lookuprange[1]);
  cell.setFormula("=$Q$3*O6");
  
  // Transfer Month //
  var cell = sheet.getRange("S" + lookuprange[0] + "S" + lookuprange[1]);
  cell.setFormula("=$D$2");
  
  ui.alert(
    'Setup Complete',
    'IN/OUT formulas have been set up in rows 6-' + lookuprange[1] + '.\n\n' +
    'NEXT STEPS:\n' +
    '1. Enter a month in cell D2\n' +
    '2. Fill in request amounts in columns J-N\n' +
    '3. Use "Submit IN/OUT Request" to log',
    ui.ButtonSet.OK
  );
}

// ============================================================================
// REPORT REFRESH FUNCTIONS
// ============================================================================

// ** Report: Current Month Summary Budget Requests ** //
function refreshReportCurrentMonth() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Report: Current Month Request Summary");
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'Report sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var clearRange = sheet.getRange("G6:R");
  clearRange.clearContent();
  
  var cell = sheet.getRange("G6");
  cell.setFormula("=UNIQUE('Transfer Commitment'!G6:G)");
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  sheet.getRange("H"+lookuprange[0] + "H"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!H:H)))");
  sheet.getRange("I"+lookuprange[0] + "I"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!I:I)))");
  sheet.getRange("J"+lookuprange[0] + "J"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!J:J)))");
  sheet.getRange("K"+lookuprange[0] + "K"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!K:K)))");
  sheet.getRange("L"+lookuprange[0] + "L"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!L:L)))");
  sheet.getRange("M"+lookuprange[0] + "M"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!M:M)))");
  sheet.getRange("N"+lookuprange[0] + "N"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!N:N)))");
  sheet.getRange("O"+lookuprange[0] + "O"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!O:O)))");
  sheet.getRange("P"+lookuprange[0] + "P"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!P:P)))");
  sheet.getRange("Q"+lookuprange[0] + "Q"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!Q:Q)))");
  sheet.getRange("R"+lookuprange[0] + "R"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Budget Transfer Planning Sheet'!$G:$G,$G6,'Budget Transfer Planning Sheet'!R:R)))");
  
  SpreadsheetApp.getUi().alert('Success', 'Current Month Summary report refreshed!', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ** Report: Budget by Category ** //
function refreshReportBudgetByCategory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Report: Budget by Category");
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'Report sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var clearRange = sheet.getRange("G6:R");
  clearRange.clearContent();
  
  var cell = sheet.getRange("G6");
  cell.setFormula("=UNIQUE('Transfer Commitment'!G6:G)");
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  sheet.getRange("H"+lookuprange[0] + "H"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(IF($G$4='Transfer Commitment'!$H$5,SUM(FILTER('Transfer Commitment'!$H$6:$H,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$I$5,SUM(FILTER('Transfer Commitment'!$H$6:$I,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$J$5,SUM(FILTER('Transfer Commitment'!$H$6:$J,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$K$5,SUM(FILTER('Transfer Commitment'!$H$6:$K,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$L$5,SUM(FILTER('Transfer Commitment'!$H$6:$L,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$M$5,SUM(FILTER('Transfer Commitment'!$H$6:$M,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$N$5,SUM(FILTER('Transfer Commitment'!$H$6:$N,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$O$5,SUM(FILTER('Transfer Commitment'!$H$6:$O,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$P$5,SUM(FILTER('Transfer Commitment'!$H$6:$P,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$Q$5,SUM(FILTER('Transfer Commitment'!$H$6:$Q,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$R$5,SUM(FILTER('Transfer Commitment'!$H$6:$R,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$S$5,SUM(FILTER('Transfer Commitment'!$H$6:$S,$G6='Transfer Commitment'!$G$6:$G)),\"\"))))))))))))))");
  sheet.getRange("I"+lookuprange[0] + "I"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(IF($G$4='Transfer Commitment'!$H$5,SUM(FILTER('Transfer Commitment'!$V$6:$V,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$I$5,SUM(FILTER('Transfer Commitment'!$V$6:$W,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$J$5,SUM(FILTER('Transfer Commitment'!$V$6:$X,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$K$5,SUM(FILTER('Transfer Commitment'!$V$6:$Y,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$L$5,SUM(FILTER('Transfer Commitment'!$V$6:$Z,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$M$5,SUM(FILTER('Transfer Commitment'!$V$6:$AA,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$N$5,SUM(FILTER('Transfer Commitment'!$V$6:$AB,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$O$5,SUM(FILTER('Transfer Commitment'!$V$6:$AC,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$P$5,SUM(FILTER('Transfer Commitment'!$V$6:$AD,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$Q$5,SUM(FILTER('Transfer Commitment'!$V$6:$AE,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$R$5,SUM(FILTER('Transfer Commitment'!$V$6:$AF,$G6='Transfer Commitment'!$G$6:$G)),IF($G$4='Transfer Commitment'!$S$5,SUM(FILTER('Transfer Commitment'!$V$6:$AG,$G6='Transfer Commitment'!$G$6:$G)),\"\"))))))))))))))");
  sheet.getRange("J"+lookuprange[0] + "J"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!J:J)))");
  sheet.getRange("K"+lookuprange[0] + "K"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!K:K)))");
  sheet.getRange("L"+lookuprange[0] + "L"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!L:L)))");
  sheet.getRange("M"+lookuprange[0] + "M"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!M:M)))");
  sheet.getRange("N"+lookuprange[0] + "N"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!N:N)))");
  sheet.getRange("O"+lookuprange[0] + "O"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!O:O)))");
  sheet.getRange("P"+lookuprange[0] + "P"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!P:P)))");
  sheet.getRange("Q"+lookuprange[0] + "Q"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!Q:Q)))");
  sheet.getRange("R"+lookuprange[0] + "R"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!R:R)))");
  
  SpreadsheetApp.getUi().alert('Success', 'Budget by Category report refreshed!', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ** Report: Budget Category by Month ** //
function refreshReportBudgetCategoryByMonth() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Report: Budget Category by Month");
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'Report sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var clearRange = sheet.getRange("G6:R");
  clearRange.clearContent();
  
  var cell = sheet.getRange("G6");
  cell.setFormula("=UNIQUE('Transfer Commitment'!G6:G)");
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  sheet.getRange("H"+lookuprange[0] + "H"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(IF($M$1='Transfer Commitment'!$H$5,SUM(FILTER('Transfer Commitment'!$H$6:$H,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$I$5,SUM(FILTER('Transfer Commitment'!$H$6:$I,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$J$5,SUM(FILTER('Transfer Commitment'!$H$6:$J,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$K$5,SUM(FILTER('Transfer Commitment'!$H$6:$K,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$L$5,SUM(FILTER('Transfer Commitment'!$H$6:$L,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$M$5,SUM(FILTER('Transfer Commitment'!$H$6:$M,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$N$5,SUM(FILTER('Transfer Commitment'!$H$6:$N,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$O$5,SUM(FILTER('Transfer Commitment'!$H$6:$O,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$P$5,SUM(FILTER('Transfer Commitment'!$H$6:$P,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$Q$5,SUM(FILTER('Transfer Commitment'!$H$6:$Q,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$R$5,SUM(FILTER('Transfer Commitment'!$H$6:$R,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$S$5,SUM(FILTER('Transfer Commitment'!$H$6:$S,$G6='Transfer Commitment'!$G$6:$G)),\"\"))))))))))))))");
  sheet.getRange("I"+lookuprange[0] + "I"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(IF($M$1='Transfer Commitment'!$H$5,SUM(FILTER('Transfer Commitment'!$V$6:$V,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$I$5,SUM(FILTER('Transfer Commitment'!$V$6:$W,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$J$5,SUM(FILTER('Transfer Commitment'!$V$6:$X,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$K$5,SUM(FILTER('Transfer Commitment'!$V$6:$Y,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$L$5,SUM(FILTER('Transfer Commitment'!$V$6:$Z,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$M$5,SUM(FILTER('Transfer Commitment'!$V$6:$AA,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$N$5,SUM(FILTER('Transfer Commitment'!$V$6:$AB,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$O$5,SUM(FILTER('Transfer Commitment'!$V$6:$AC,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$P$5,SUM(FILTER('Transfer Commitment'!$V$6:$AD,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$Q$5,SUM(FILTER('Transfer Commitment'!$V$6:$AE,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$R$5,SUM(FILTER('Transfer Commitment'!$V$6:$AF,$G6='Transfer Commitment'!$G$6:$G)),IF($M$1='Transfer Commitment'!$S$5,SUM(FILTER('Transfer Commitment'!$V$6:$AG,$G6='Transfer Commitment'!$G$6:$G)),\"\"))))))))))))))");
  sheet.getRange("J"+lookuprange[0] + "J"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!J:J,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("K"+lookuprange[0] + "K"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!K:K,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("L"+lookuprange[0] + "L"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!L:L,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("M"+lookuprange[0] + "M"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!M:M,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("N"+lookuprange[0] + "N"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!N:N,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("O"+lookuprange[0] + "O"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!O:O,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("P"+lookuprange[0] + "P"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!P:P,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("Q"+lookuprange[0] + "Q"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!Q:Q,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  sheet.getRange("R"+lookuprange[0] + "R"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIFS('Log: YTD Budget'!R:R,'Log: YTD Budget'!$G:$G,$G6,'Log: YTD Budget'!$V:$V,$M$1)))");
  
  SpreadsheetApp.getUi().alert('Success', 'Budget Category by Month report refreshed!', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ** Report: Budget by Item ** //
function refreshReportBudgetByItem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Report: Budget by Item");
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'Report sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var clearRange = sheet.getRange("G6:R");
  clearRange.clearContent();
  
  var cell = sheet.getRange("A6");
  cell.setFormula("=UNIQUE('Transfer Commitment'!A6:G)");
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  sheet.getRange("H"+lookuprange[0] + "H"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(IF($G$4='Transfer Commitment'!$H$5,SUM(FILTER('Transfer Commitment'!$H$6:$H,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$I$5,SUM(FILTER('Transfer Commitment'!$H$6:$I,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$J$5,SUM(FILTER('Transfer Commitment'!$H$6:$J,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$K$5,SUM(FILTER('Transfer Commitment'!$H$6:$K,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$L$5,SUM(FILTER('Transfer Commitment'!$H$6:$L,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$M$5,SUM(FILTER('Transfer Commitment'!$H$6:$M,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$N$5,SUM(FILTER('Transfer Commitment'!$H$6:$N,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$O$5,SUM(FILTER('Transfer Commitment'!$H$6:$O,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$P$5,SUM(FILTER('Transfer Commitment'!$H$6:$P,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$Q$5,SUM(FILTER('Transfer Commitment'!$H$6:$Q,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$R$5,SUM(FILTER('Transfer Commitment'!$H$6:$R,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$S$5,SUM(FILTER('Transfer Commitment'!$H$6:$S,$A6='Transfer Commitment'!$A$6:$A)),\"\"))))))))))))))");
  sheet.getRange("I"+lookuprange[0] + "I"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(IF($G$4='Transfer Commitment'!$H$5,SUM(FILTER('Transfer Commitment'!$V$6:$V,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$I$5,SUM(FILTER('Transfer Commitment'!$V$6:$W,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$J$5,SUM(FILTER('Transfer Commitment'!$V$6:$X,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$K$5,SUM(FILTER('Transfer Commitment'!$V$6:$Y,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$L$5,SUM(FILTER('Transfer Commitment'!$V$6:$Z,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$M$5,SUM(FILTER('Transfer Commitment'!$V$6:$AA,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$N$5,SUM(FILTER('Transfer Commitment'!$V$6:$AB,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$O$5,SUM(FILTER('Transfer Commitment'!$V$6:$AC,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$P$5,SUM(FILTER('Transfer Commitment'!$V$6:$AD,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$Q$5,SUM(FILTER('Transfer Commitment'!$V$6:$AE,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$R$5,SUM(FILTER('Transfer Commitment'!$V$6:$AF,$A6='Transfer Commitment'!$A$6:$A)),IF($G$4='Transfer Commitment'!$S$5,SUM(FILTER('Transfer Commitment'!$V$6:$AG,$A6='Transfer Commitment'!$A$6:$A)),\"\"))))))))))))))");
  sheet.getRange("J"+lookuprange[0] + "J"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!J:J)))");
  sheet.getRange("K"+lookuprange[0] + "K"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!K:K)))");
  sheet.getRange("L"+lookuprange[0] + "L"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!L:L)))");
  sheet.getRange("M"+lookuprange[0] + "M"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!M:M)))");
  sheet.getRange("N"+lookuprange[0] + "N"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!N:N)))");
  sheet.getRange("O"+lookuprange[0] + "O"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!O:O)))");
  sheet.getRange("P"+lookuprange[0] + "P"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!P:P)))");
  sheet.getRange("Q"+lookuprange[0] + "Q"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!Q:Q)))");
  sheet.getRange("R"+lookuprange[0] + "R"+lookuprange[1]).setFormula("=IF(ISBLANK(G6),\"\",(SUMIF('Log: YTD Budget'!$A:$A,$A6,'Log: YTD Budget'!R:R)))");
  
  SpreadsheetApp.getUi().alert('Success', 'Budget by Item report refreshed!', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ** Report: IN/OUT by Category ** //
function refreshReportInOutByCategory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Report: Non-budget by Category");
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error', 'Report sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var clearRange = sheet.getRange("G6:R");
  clearRange.clearContent();
  
  var cell = sheet.getRange("G6");
  cell.setFormula("=UNIQUE('Log: YTD IN/OUT'!G6:G)");
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  sheet.getRange("J"+lookuprange[0] + "J"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!J:J)");
  sheet.getRange("K"+lookuprange[0] + "K"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!K:K)");
  sheet.getRange("L"+lookuprange[0] + "L"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!L:L)");
  sheet.getRange("M"+lookuprange[0] + "M"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!M:M)");
  sheet.getRange("N"+lookuprange[0] + "N"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!N:N)");
  sheet.getRange("O"+lookuprange[0] + "O"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!O:O)");
  sheet.getRange("Q"+lookuprange[0] + "Q"+lookuprange[1]).setFormula("=SUMIF('Log: YTD IN/OUT'!$G:$G,$G6,'Log: YTD IN/OUT'!Q:Q)");
  
  SpreadsheetApp.getUi().alert('Success', 'IN/OUT by Category report refreshed!', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================================================
// DIAGNOSTIC - Check Budget Setup
// ============================================================================

function checkBudgetSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var transferSheet = ss.getSheetByName("Transfer Commitment");
  var budgetSheet = ss.getSheetByName("Budget Transfer Planning Sheet");
  
  var issues = [];
  var info = [];
  
  // Check if named range 'budget' exists
  var namedRanges = ss.getNamedRanges();
  var budgetRangeExists = false;
  for (var i = 0; i < namedRanges.length; i++) {
    if (namedRanges[i].getName() === 'budget') {
      budgetRangeExists = true;
      info.push('✓ Named range "budget" exists: ' + namedRanges[i].getRange().getA1Notation());
      break;
    }
  }
  
  if (!budgetRangeExists) {
    issues.push('✗ Named range "budget" does NOT exist!');
    issues.push('  → Create it: Data > Named ranges > Add range');
    issues.push('  → Name: budget');
    issues.push('  → Range: Transfer Commitment!H6:S');
  }
  
  // Check month names in Transfer Commitment row 5
  if (transferSheet) {
    var monthRow = transferSheet.getRange("H5:S5").getValues()[0];
    info.push('\nMonth names in Transfer Commitment row 5:');
    for (var i = 0; i < monthRow.length; i++) {
      if (monthRow[i]) {
        info.push('  Column ' + String.fromCharCode(72 + i) + ': "' + monthRow[i] + '"');
      }
    }
  }
  
  // Check D2 value
  if (budgetSheet) {
    var d2Value = budgetSheet.getRange("D2").getValue();
    info.push('\nCurrent value in D2: "' + d2Value + '"');
    
    // Check if H6 has a formula
    var h6Formula = budgetSheet.getRange("H6").getFormula();
    if (h6Formula) {
      info.push('\n✓ Formula exists in H6');
      info.push('Formula: ' + h6Formula);
    } else {
      issues.push('\n✗ No formula in H6 - run "Setup Budget Formulas" first');
    }
  }
  
  var message = '';
  if (issues.length > 0) {
    message += 'ISSUES FOUND:\n' + issues.join('\n') + '\n\n';
  }
  if (info.length > 0) {
    message += 'INFO:\n' + info.join('\n');
  }
  
  ui.alert('Budget Setup Diagnostic', message, ui.ButtonSet.OK);
}

// ** Request this month's budget ** //
function autofillBudgetToRequest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Budget Transfer Planning Sheet")
  var source = sheet.getRange("I6:I");
  var destination = sheet.getRange("J6:J");
  var clearRange = sheet.getRange("J6:N");
  clearRange.clearContent();
  source.copyTo(destination, {contentsOnly:true});

}

// ============================================================================
// CURRENCY CONVERSION HELPER
// ============================================================================

function convertSelectedLocalToUSD() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getActiveRange();
  
  if (!range) {
    ui.alert('No Selection', 'Please select cells with local currency amounts to convert.', ui.ButtonSet.OK);
    return;
  }
  
  var exchangeRate = getExchangeRate();
  var localCurrency = getLocalCurrency();
  var values = range.getValues();
  var converted = [];
  var count = 0;
  
  for (var i = 0; i < values.length; i++) {
    var row = [];
    for (var j = 0; j < values[i].length; j++) {
      var value = values[i][j];
      if (typeof value === 'number' && value !== 0) {
        row.push(convertLocalToUSD(value));
        count++;
      } else {
        row.push(value);
      }
    }
    converted.push(row);
  }
  
  if (count === 0) {
    ui.alert('No Numbers', 'No numeric values found in selection.', ui.ButtonSet.OK);
    return;
  }
  
  range.setValues(converted);
  
  var exampleLocal = 0;
  var exampleUSD = 0;
  
  // Create currency-specific example
  switch(localCurrency) {
    case 'MXN':
      exampleLocal = 17000;
      break;
    case 'INR':
      exampleLocal = 83000;
      break;
    case 'NGN':
      exampleLocal = 1600000;
      break;
    default:
      exampleLocal = 17000;
  }
  
  exampleUSD = convertLocalToUSD(exampleLocal);
  
  ui.alert(
    'Conversion Complete',
    'Converted ' + count + ' amounts from ' + localCurrency + ' to USD\n' +
    'Exchange rate: ' + exchangeRate + ' ' + localCurrency + ' per USD\n\n' +
    'Example: ' + exampleLocal.toLocaleString() + ' ' + localCurrency + ' → $' + exampleUSD.toFixed(2) + ' USD',
    ui.ButtonSet.OK
  );
}

// Legacy function name for backward compatibility
function convertSelectedMXNtoUSD() {
  convertSelectedLocalToUSD();
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateRequest() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var errors = [];
  var warnings = [];
  
  // Check Budget Transfer Planning Sheet
  var budgetSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  if (budgetSheet) {
    var lastRow = budgetSheet.getLastRow();
    if (lastRow > 5) {
      var data = budgetSheet.getRange(6, 1, lastRow - 5, 15).getValues();
      var budgetCount = 0;
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (row[0] && row[0] !== '') {
          budgetCount++;
          
          // Check if Total USD (column O, index 14) is filled
          if (!row[14] || row[14] === 0) {
            warnings.push('Row ' + (i + 6) + ': Total USD is empty or zero');
          }
          
          // Check if Program (column G, index 6) is filled
          if (!row[6] || row[6] === '') {
            errors.push('Row ' + (i + 6) + ': Account/Program is empty');
          }
        }
      }
      
      if (budgetCount > 0) {
        warnings.push('Budget requests ready: ' + budgetCount + ' items');
      }
    }
  }
  
  // Check IN/OUT Planning Sheet
  var inoutSheet = ss.getSheetByName(SHEETS.INOUT_PLANNING);
  if (inoutSheet) {
    var lastRow = inoutSheet.getLastRow();
    if (lastRow > 5) {
      var data = inoutSheet.getRange(6, 1, lastRow - 5, 14).getValues();
      var inoutCount = 0;
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (row[0] && row[0] !== '') {
          inoutCount++;
          
          // Check if Total USD (column N, index 13) is filled
          if (!row[13] || row[13] === 0) {
            warnings.push('IN/OUT Row ' + (i + 6) + ': Total USD is empty or zero');
          }
          
          // Check if Account/Program (column F, index 5) is filled
          if (!row[5] || row[5] === '') {
            errors.push('IN/OUT Row ' + (i + 6) + ': Account/Program is empty');
          }
        }
      }
      
      if (inoutCount > 0) {
        warnings.push('IN/OUT requests ready: ' + inoutCount + ' items');
      }
    }
  }
  
  var message = '';
  
  if (errors.length === 0 && warnings.length === 0) {
    message = '⚠️ No requests found\n\nBoth Request sheets are empty.';
    ui.alert('Validation Results', message, ui.ButtonSet.OK);
  } else {
    if (errors.length > 0) {
      message += '❌ ERRORS (must fix before submit):\n' + errors.join('\n') + '\n\n';
    }
    if (warnings.length > 0) {
      message += '✅ READY:\n' + warnings.join('\n');
    }
    ui.alert('Validation Results', message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// SETUP IN/OUT REQUEST YTD FORMULAS
// ============================================================================

function runInOutRequestYTDFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName(SHEETS.INOUT_REQUEST_YTD);
  var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
  
  if (!sheet) {
    ui.alert('Error', 'IN/OUT Request YTD sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  if (!logSheet) {
    ui.alert('Error', 'Log: YTD In/Out sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  // Clear existing formulas
  var clearRange = sheet.getRange("G6:Q");
  clearRange.clearContent();
  
  // ** Account/Program (Column G) ** //
  var cell = sheet.getRange("G6");
  cell.setFormula("=UNIQUE('Log: YTD In/Out'!G6:G)");
  
  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();
  
  // ** Banorte USD (Column J) ** //
  var cell = sheet.getRange("J" + lookuprange[0] + "J" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!J:J)");
  
  // ** Local Account 2 USD (Column K) ** //
  var cell = sheet.getRange("K" + lookuprange[0] + "K" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!K:K)");
  
  // ** Local Account 3 USD (Column L) ** //
  var cell = sheet.getRange("L" + lookuprange[0] + "L" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!L:L)");
  
  // ** PNC USD (Column M) ** //
  var cell = sheet.getRange("M" + lookuprange[0] + "M" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!M:M)");
  
  // ** Payments to others USD (Column N) ** //
  var cell = sheet.getRange("N" + lookuprange[0] + "N" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!N:N)");
  
  // ** Total USD (Column O) ** //
  var cell = sheet.getRange("O" + lookuprange[0] + "O" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!O:O)");
  
  // ** Total MXN (Column Q) ** //
  var cell = sheet.getRange("Q" + lookuprange[0] + "Q" + lookuprange[1]);
  cell.setFormula("=SUMIF('Log: YTD In/Out'!$G:$G,$G6,'Log: YTD In/Out'!Q:Q)");
  
  ui.alert('Success', 'IN/OUT Request YTD formulas have been set up successfully!', ui.ButtonSet.OK);
}
