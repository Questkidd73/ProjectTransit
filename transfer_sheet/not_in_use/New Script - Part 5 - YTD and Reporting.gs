/**
 * ============================================================================
 * PART 5: YTD SUMMARY AND REPORTING FUNCTIONS
 * ============================================================================
 */

function updateYTDSummaryFromLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ytdSheet = ss.getSheetByName(SHEETS.LOG_YTD_SUMMARY);
  
  if (!ytdSheet) {
    SpreadsheetApp.getUi().alert('Error', 'YTD Summary sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var currentYear = new Date().getFullYear();
  
  // Get unique site/program combinations from all log sheets
  var combinations = getUniqueSiteProgramCombinations();
  
  // Clear existing YTD data (keep headers)
  var lastRow = ytdSheet.getLastRow();
  if (lastRow > 5) {
    ytdSheet.getRange(6, 1, lastRow - 5, ytdSheet.getLastColumn()).clearContent();
  }
  
  var ytdData = [];
  
  for (var i = 0; i < combinations.length; i++) {
    var combo = combinations[i];
    var site = combo.site;
    var program = combo.program;
    var currency = getCurrencyForSite(site).currency;
    
    // Calculate totals from each log sheet
    var localIncome = calculateLocalIncomeTotals(site, program, currentYear);
    var usTransfer = calculateUSTransferTotals(site, program, currentYear);
    var inOut = calculateInOutTotals(site, program, currentYear);
    
    ytdData.push([
      currentYear,                                    // A: Year
      site,                                           // B: Site
      program,                                        // C: Program
      currency,                                       // D: Local Currency Code
      localIncome.budgetedLocal,                      // E: YTD Budgeted Local Income (Local)
      usTransfer.budgetedLocal,                       // F: YTD Budgeted US Transfer (Local)
      inOut.budgetedLocal,                            // G: YTD Budgeted IN/OUT Net (Local)
      localIncome.budgetedLocal + usTransfer.budgetedLocal + inOut.budgetedLocal, // H: YTD Total Budget (Local)
      localIncome.budgetedUSD + usTransfer.budgetedUSD + inOut.budgetedUSD,       // I: YTD Total Budget (USD)
      localIncome.actualLocal,                        // J: YTD Actual Local Income (Local)
      usTransfer.actualLocal,                         // K: YTD Actual US Transfer (Local)
      inOut.actualLocal,                              // L: YTD Actual IN/OUT Net (Local)
      localIncome.actualLocal + usTransfer.actualLocal + inOut.actualLocal,       // M: YTD Total Actual (Local)
      localIncome.actualUSD + usTransfer.actualUSD + inOut.actualUSD,             // N: YTD Total Actual (USD)
      (localIncome.actualLocal + usTransfer.actualLocal + inOut.actualLocal) - 
      (localIncome.budgetedLocal + usTransfer.budgetedLocal + inOut.budgetedLocal), // O: YTD Variance (Local)
      (localIncome.actualUSD + usTransfer.actualUSD + inOut.actualUSD) - 
      (localIncome.budgetedUSD + usTransfer.budgetedUSD + inOut.budgetedUSD),       // P: YTD Variance (USD)
      usTransfer.usdSentByFinance,                    // Q: YTD USD Actually Spent by Finance
      usTransfer.localReceived,                       // R: YTD Local Currency Actually Sent
      usTransfer.exchangeImpact,                      // S: Exchange Rate Impact
      new Date(),                                     // T: Last Updated
      getCurrentUser()                                // U: Updated By
    ]);
  }
  
  if (ytdData.length > 0) {
    ytdSheet.getRange(6, 1, ytdData.length, 21).setValues(ytdData);
  }
}

function getUniqueSiteProgramCombinations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var combinations = [];
  var seen = {};
  
  // Check all three log sheets
  var logSheets = [
    SHEETS.LOG_LOCAL_INCOME,
    SHEETS.LOG_US_TRANSFER,
    SHEETS.LOG_IN_OUT
  ];
  
  for (var s = 0; s < logSheets.length; s++) {
    var sheet = ss.getSheetByName(logSheets[s]);
    if (!sheet) continue;
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 6) continue;
    
    var data = sheet.getRange(6, 4, lastRow - 5, 2).getValues(); // Columns D & E (Site & Program)
    
    for (var i = 0; i < data.length; i++) {
      var site = data[i][0];
      var program = data[i][1];
      
      if (site && program) {
        var key = site + '|' + program;
        if (!seen[key]) {
          seen[key] = true;
          combinations.push({site: site, program: program});
        }
      }
    }
  }
  
  return combinations;
}

