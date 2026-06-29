/**
 * ============================================================================
 * MULTI-CURRENCY BUDGET MANAGEMENT SYSTEM - PART 1: FOUNDATION
 * ============================================================================
 * Version: 2.2 | Updated: 2025-11-25
 * Changes: Adjusted to match CUN 2025 Monthly Transfer Request structure
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SITE_CONFIG = {
  'Mexico': { currency: 'MXN', symbol: '$', exchangeRateCell: 'Setup!C53', locale: 'es-MX', code: 'CUN' },
  'Nigeria': { currency: 'NGN', symbol: '₦', exchangeRateCell: 'Config!B3', locale: 'en-NG', code: 'NGA' },
  'India': { currency: 'INR', symbol: '₹', exchangeRateCell: 'Config!B4', locale: 'en-IN', code: 'IND' },
  'USA': { currency: 'USD', symbol: '$', exchangeRateCell: 'Config!B5', locale: 'en-US', code: 'USA' },
  'Haiti': { currency: 'USD', symbol: '$', exchangeRateCell: 'Config!B5', locale: 'en-US', code: 'HTI' },
  'Dominican Republic': { currency: 'USD', symbol: '$', exchangeRateCell: 'Config!B5', locale: 'en-US', code: 'DOM' }
};

const PROGRAMS = [
  'Strong Families Cancun',
  'Hope Program Cancun',
  'Reggio Emilia',
  'Transition Program Cancun',
  'All Programs Cancun',
  'International Operations'
];

// Account types for tracking
const ACCOUNT_TYPES = [
  'Local account 1 USD',
  'Local account 2 USD',
  'Local account 3 USD',
  'PNC USD',
  'Payments to others USD'
];

// Non-budget expense categories (from Setup sheet)
const NON_BUDGET_CATEGORIES = [
  'Mission Trips: Food',
  'Mission Trips: Projects',
  'Mission Trips',
  'Projects & Improvements',
  'Ministry Partnerships',
  'Mission Trips Tools',
  'Mission Trip Transportation',
  'Van',
  'Child Sponsorship Gifts',
  'Mission Trips Hotel',
  'Accounting',
  'Burress Donations All Programs'
];

const SHEETS = {
  SETUP: 'Setup',
  REQUEST_BUDGET: 'Request: Budget',
  REQUEST_NON_BUDGET: 'Request: Non-budget',
  SITE_RESOURCES: 'Site resources',
  SALARY_TRANSFERS: 'Salary transfers',
  FULL_BUDGET: 'Full budget',
  TRANSFER_BUDGET: 'Transfer budget',
  SUMMARY: 'Summary Budget Requests by Category: Chosen Month',
  LOG_REQUESTS: 'Log: Transfer Requests',
  LOG_DISBURSEMENTS: 'Log: Disbursements',
  LOG_YTD_SUMMARY: 'Log: YTD Summary'
};

// Month names for tracking
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================================================
// MENU SYSTEM
// ============================================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Management")
    .addSubMenu(ui.createMenu("📊 Budget Request")
      .addItem("Create Budget Request", "createBudgetRequest")
      .addItem("Create Non-Budget Request", "createNonBudgetRequest")
      .addItem("Submit Request", "submitTransferRequest"))
    .addSubMenu(ui.createMenu("💵 Finance")
      .addItem("Record USD Disbursement", "recordUSDDisbursement")
      .addItem("View Pending Requests", "viewPendingRequests"))
    .addSubMenu(ui.createMenu("📈 Reports")
      .addItem("Monthly Summary", "generateMonthlySummary")
      .addItem("YTD Summary", "generateYTDReport")
      .addItem("Transfer Request Report", "generateTransferRequestReport")
      .addItem("Budget vs Actual", "generateBudgetVsActual"))
    .addSubMenu(ui.createMenu("⚙️ Admin")
      .addItem("Update Exchange Rate", "updateExchangeRate")
      .addItem("Refresh Calculations", "refreshAllCalculations")
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
// SETUP FUNCTIONS
// ============================================================================

function getSetupConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSheet = ss.getSheetByName(SHEETS.SETUP);
  
  if (!setupSheet) {
    throw new Error('Setup sheet not found');
  }
  
  return {
    site: setupSheet.getRange('C14').getValue(),
    year: setupSheet.getRange('C15').getValue(),
    currency: setupSheet.getRange('C16').getValue(),
    localAccount1: setupSheet.getRange('C17').getValue(),
    localAccount2: setupSheet.getRange('C18').getValue(),
    localAccount3: setupSheet.getRange('C19').getValue(),
    exchangeRate: setupSheet.getRange('C53').getValue(),
    rateDate: setupSheet.getRange('C54').getValue()
  };
}

// ============================================================================
// CURRENCY FUNCTIONS
// ============================================================================

function getCurrencyForSite(site) {
  if (!SITE_CONFIG[site]) throw new Error('Unknown site: ' + site);
  return SITE_CONFIG[site];
}

function getExchangeRate() {
  var config = getSetupConfig();
  var rate = config.exchangeRate;
  
  if (!rate || rate <= 0) {
    throw new Error('Invalid exchange rate in Setup sheet');
  }
  
  return rate;
}

function convertToUSD(amount, fromCurrency) {
  if (fromCurrency === 'USD') return amount;
  var rate = getExchangeRate();
  return amount / rate;
}

function convertFromUSD(amount, toCurrency) {
  if (toCurrency === 'USD') return amount;
  var rate = getExchangeRate();
  return amount * rate;
}

function formatCurrency(amount, currency) {
  var symbol = '$';
  if (currency === 'MXN') symbol = '$';
  else if (currency === 'NGN') symbol = '₦';
  else if (currency === 'INR') symbol = '₹';
  
  return symbol + ' ' + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function updateExchangeRate() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.prompt(
    'Update Exchange Rate',
    'Enter new exchange rate (MXN per USD):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  var newRate = parseFloat(response.getResponseText());
  
  if (isNaN(newRate) || newRate <= 0) {
    ui.alert('Error', 'Invalid exchange rate. Please enter a positive number.', ui.ButtonSet.OK);
    return;
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSheet = ss.getSheetByName(SHEETS.SETUP);
  
  setupSheet.getRange('C53').setValue(newRate);
  setupSheet.getRange('C54').setValue(new Date());
  
  ui.alert('Success', 'Exchange rate updated to ' + newRate + '\nDate: ' + new Date().toLocaleDateString(), ui.ButtonSet.OK);
  
  refreshAllCalculations();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRequestID(program, month) {
  var config = getSetupConfig();
  var date = new Date();
  var year = config.year || date.getFullYear();
  var monthNum = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
  var progCode = program.substring(0, 4).toUpperCase();
  var random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return year + '-' + monthNum + '-' + config.site + '-' + progCode + '-' + random;
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

function refreshAllCalculations() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('Refresh Calculations', 'All formulas will be recalculated automatically.\n\nExchange rate changes will update all USD/MXN conversions.', ui.ButtonSet.OK);
}

function validateAllData() {
  var ui = SpreadsheetApp.getUi();
  var errors = [];
  
  try {
    // Validate Setup sheet
    var config = getSetupConfig();
    if (!config.site) errors.push('Site not configured in Setup sheet');
    if (!config.year) errors.push('Year not configured in Setup sheet');
    if (!config.currency) errors.push('Currency not configured in Setup sheet');
    if (!config.exchangeRate || config.exchangeRate <= 0) errors.push('Invalid exchange rate in Setup sheet');
    
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
    ui.alert('Validation Complete', 
             '✅ All checks passed!\n\n' +
             'Site: ' + config.site + '\n' +
             'Year: ' + config.year + '\n' +
             'Currency: ' + config.currency + '\n' +
             'Exchange Rate: ' + config.exchangeRate + '\n' +
             'Programs: ' + PROGRAMS.length + '\n' +
             'Sheets: ' + Object.keys(SHEETS).length, 
             ui.ButtonSet.OK);
  } else {
    ui.alert('Validation Errors', '❌ Issues found:\n\n' + errors.join('\n'), ui.ButtonSet.OK);
  }
}
