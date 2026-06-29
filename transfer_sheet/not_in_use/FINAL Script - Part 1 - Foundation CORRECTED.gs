/**
 * ============================================================================
 * MULTI-CURRENCY BUDGET MANAGEMENT SYSTEM - PART 1: FOUNDATION
 * ============================================================================
 * Version: 2.3 | Updated: 2025-11-25
 * Changes: Corrected based on actual Setup.csv structure
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SITE_CONFIG = {
  'CUN': { name: 'Cancun', currency: 'MXN', symbol: '$', locale: 'es-MX' },
  'CUL': { name: 'Culiacan', currency: 'MXN', symbol: '$', locale: 'es-MX' },
  'LIN': { name: 'Linares', currency: 'MXN', symbol: '$', locale: 'es-MX' },
  'MTY': { name: 'Monterrey', currency: 'MXN', symbol: '$', locale: 'es-MX' },
  'MZT': { name: 'Mazatlan', currency: 'MXN', symbol: '$', locale: 'es-MX' },
  'IND': { name: 'India', currency: 'INR', symbol: '₹', locale: 'en-IN' },
  'NIG': { name: 'Nigeria', currency: 'NGN', symbol: '₦', locale: 'en-NG' },
  'HTI': { name: 'Haiti', currency: 'USD', symbol: '$', locale: 'en-US' },
  'DOM': { name: 'Dominican Republic', currency: 'USD', symbol: '$', locale: 'en-US' },
  'CIN': { name: 'Cincinnati', currency: 'USD', symbol: '$', locale: 'en-US' }
};

const PROGRAMS = [
  'Strong Families Cancun',
  'Hope Program Cancun',
  'Reggio Emilia',
  'Transition Program Cancun',
  'All Programs Cancun',
  'International Operations'
];

// Account types for tracking (from Setup sheet)
const ACCOUNT_TYPES = [
  'Local account 1 USD',  // e.g., Banorte for CUN
  'Local account 2 USD',
  'Local account 3 USD',
  'PNC USD',
  'Payments to others USD'
];

// Non-budget expense categories (from Setup sheet C22-C33)
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
  'Anniversary Award',
  'Buress Donations All Programs'
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
    site: setupSheet.getRange('C14').getValue(),              // Site code (e.g., CUN)
    year: setupSheet.getRange('C15').getValue(),              // Current year (e.g., 2025)
    currency: setupSheet.getRange('C16').getValue(),          // Currency code (e.g., MXN)
    localAccount1: setupSheet.getRange('C17').getValue(),     // e.g., Banorte
    localAccount2: setupSheet.getRange('C18').getValue(),     // Local account 2
    localAccount3: setupSheet.getRange('C19').getValue(),     // Local account 3
    exchangeRate: setupSheet.getRange('C53').getValue(),      // Budget exchange rate
    rateDate: setupSheet.getRange('C54').getValue()           // Rate date
  };
}

function getNonBudgetCategories() {
  // Read from Setup sheet C22 onwards
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSheet = ss.getSheetByName(SHEETS.SETUP);
  
  if (!setupSheet) return NON_BUDGET_CATEGORIES;
  
  var categories = [];
  var startRow = 22;
  var maxRows = 20; // Read up to 20 categories
  
  for (var i = 0; i < maxRows; i++) {
    var value = setupSheet.getRange('C' + (startRow + i)).getValue();
    if (value && value.toString().trim() !== '') {
      categories.push(value.toString().trim());
    }
  }
  
  return categories.length > 0 ? categories : NON_BUDGET_CATEGORIES;
}

// ============================================================================
// CURRENCY FUNCTIONS
// ============================================================================

function getCurrencyForSite(siteCode) {
  if (!SITE_CONFIG[siteCode]) throw new Error('Unknown site: ' + siteCode);
  return SITE_CONFIG[siteCode];
}

function getExchangeRate() {
  var config = getSetupConfig();
  var rate = config.exchangeRate;
  
  if (!rate || rate <= 0) {
    throw new Error('Invalid exchange rate in Setup sheet (C53)');
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
  
  for (var siteCode in SITE_CONFIG) {
    if (SITE_CONFIG[siteCode].currency === currency) {
      symbol = SITE_CONFIG[siteCode].symbol;
      break;
    }
  }
  
  return symbol + ' ' + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function updateExchangeRate() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.prompt(
    'Update Exchange Rate',
    'Enter new budget exchange rate (local currency per USD):\n\nExample: 17 for MXN, 83 for INR, 1580 for NGN',
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
  setupSheet.getRange('C54').setValue('Rate on: ' + new Date().toLocaleDateString());
  
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
  ui.alert(
    'Refresh Calculations', 
    'All formulas will be recalculated automatically.\n\n' +
    'Exchange rate changes will update all USD/local currency conversions.\n\n' +
    'Note: This may take a few moments for large spreadsheets.',
    ui.ButtonSet.OK
  );
  SpreadsheetApp.flush();
}

function validateAllData() {
  var ui = SpreadsheetApp.getUi();
  var errors = [];
  var warnings = [];
  
  try {
    // Validate Setup sheet
    var config = getSetupConfig();
    if (!config.site) errors.push('Site not configured in Setup!C14');
    if (!config.year) errors.push('Year not configured in Setup!C15');
    if (!config.currency) errors.push('Currency not configured in Setup!C16');
    if (!config.exchangeRate || config.exchangeRate <= 0) errors.push('Invalid exchange rate in Setup!C53');
    
    // Validate site code is recognized
    if (config.site && !SITE_CONFIG[config.site]) {
      warnings.push('Site code "' + config.site + '" not in SITE_CONFIG. Available: ' + Object.keys(SITE_CONFIG).join(', '));
    }
    
    // Validate required sheets exist
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    for (var sheetKey in SHEETS) {
      var sheetName = SHEETS[sheetKey];
      if (!ss.getSheetByName(sheetName)) {
        if (sheetName.indexOf('Log:') === 0) {
          warnings.push('Optional sheet missing: ' + sheetName);
        } else {
          errors.push('Required sheet missing: ' + sheetName);
        }
      }
    }
    
    // Validate programs are configured
    if (!PROGRAMS || PROGRAMS.length === 0) {
      errors.push('No programs configured');
    }
    
    // Validate non-budget categories
    var categories = getNonBudgetCategories();
    if (categories.length === 0) {
      warnings.push('No non-budget categories found in Setup sheet');
    }
    
  } catch (e) {
    errors.push('Error: ' + e.message);
  }
  
  var message = '';
  
  if (errors.length === 0 && warnings.length === 0) {
    message = '✅ All checks passed!\n\n' +
              'Site: ' + config.site + ' (' + (SITE_CONFIG[config.site] ? SITE_CONFIG[config.site].name : 'Unknown') + ')\n' +
              'Year: ' + config.year + '\n' +
              'Currency: ' + config.currency + '\n' +
              'Exchange Rate: ' + config.exchangeRate + '\n' +
              'Programs: ' + PROGRAMS.length + '\n' +
              'Non-Budget Categories: ' + getNonBudgetCategories().length + '\n' +
              'Sheets: ' + Object.keys(SHEETS).length;
    ui.alert('Validation Complete', message, ui.ButtonSet.OK);
  } else {
    if (errors.length > 0) {
      message += '❌ ERRORS:\n' + errors.join('\n') + '\n\n';
    }
    if (warnings.length > 0) {
      message += '⚠️ WARNINGS:\n' + warnings.join('\n');
    }
    ui.alert('Validation Results', message, ui.ButtonSet.OK);
  }
}
