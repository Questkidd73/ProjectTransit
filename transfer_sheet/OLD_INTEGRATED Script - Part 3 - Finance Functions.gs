/**
 * ============================================================================
 * PART 3: FINANCE FUNCTIONS
 * ============================================================================
 * Handles Finance Department operations on Log sheets
 */

function recordFinalizationDate() {
  var ui = SpreadsheetApp.getUi();
  
  ui.alert(
    'Record Finalization Date',
    'Finance Department Instructions:\n\n' +
    '1. Go to "Log: YTD Budget" or "Log: YTD IN/OUT" sheet\n' +
    '2. Find the requests you want to finalize\n' +
    '3. In column W (Date of Finalization), enter today\'s date\n' +
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
  
  var pendingBudget = [];
  var pendingInout = [];
  var totalUSD = 0;
  
  // Check Budget Log
  if (budgetSheet) {
    var lastRow = budgetSheet.getLastRow();
    if (lastRow > 5) {
      var data = budgetSheet.getRange(6, 1, lastRow - 5, 24).getValues();
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var key = row[0];
        var program = row[6];
        var totalUSD = row[14];
        var month = row[21];
        var finalizationDate = row[22];
        
        // If no finalization date, it's pending
        if (key && (!finalizationDate || finalizationDate === '')) {
          pendingBudget.push({
            key: key,
            program: program,
            usd: totalUSD || 0,
            month: month || 'Not set',
            row: i + 6
          });
          totalUSD += (totalUSD || 0);
        }
      }
    }
  }
  
  // Check IN/OUT Log
  if (inoutSheet) {
    var lastRow = inoutSheet.getLastRow();
    if (lastRow > 5) {
      var data = inoutSheet.getRange(6, 1, lastRow - 5, 21).getValues();
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var mainAccount = row[0];
        var program = row[5];
        var usd = row[13];
        var month = row[17];
        var finalizationDate = row[18];
        
        // If no finalization date, it's pending
        if (mainAccount && (!finalizationDate || finalizationDate === '')) {
          pendingInout.push({
            account: mainAccount,
            program: program,
            usd: usd || 0,
            month: month || 'Not set',
            row: i + 6
          });
          totalUSD += (usd || 0);
        }
      }
    }
  }
  
  if (pendingBudget.length === 0 && pendingInout.length === 0) {
    ui.alert('No Pending Requests', 'All requests have been finalized!', ui.ButtonSet.OK);
    return;
  }
  
  var report = 'PENDING REQUESTS (Not Finalized)\n';
  report += '='.repeat(80) + '\n\n';
  
  if (pendingBudget.length > 0) {
    report += 'BUDGET REQUESTS: ' + pendingBudget.length + ' items\n';
    report += '-'.repeat(80) + '\n';
    for (var i = 0; i < Math.min(pendingBudget.length, 20); i++) {
      var req = pendingBudget[i];
      report += 'Row ' + req.row + ' | KEY: ' + req.key + ' | ' + req.program + '\n';
      report += '  Month: ' + req.month + ' | USD: $' + req.usd.toFixed(2) + '\n\n';
    }
    if (pendingBudget.length > 20) {
      report += '... and ' + (pendingBudget.length - 20) + ' more budget requests\n';
    }
    report += '\n';
  }
  
  if (pendingInout.length > 0) {
    report += 'IN/OUT REQUESTS: ' + pendingInout.length + ' items\n';
    report += '-'.repeat(80) + '\n';
    for (var i = 0; i < Math.min(pendingInout.length, 20); i++) {
      var req = pendingInout[i];
      report += 'Row ' + req.row + ' | ' + req.account + ' | ' + req.program + '\n';
      report += '  Month: ' + req.month + ' | USD: $' + req.usd.toFixed(2) + '\n\n';
    }
    if (pendingInout.length > 20) {
      report += '... and ' + (pendingInout.length - 20) + ' more IN/OUT requests\n';
    }
  }
  
  report += '\n' + '='.repeat(80) + '\n';
  report += 'TOTAL PENDING: ' + (pendingBudget.length + pendingInout.length) + ' requests\n';
  report += 'TOTAL USD: $' + totalUSD.toFixed(2) + '\n\n';
  report += 'To finalize: Enter date in column W (Date of Finalization)';
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:11px;white-space:pre-wrap;">' + report + '</pre>'
  ).setWidth(900).setHeight(700);
  
  ui.showModalDialog(htmlOutput, 'Pending Requests');
}

