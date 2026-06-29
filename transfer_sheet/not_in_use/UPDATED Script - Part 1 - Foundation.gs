/**
 * ============================================================================
 * MULTI-CURRENCY BUDGET MANAGEMENT SYSTEM - PART 1: FOUNDATION
 * ============================================================================
 * Version: 2.1 | Updated: 2025-11-24
 * Changes: Added PROGRAMS constant, updated menu for Program Budget Summary
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SITE_CONFIG = {
  'Mexico': { currency: 'MXN', symbol: '$', exchangeRateCell: 'Config!B2', locale: 'es-MX' },
  'Nigeria': { currency: 'NGN', symbol: '₦', exchangeRateCell: 'Config!B3', locale: 'en-NG' },
  'India': { currency: 'INR', symbol: '₹', exchangeRateCell: 'Config!B4', locale: 'en-IN' },
  'USA': { currency: 'USD', symbol: '$', exchangeRateCell: 'Config!B5', locale: 'en-US' },
  'Haiti': { currency: 'USD', symbol: '$', exchangeRateCell: 'Config!B5', locale: 'en-US' },
  'Dominican Republic': { currency: 'USD', symbol: '$', exchangeRateCell: 'Config!B5', locale: 'en-US' }
};

const PROGRAMS = [
  'Strong Families Cancun',
  'Hope Program Cancun',
  'Reggio Emilia',
  'Transition Program Cancun',
  'All Programs Cancun',
  'International Operations'
];

const SHEETS = {
  CONFIG: 'Config',
  LOCAL_INCOME_BUDGET: 'Budget Planning: Local Income',
  US_TRANSFER_BUDGET: 'Budget Planning: US Transfer',
  IN_OUT_BUDGET: 'IN/OUT Budget',
  PROGRAM_SUMMARY: 'Program Summary',
  LOG_LOCAL_INCOME: 'Log: Local Income Budget',
  LOG_US_TRANSFER: 'Log: US Transfer Budget',
  LOG_IN_OUT: 'Log: IN/OUT Budget',
  LOG_YTD_SUMMARY: 'Log: YTD Summary',
  LOG_FINANCE_USD: 'Log: Finance USD Tracking',
  LOG_LOCAL_RECEIPTS: 'Log: Local Currency Receipts'
};

// ============================================================================
// MENU SYSTEM
// ============================================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Management")
    .addSubMenu(ui.createMenu("📊 Local Income")
      .addItem("Run Formulas", "runLocalIncomeBudgetFormulas")
      .addItem("Log Budget", "logLocalIncomeBudget")
      .addItem("Enter Actuals", "enterLocalIncomeActuals"))
    .addSubMenu(ui.createMenu("💵 US Transfer")
      .addItem("Run Formulas", "runUSTransferBudgetFormulas")
      .addItem("Submit Request", "submitTransferRequest")
      .addItem("Finance: Record USD", "recordUSDDisbursement")
      .addItem("Site: Confirm Receipt", "confirmLocalCurrencyReceipt"))
    .addSubMenu(ui.createMenu("💰 IN/OUT (USD Only)")
      .addItem("Run Formulas", "runInOutBudgetFormulas")
      .addItem("Log Transaction", "logInOutTransaction"))
    .addSubMenu(ui.createMenu("📈 Reports")
      .addItem("YTD Summary", "generateYTDReport")
      .addItem("Finance Report (by Transfer Date)", "generateFinanceDeptReport")
      .addItem("Site Report (by Budget Month)", "generateSiteReconciliationReport")
      .addItem("Transfer Request (Line Items)", "generateItemizedTransferRequest")
      .addItem("Program Budget Summary", "generateProgramBudgetSummary"))
    .addSubMenu(ui.createMenu("⚙️ Admin")
      .addItem("Update Rates", "updateExchangeRates")
      .addItem("Validate Data", "validateAllData")
      .addItem("Open Script", "openAppScript"))
    .addToUi();
}

function openAppScript() {
  var scriptID = ScriptApp.getScriptId();
  openUrl('https://script.google.com/home/projects/' + scriptID + '/edit');
}

function openUrl(url) {
  var html = HtmlService.createHtmlOutput(
    '<html><script>window.open("' + url + '");google.script.host.close();</script></html>'
  ).setWidth(90).setHeight(1);
  SpreadsheetApp.getUi().showModalDialog(html, "Opening...");
}

// ============================================================================
// CURRENCY FUNCTIONS
// ============================================================================

function getCurrencyForSite(site) {
  if (!SITE_CONFIG[site]) throw new Error('Unknown site: ' + site);
  return SITE_CONFIG[site];
}

function getExchangeRate(currency) {
  if (currency === 'USD') return 1;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(SHEETS.CONFIG);
  if (!configSheet) throw new Error('Config sheet not found');
  
  for (var site in SITE_CONFIG) {
    if (SITE_CONFIG[site].currency === currency) {
      var rate = configSheet.getRange(SITE_CONFIG[site].exchangeRateCell).getValue();
      if (!rate || rate <= 0) throw new Error('Invalid rate for ' + currency);
      return rate;
    }
  }
  throw new Error('Unknown currency: ' + currency);
}

function convertToUSD(amount, fromCurrency) {
  return fromCurrency === 'USD' ? amount : amount / getExchangeRate(fromCurrency);
}

function convertFromUSD(amount, toCurrency) {
  return toCurrency === 'USD' ? amount : amount * getExchangeRate(toCurrency);
}

function formatCurrency(amount, currency) {
  var symbol = '$';
  for (var site in SITE_CONFIG) {
    if (SITE_CONFIG[site].currency === currency) {
      symbol = SITE_CONFIG[site].symbol;
      break;
    }
  }
  return symbol + ' ' + amount.toFixed(2);
}

function updateExchangeRates() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert('Update Exchange Rates', 'Update rates in Config sheet?', ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) return;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(SHEETS.CONFIG);
  if (!configSheet) {
    ui.alert('Error', 'Config sheet not found', ui.ButtonSet.OK);
    return;
  }
  
  configSheet.getRange('D1').setValue('Last Updated: ' + new Date().toLocaleString());
  ui.alert('Success', 'Exchange rates updated!', ui.ButtonSet.OK);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateLogID(site, program) {
  var date = new Date();
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var siteCode = site.substring(0, 3).toUpperCase();
  var progCode = program.substring(0, 4).toUpperCase();
  var random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return year + '-' + month + '-' + siteCode + '-' + progCode + '-' + random;
}

function getCurrentUser() {
  return Session.getActiveUser().getEmail();
}

function getLastRowInColumn(sheet, column) {
  var data = sheet.getRange(1, column, sheet.getMaxRows(), 1).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== '') return i + 1;
  }
  return 1;
}

function validateAllData() {
  var ui = SpreadsheetApp.getUi();
  var errors = [];
  
  try {
    // Validate exchange rates
    for (var site in SITE_CONFIG) {
      var currency = SITE_CONFIG[site].currency;
      if (currency !== 'USD') {
        var rate = getExchangeRate(currency);
        if (!rate || rate <= 0) errors.push('Invalid rate for ' + currency);
      }
    }
    
    // Validate required sheets exist
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    for (var sheetKey in SHEETS) {
      var sheetName = SHEETS[sheetKey];
      if (!ss.getSheetByName(sheetName)) {
        errors.push('Missing sheet: ' + sheetName);
      }
    }
    
    // Validate programs are configured
    if (!PROGRAMS || PROGRAMS.length === 0) {
      errors.push('No programs configured');
    }
    
  } catch (e) {
    errors.push('Error: ' + e.message);
  }
  
  if (errors.length === 0) {
    ui.alert('Validation Complete', 'All checks passed!\n\nSites: ' + Object.keys(SITE_CONFIG).length + 
             '\nPrograms: ' + PROGRAMS.length + '\nSheets: ' + Object.keys(SHEETS).length, ui.ButtonSet.OK);
  } else {
    ui.alert('Validation Errors', errors.join('\n'), ui.ButtonSet.OK);
  }
}