function calculateLocalIncomeTotals(site, program, year) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_LOCAL_INCOME);
  
  var totals = {
    budgetedLocal: 0,
    budgetedUSD: 0,
    actualLocal: 0,
    actualUSD: 0
  };
  
  if (!logSheet) return totals;
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) return totals;
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 19).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var logSite = row[3];      // Column D
    var logProgram = row[4];   // Column E
    var logYear = new Date(row[1]).getFullYear(); // Column B (Timestamp)
    
    if (logSite === site && logProgram === program && logYear === year) {
      totals.budgetedLocal += row[8] || 0;  // Column I
      totals.budgetedUSD += row[14] || 0;   // Column O
      totals.actualLocal += row[10] || 0;   // Column K
      totals.actualUSD += row[15] || 0;     // Column P
    }
  }
  
  return totals;
}

function calculateUSTransferTotals(site, program, year) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_US_TRANSFER);
  
  var totals = {
    budgetedLocal: 0,
    budgetedUSD: 0,
    actualLocal: 0,
    actualUSD: 0,
    usdSentByFinance: 0,
    localReceived: 0,
    exchangeImpact: 0
  };
  
  if (!logSheet) return totals;
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) return totals;
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 23).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var logSite = row[3];
    var logProgram = row[4];
    var logYear = new Date(row[1]).getFullYear();
    
    if (logSite === site && logProgram === program && logYear === year) {
      totals.budgetedLocal += row[8] || 0;   // Column I: Requested Local
      totals.budgetedUSD += row[10] || 0;    // Column K: Requested USD
      totals.actualLocal += row[14] || 0;    // Column O: Actual Local Received
      totals.actualUSD += row[12] || 0;      // Column M: Actual USD Sent
      totals.usdSentByFinance += row[12] || 0; // Column M
      totals.localReceived += row[14] || 0;  // Column O
      
      // Calculate exchange rate impact
      var requestedRate = row[11] || 0;      // Column L
      var actualRate = row[13] || 0;         // Column N
      var usdSent = row[12] || 0;            // Column M
      
      if (requestedRate > 0 && actualRate > 0 && usdSent > 0) {
        var expectedLocal = usdSent * requestedRate;
        var actualLocal = usdSent * actualRate;
        totals.exchangeImpact += (actualLocal - expectedLocal);
      }
    }
  }
  
  return totals;
}

function calculateInOutTotals(site, program, year) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_IN_OUT);
  
  var totals = {
    budgetedLocal: 0,
    budgetedUSD: 0,
    actualLocal: 0,
    actualUSD: 0
  };
  
  if (!logSheet) return totals;
  
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) return totals;
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 20).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var logSite = row[4];
    var logProgram = row[5];
    var logYear = new Date(row[1]).getFullYear();
    var type = row[3]; // IN or OUT
    
    if (logSite === site && logProgram === program && logYear === year) {
      var multiplier = (type === 'IN') ? 1 : -1;
      
      totals.budgetedLocal += (row[9] || 0) * multiplier;  // Column J
      totals.budgetedUSD += (row[15] || 0) * multiplier;   // Column P
      totals.actualLocal += (row[11] || 0) * multiplier;   // Column L
      totals.actualUSD += (row[16] || 0) * multiplier;     // Column Q
    }
  }
  
  return totals;
}

// ============================================================================
// REPORT GENERATION FUNCTIONS
// ============================================================================

function generateYTDReport() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'YTD Summary Report',
    'The YTD Summary has been updated.\n\n' +
    'Check the "' + SHEETS.LOG_YTD_SUMMARY + '" sheet for:\n' +
    '- Budget vs Actual by Program\n' +
    '- Local Currency and USD totals\n' +
    '- Variances and Exchange Rate Impact',
    ui.ButtonSet.OK
  );
  
  updateYTDSummaryFromLogs();
}

function generateFinanceDeptReport() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Finance Department Report',
    'Finance Report shows:\n\n' +
    '1. All USD disbursements by site/program\n' +
    '2. Pending transfer requests\n' +
    '3. Reconciliation status\n' +
    '4. Total USD spent YTD\n\n' +
    'Check "' + SHEETS.LOG_US_TRANSFER + '" sheet\n' +
    'Filter by Status for pending items.',
    ui.ButtonSet.OK
  );
}