function approveRequests() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var result = ui.alert(
    'Approve Requests',
    'This will set today\'s date as the finalization date for all pending requests.\n\n' +
    'Budget requests: Log: YTD Budget\n' +
    'Non-budget requests: Log: YTD Non-budget\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  var today = new Date();
  var budgetCount = 0;
  var nonBudgetCount = 0;
  
  // Approve Budget requests
  var budgetSheet = ss.getSheetByName(SHEETS.LOG_YTD_BUDGET);
  if (budgetSheet) {
    var lastRow = budgetSheet.getLastRow();
    if (lastRow > 5) {
      var data = budgetSheet.getRange(6, 23, lastRow - 5, 1).getValues(); // Column W
      
      for (var i = 0; i < data.length; i++) {
        if (!data[i][0] || data[i][0] === '') {
          // Check if row has data (check KEY in column A)
          var key = budgetSheet.getRange(i + 6, 1).getValue();
          if (key && key !== '') {
            budgetSheet.getRange(i + 6, 23).setValue(today); // Column W
            budgetCount++;
          }
        }
      }
    }
  }
  
  // Approve IN/OUT requests
  var inoutSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
  if (inoutSheet) {
    var lastRow = inoutSheet.getLastRow();
    if (lastRow > 5) {
      var data = inoutSheet.getRange(6, 19, lastRow - 5, 1).getValues(); // Column S
      
      for (var i = 0; i < data.length; i++) {
        if (!data[i][0] || data[i][0] === '') {
          // Check if row has data (check Main Account in column A)
          var mainAccount = inoutSheet.getRange(i + 6, 1).getValue();
          if (mainAccount && mainAccount !== '') {
            inoutSheet.getRange(i + 6, 19).setValue(today); // Column S
            inoutCount++;
          }
        }
      }
    }
  }
  
  if (budgetCount === 0 && nonBudgetCount === 0) {
    ui.alert('No Changes', 'All requests were already finalized.', ui.ButtonSet.OK);
  } else {
    ui.alert(
      'Success',
      'Requests approved!\n\n' +
      'Budget requests: ' + budgetCount + '\n' +
      'Non-budget requests: ' + nonBudgetCount + '\n' +
      'Finalization date: ' + today.toLocaleDateString(),
      ui.ButtonSet.OK
    );
  }
}

function viewCurrentMonthSummary() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var summarySheet = ss.getSheetByName(SHEETS.REPORT_CURRENT_MONTH);
  
  if (!summarySheet) {
    ui.alert('Error', 'Report: Current Month Request Summary sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  ui.alert(
    'Current Month Summary',
    'Check the "Report: Current Month Request Summary" sheet for details.\n\n' +
    'This report shows all requests for the current month.',
    ui.ButtonSet.OK
  );
  
  // Activate the sheet
  summarySheet.activate();
}

function viewYTDSummary() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var budgetSheet = ss.getSheetByName(SHEETS.LOG_YTD_BUDGET);
  var inoutSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
  
  if (!budgetSheet || !inoutSheet) {
    ui.alert('Error', 'YTD Log sheets not found.', ui.ButtonSet.OK);
    return;
  }
  
  var config = getSetupConfig();
  var programTotals = {};
  var monthlyTotals = {};
  var grandTotal = 0;
  
  // Process Budget Log
  var lastRow = budgetSheet.getLastRow();
  if (lastRow > 5) {
    var data = budgetSheet.getRange(6, 1, lastRow - 5, 24).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var program = row[6] || 'Unknown';
      var usd = row[14] || 0;
      var month = row[21] || 'Unknown';
      
      if (!programTotals[program]) programTotals[program] = 0;
      if (!monthlyTotals[month]) monthlyTotals[month] = 0;
      
      programTotals[program] += usd;
      monthlyTotals[month] += usd;
      grandTotal += usd;
    }
  }
  
  // Process IN/OUT Log
  lastRow = inoutSheet.getLastRow();
  if (lastRow > 5) {
    var data = inoutSheet.getRange(6, 1, lastRow - 5, 21).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var program = row[5] || 'Unknown';
      var usd = row[13] || 0;
      var month = row[17] || 'Unknown';
      
      if (!programTotals[program]) programTotals[program] = 0;
      if (!monthlyTotals[month]) monthlyTotals[month] = 0;
      
      programTotals[program] += usd;
      monthlyTotals[month] += usd;
      grandTotal += usd;
    }
  }
  
  var report = 'YEAR-TO-DATE SUMMARY - ' + config.year + '\n';
  report += 'Site: ' + config.site + ' (' + config.currency + ')\n';
  report += '='.repeat(80) + '\n\n';
  
  report += 'BY PROGRAM:\n';
  report += '-'.repeat(80) + '\n';
  for (var program in programTotals) {
    report += program.padEnd(50) + ('$' + programTotals[program].toFixed(2)).padStart(15) + '\n';
  }
  report += '\n';
  
  report += 'BY MONTH:\n';
  report += '-'.repeat(80) + '\n';
  for (var month in monthlyTotals) {
    report += month.padEnd(50) + ('$' + monthlyTotals[month].toFixed(2)).padStart(15) + '\n';
  }
  report += '\n';
  
  report += '='.repeat(80) + '\n';
  report += 'GRAND TOTAL (USD): $' + grandTotal.toFixed(2) + '\n';
  report += 'GRAND TOTAL (' + config.currency + '): $' + (grandTotal * config.exchangeRate).toFixed(2);
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;">' + report + '</pre>'
  ).setWidth(900).setHeight(700);
  
  ui.showModalDialog(htmlOutput, 'YTD Summary - ' + config.year);
}
