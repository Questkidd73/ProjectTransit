/**
 * ============================================================================
 * PART 3: FINANCE AND REPORTING FUNCTIONS
 * ============================================================================
 * Handles Finance disbursements and report generation
 */

function recordUSDDisbursement() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Record USD Disbursement',
    'Finance Department Instructions:\n\n' +
    '1. Go to "' + SHEETS.LOG_REQUESTS + '" sheet\n' +
    '2. Find requests with Status = "Requested"\n' +
    '3. Update the following columns:\n' +
    '   - Status: Change to "Disbursed"\n' +
    '   - Disbursement Date: Enter date sent\n' +
    '   - Reference Number: Enter wire/check number\n' +
    '   - Finance Notes: Add any notes\n\n' +
    '4. System will track in YTD summary',
    ui.ButtonSet.OK
  );
}

function viewPendingRequests() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_REQUESTS);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert('Error', 'Log sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) {
    SpreadsheetApp.getUi().alert('No Requests', 'No pending requests found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 22).getValues();
  var pending = [];
  var totalUSD = 0;
  var totalMXN = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var status = row[18]; // Column S: Status
    
    if (status === 'Requested') {
      pending.push({
        id: row[0],
        month: row[5],
        type: row[6],
        program: row[7],
        usd: row[15],
        mxn: row[16]
      });
      totalUSD += row[15] || 0;
      totalMXN += row[16] || 0;
    }
  }
  
  if (pending.length === 0) {
    SpreadsheetApp.getUi().alert('No Pending Requests', 'All requests have been processed.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var report = 'PENDING TRANSFER REQUESTS\n';
  report += '='.repeat(70) + '\n\n';
  report += 'Total Pending: ' + pending.length + ' requests\n';
  report += 'Total USD: $' + totalUSD.toFixed(2) + '\n';
  report += 'Total MXN: $' + totalMXN.toFixed(2) + '\n\n';
  report += '='.repeat(70) + '\n\n';
  
  for (var i = 0; i < Math.min(pending.length, 20); i++) {
    var req = pending[i];
    report += req.month + ' - ' + req.type + ' - ' + req.program + '\n';
    report += '  USD: $' + req.usd.toFixed(2) + ' | MXN: $' + req.mxn.toFixed(2) + '\n';
    report += '  ID: ' + req.id + '\n\n';
  }
  
  if (pending.length > 20) {
    report += '... and ' + (pending.length - 20) + ' more requests\n';
  }
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;">' + report + '</pre>'
  ).setWidth(800).setHeight(600);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Pending Transfer Requests');
}

function generateMonthlySummary() {
  var ui = SpreadsheetApp.getUi();
  
  var monthResponse = ui.prompt(
    'Monthly Summary',
    'Enter month (e.g., January, February, etc.):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;
  var month = monthResponse.getResponseText();
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_REQUESTS);
  
  if (!logSheet) {
    ui.alert('Error', 'Log sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  var config = getSetupConfig();
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('No Data', 'No requests found for ' + month, ui.ButtonSet.OK);
    return;
  }
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 22).getValues();
  var programTotals = {};
  var accountTotals = {
    'Local Account 1': 0,
    'Local Account 2': 0,
    'Local Account 3': 0,
    'PNC': 0,
    'Payments to Others': 0
  };
  var grandTotalUSD = 0;
  var grandTotalMXN = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowMonth = row[5];
    
    if (rowMonth === month) {
      var program = row[7];
      var usd = row[15] || 0;
      var mxn = row[16] || 0;
      
      if (!programTotals[program]) {
        programTotals[program] = {usd: 0, mxn: 0, items: 0};
      }
      
      programTotals[program].usd += usd;
      programTotals[program].mxn += mxn;
      programTotals[program].items++;
      
      accountTotals['Local Account 1'] += row[10] || 0;
      accountTotals['Local Account 2'] += row[11] || 0;
      accountTotals['Local Account 3'] += row[12] || 0;
      accountTotals['PNC'] += row[13] || 0;
      accountTotals['Payments to Others'] += row[14] || 0;
      
      grandTotalUSD += usd;
      grandTotalMXN += mxn;
    }
  }
  
  if (Object.keys(programTotals).length === 0) {
    ui.alert('No Data', 'No requests found for ' + month, ui.ButtonSet.OK);
    return;
  }
  
  var report = 'MONTHLY SUMMARY - ' + month + ' ' + config.year + '\n';
  report += 'Site: ' + config.site + ' | Currency: ' + config.currency + '\n';
  report += 'Exchange Rate: ' + config.exchangeRate + '\n';
  report += '='.repeat(70) + '\n\n';
  
  report += 'BY PROGRAM:\n';
  report += '-'.repeat(70) + '\n';
  for (var program in programTotals) {
    var totals = programTotals[program];
    report += program.padEnd(40) + 
              ('$' + totals.usd.toFixed(2)).padStart(15) + 
              ('$' + totals.mxn.toFixed(2)).padStart(15) + '\n';
  }
  report += '-'.repeat(70) + '\n\n';
  
  report += 'BY ACCOUNT:\n';
  report += '-'.repeat(70) + '\n';
  for (var account in accountTotals) {
    var total = accountTotals[account];
    if (total > 0) {
      report += account.padEnd(40) + ('$' + total.toFixed(2)).padStart(15) + '\n';
    }
  }
  report += '-'.repeat(70) + '\n\n';
  
  report += 'TOTALS:\n';
  report += 'Total USD: $' + grandTotalUSD.toFixed(2) + '\n';
  report += 'Total MXN: $' + grandTotalMXN.toFixed(2) + '\n';
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;">' + report + '</pre>'
  ).setWidth(800).setHeight(600);
  
  ui.showModalDialog(htmlOutput, 'Monthly Summary - ' + month);
}

function generateYTDReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var logSheet = ss.getSheetByName(SHEETS.LOG_REQUESTS);
  
  if (!logSheet) {
    ui.alert('Error', 'Log sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  var config = getSetupConfig();
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('No Data', 'No requests found for ' + config.year, ui.ButtonSet.OK);
    return;
  }
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 22).getValues();
  var programYTD = {};
  var monthlyTotals = {};
  var grandTotalUSD = 0;
  var grandTotalMXN = 0;
  var requestedUSD = 0;
  var disbursedUSD = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var year = row[4];
    
    if (year == config.year) {
      var program = row[7];
      var month = row[5];
      var usd = row[15] || 0;
      var mxn = row[16] || 0;
      var status = row[18];
      
      if (!programYTD[program]) {
        programYTD[program] = {usd: 0, mxn: 0};
      }
      programYTD[program].usd += usd;
      programYTD[program].mxn += mxn;
      
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = {usd: 0, mxn: 0};
      }
      monthlyTotals[month].usd += usd;
      monthlyTotals[month].mxn += mxn;
      
      grandTotalUSD += usd;
      grandTotalMXN += mxn;
      
      if (status === 'Requested') {
        requestedUSD += usd;
      } else if (status === 'Disbursed') {
        disbursedUSD += usd;
      }
    }
  }
  
  var report = 'YEAR-TO-DATE SUMMARY - ' + config.year + '\n';
  report += 'Site: ' + config.site + ' | Currency: ' + config.currency + '\n';
  report += '='.repeat(70) + '\n\n';
  
  report += 'BY PROGRAM:\n';
  report += '-'.repeat(70) + '\n';
  for (var program in programYTD) {
    var totals = programYTD[program];
    report += program.padEnd(40) + 
              ('$' + totals.usd.toFixed(2)).padStart(15) + 
              ('$' + totals.mxn.toFixed(2)).padStart(15) + '\n';
  }
  report += '-'.repeat(70) + '\n\n';
  
  report += 'BY MONTH:\n';
  report += '-'.repeat(70) + '\n';
  for (var i = 0; i < MONTHS.length; i++) {
    var month = MONTHS[i];
    if (monthlyTotals[month]) {
      var totals = monthlyTotals[month];
      report += month.padEnd(40) + 
                ('$' + totals.usd.toFixed(2)).padStart(15) + 
                ('$' + totals.mxn.toFixed(2)).padStart(15) + '\n';
    }
  }
  report += '-'.repeat(70) + '\n\n';
  
  report += 'SUMMARY:\n';
  report += 'Total Requested YTD (USD): $' + grandTotalUSD.toFixed(2) + '\n';
  report += 'Total Requested YTD (MXN): $' + grandTotalMXN.toFixed(2) + '\n';
  report += 'Pending (USD): $' + requestedUSD.toFixed(2) + '\n';
  report += 'Disbursed (USD): $' + disbursedUSD.toFixed(2) + '\n';
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;">' + report + '</pre>'
  ).setWidth(800).setHeight(600);
  
  ui.showModalDialog(htmlOutput, 'YTD Summary - ' + config.year);
}