function generateSiteReconciliationReport() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Site Reconciliation Report',
    'Site Reconciliation shows:\n\n' +
    '1. Expected vs Actual local currency received\n' +
    '2. Exchange rate variances\n' +
    '3. Outstanding confirmations\n\n' +
    'Check "' + SHEETS.LOG_US_TRANSFER + '" sheet\n' +
    'Review columns O-Q for variances.',
    ui.ButtonSet.OK
  );
}

function generateExchangeRateImpactReport() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Exchange Rate Impact Report',
    'Exchange Rate Impact shows:\n\n' +
    '1. Currency gains/losses by site\n' +
    '2. Budgeted vs Actual rates\n' +
    '3. Impact on program budgets\n\n' +
    'Check "' + SHEETS.LOG_YTD_SUMMARY + '" sheet\n' +
    'Column S shows exchange rate impact.',
    ui.ButtonSet.OK
  );
}

function generateItemizedTransferRequest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(SHEETS.LOG_US_TRANSFER);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert('Error', 'Transfer log sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var ui = SpreadsheetApp.getUi();
  
  // Prompt for site
  var siteResponse = ui.prompt(
    'Generate Transfer Request',
    'Enter site name (e.g., Mexico, Nigeria, India):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (siteResponse.getSelectedButton() !== ui.Button.OK) return;
  var site = siteResponse.getResponseText();
  
  // Prompt for month
  var monthResponse = ui.prompt(
    'Generate Transfer Request',
    'Enter month (e.g., January 2025):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;
  var month = monthResponse.getResponseText();
  
  // Get data for this site with Status = "Requested"
  var lastRow = logSheet.getLastRow();
  if (lastRow < 6) {
    ui.alert('No Data', 'No transfer requests found.', ui.ButtonSet.OK);
    return;
  }
  
  var data = logSheet.getRange(6, 1, lastRow - 5, 23).getValues();
  var currency = getCurrencyForSite(site).currency;
  var exchangeRate = getExchangeRate(currency);
  
  var report = 'TRANSFER REQUEST - ' + site + ' - ' + month + '\n';
  report += 'Currency: ' + currency + ' (Rate: ' + exchangeRate + ')\n';
  report += '='.repeat(70) + '\n\n';
  
  var programTotals = {};
  var grandTotalLocal = 0;
  var grandTotalUSD = 0;
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowSite = row[3];
    var rowStatus = row[20];
    
    if (rowSite === site && rowStatus === 'Requested') {
      var program = row[4];
      var item = row[5];
      var localAmount = row[8] || 0;
      var usdAmount = row[10] || 0;
      
      if (!programTotals[program]) {
        programTotals[program] = {items: [], totalLocal: 0, totalUSD: 0};
      }
      
      programTotals[program].items.push({item: item, local: localAmount, usd: usdAmount});
      programTotals[program].totalLocal += localAmount;
      programTotals[program].totalUSD += usdAmount;
      
      grandTotalLocal += localAmount;
      grandTotalUSD += usdAmount;
    }
  }
  
  if (Object.keys(programTotals).length === 0) {
    ui.alert('No Data', 'No pending transfer requests for ' + site, ui.ButtonSet.OK);
    return;
  }
  
  for (var program in programTotals) {
    report += 'Program: ' + program + '\n';
    report += '-'.repeat(70) + '\n';
    
    var items = programTotals[program].items;
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      report += '  ' + item.item.padEnd(40) + 
                formatCurrency(item.local, currency).padStart(15) + 
                '  $' + item.usd.toFixed(2).padStart(10) + '\n';
    }
    
    report += '-'.repeat(70) + '\n';
    report += '  Program Subtotal:'.padEnd(40) + 
              formatCurrency(programTotals[program].totalLocal, currency).padStart(15) + 
              '  $' + programTotals[program].totalUSD.toFixed(2).padStart(10) + '\n\n';
  }
  
  report += '='.repeat(70) + '\n';
  report += 'TOTAL TRANSFER NEEDED:'.padEnd(40) + 
            formatCurrency(grandTotalLocal, currency).padStart(15) + 
            '  $' + grandTotalUSD.toFixed(2).padStart(10) + '\n';
  
  // Display report
  var htmlOutput = HtmlService.createHtmlOutput(
    '<pre style="font-family:monospace;font-size:12px;">' + report + '</pre>'
  ).setWidth(800).setHeight(600);
  
  ui.showModalDialog(htmlOutput, 'Itemized Transfer Request - ' + site);
}