function generateTransferRequestReport() {
  var ui = SpreadsheetApp.getUi();
  
  var monthResponse = ui.prompt(
    'Transfer Request Report',
    'Enter month for transfer request:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;
  var month = monthResponse.getResponseText();
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_REQUESTS);
  
  if (!logSheet) {
    ui.alert('Error', 'Log sheet not found.', ui.ButtonSet.OK);
    return;
  }
  
  var config = getSetupConfig();
  var lastRow = logSheet.getLastRow();
  var data = logSheet.getRange(6, 1, lastRow - 5, 22).getValues();
  
  var report = 'TRANSFER REQUEST - ' + config.site + ' - ' + month + ' ' + config.year + '\n';
  report += 'Currency: ' + config.currency + ' (Rate: ' + config.exchangeRate + ')\n';
  report += '='.repeat(70) + '\n\n';
  
  var programRequests = {};
  var grandTotalUSD = 0;
  var grandTotalMXN = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (row[5] === month && row[18] === 'Requested') {
      var program = row[7];
      var description = row[8];
      var usd = row[15] || 0;
      var mxn = row[16] || 0;
      
      if (!programRequests[program]) {
        programRequests[program] = {items: [], totalUSD: 0, totalMXN: 0};
      }
      
      programRequests[program].items.push({desc: description, usd: usd, mxn: mxn});
      programRequests[program].totalUSD += usd;
      programRequests[program].totalMXN += mxn;
      grandTotalUSD += usd;
      grandTotalMXN += mxn;
    }
  }
  
  for (var program in programRequests) {
    report += 'Program: ' + program + '\n';
    report += '-'.repeat(70) + '\n';
    
    var items = programRequests[program].items;
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      report += '  ' + item.desc.padEnd(35) + 
                ('$' + item.usd.toFixed(2)).padStart(12) + ' USD  ' +
                ('$' + item.mxn.toFixed(2)).padStart(12) + ' MXN\n';
    }
    
    report += '-'.repeat(70) + '\n';
    report += '  Program Total:'.padEnd(37) + 
              ('$' + programRequests[program].totalUSD.toFixed(2)).padStart(12) + ' USD  ' +
              ('$' + programRequests[program].totalMXN.toFixed(2)).padStart(12) + ' MXN\n\n';
  }
  
  report += '='.repeat(70) + '\n';
  report += 'TOTAL TRANSFER NEEDED:'.padEnd(37) + 
            ('$' + grandTotalUSD.toFixed(2)).padStart(12) + ' USD  ' +
            ('$' + grandTotalMXN.toFixed(2)).padStart(12) + ' MXN\n';
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;">' + report + '</pre>'
  ).setWidth(900).setHeight(700);
  
  ui.showModalDialog(htmlOutput, 'Transfer Request - ' + month);
}

function generateBudgetVsActual() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Budget vs Actual',
    'This report compares budgeted amounts to actual disbursements.\n\n' +
    'Check the "' + SHEETS.FULL_BUDGET + '" sheet for full budget details\n' +
    'and "' + SHEETS.LOG_REQUESTS + '" for actual disbursements.\n\n' +
    'Filter by Status = "Disbursed" to see completed transfers.',
    ui.ButtonSet.OK
  );
}
