/**
 * ============================================================================
 * CUN BUDGET MANAGEMENT SYSTEM - PART 1: FOUNDATION
 * ============================================================================
 * Version: 3.0 | Updated: 2025-11-25
 * Purpose: Works with existing CUN 2025 Monthly Transfer Request template
 * Changes: Integrated with existing Log sheets and Report structure
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

// Sheet names - ACTUAL CURRENT STRUCTURE (After Phase 1)
const SHEETS = {
  // Core sheets
  SETUP: 'Setup',
  FULL_BUDGET: 'Full Budget',
  TRANSFER_COMMITMENT: 'Transfer Commitment',
  
  // Planning sheets (renamed from Request sheets)
  BUDGET_PLANNING: 'Budget Transfer Planning Sheet',
  INOUT_PLANNING: 'IN/OUT Planning Sheet',
  
  // Transfer Requests (monthly and YTD)
  TRANSFER_REQUESTS_MONTHLY: 'Transfer Requests: monthly',
  TRANSFER_REQUESTS_YTD: 'Transfer Requests: YTD',
  
  // IN/OUT tracking
  INOUT_REQUEST_YTD: 'IN/OUT Request YTD',
  
  // Reports
  REPORT_BUDGET_CATEGORY_BY_MONTH: 'Report budget category by month',
  REPORT_BUDGET_BY_ITEM: 'Report: Budget by Item',
  
  // Log sheets
  LOG_YTD_BUDGET: 'Log: YTD Budget',
  LOG_YTD_INOUT: 'Log: YTD In/Out',
  
  // Other core sheets
  SALARIES: 'Salary Transfers',
  SITE_RESOURCES: 'Site Resources',
  
  // FIN tabs (keeping original names for now)
  FIN_TRANSFERS_BY_ACCOUNT: 'FIN: Transfers by account',
  FIN_TRANSFERS_IN_USD: 'FIN: Transfers in USD',
  FIN_RATES: 'FIN: Rates',
  
  // Aliases for backward compatibility
  REQUEST_BUDGET: 'Budget Transfer Planning Sheet',
  REQUEST_NON_BUDGET: 'IN/OUT Planning Sheet',
  LOG_YTD_NON_BUDGET: 'Log: YTD In/Out'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================================================
// MENU SYSTEM
// ============================================================================

// ============================================================================
// AUTO-SETUP TRIGGER
// ============================================================================

function onEdit(e) {
  // Auto-run budget formulas when D2 is changed in Budget Transfer Planning Sheet
  if (!e) return;
  
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  // Check if edit was in Budget Transfer Planning Sheet, cell D2
  if (sheet.getName() === "Budget Transfer Planning Sheet" && 
      range.getA1Notation() === "D2") {
    // Check if formulas already exist in H6
    var h6 = sheet.getRange("H6").getFormula();
    if (!h6 || h6 === "") {
      // Formulas don't exist, run setup
      runBudgetFormulas();
    }
    // If formulas exist, they'll auto-calculate with the new D2 value
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Management")
    .addItem("Setup Budget Formulas", "runBudgetFormulas")
    .addItem("Autofill Budget → Month", "autofillBudgetToRequest")
    .addItem("Submit Budget Request", "submitBudgetRequest")
    .addSeparator()
    .addItem("Run IN/OUT Formulas", "runNonBudgetFormulas")
    .addItem("Submit IN/OUT Request", "submitNonBudgetRequest")
    .addItem("Setup IN/OUT Request YTD Formulas", "runInOutRequestYTDFormulas")
    .addSeparator()
    .addItem("🔍 Diagnose Budget Setup", "checkBudgetSetup")
    .addSeparator()
    .addItem("Convert Selected Local Currency → USD", "convertSelectedLocalToUSD")
    .addItem("Validate Before Submit", "validateRequest")
    .addSeparator()
    .addSubMenu(ui.createMenu("💵 Finance")
      .addItem("View Pending Requests", "viewPendingRequests")
      .addItem("Approve Requests", "approveRequests")
      .addItem("View YTD Summary", "viewYTDSummary")
      .addSeparator()
      .addItem("Record Finalization Date (Instructions)", "recordFinalizationDate"))
    .addSeparator()
    .addSubMenu(ui.createMenu("📊 Reports")
      .addItem("Refresh: Current Month Summary", "refreshReportCurrentMonth")
      .addItem("Refresh: Budget by Category", "refreshReportBudgetByCategory")
      .addItem("Refresh: Budget Category by Month", "refreshReportBudgetCategoryByMonth")
      .addItem("Refresh: Budget by Item", "refreshReportBudgetByItem")
      .addItem("Refresh: IN/OUT by Category", "refreshReportInOutByCategory"))
    .addSeparator()
    .addItem("Clear Planning Sheets", "clearRequestSheets")
    .addItem("Validate All Data", "validateAllData")
    .addSeparator()
    .addItem("🔧 Fix Report Formulas (Transfer budget → Transfer Commitment)", "fixReportFormulas")
    .addToUi();
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSheet = ss.getSheetByName(SHEETS.SETUP);
  
  if (!setupSheet) return [];
  
  var categories = [];
  var startRow = 22;
  var maxRows = 20;
  
  for (var i = 0; i < maxRows; i++) {
    var value = setupSheet.getRange('C' + (startRow + i)).getValue();
    if (value && value.toString().trim() !== '') {
      categories.push(value.toString().trim());
    }
  }
  
  return categories;
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

function updateExchangeRate() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.prompt(
    'Update Exchange Rate',
    'Enter new budget exchange rate (MXN per USD):\n\nCurrent rate: ' + getExchangeRate(),
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
}

function formatCurrency(amount, currency) {
  var symbol = '$';
  
  for (var siteCode in SITE_CONFIG) {
    if (SITE_CONFIG[siteCode].currency === currency) {
      symbol = SITE_CONFIG[siteCode].symbol;
      break;
    }
  }
  
  return symbol + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ============================================================================
// CURRENCY CONVERSION FUNCTIONS
// ============================================================================
// These functions work for ANY currency (MXN, INR, NGN, etc.)
// They use the exchange rate from Setup sheet (C53)

function convertLocalToUSD(localAmount) {
  var rate = getExchangeRate();
  if (!localAmount || localAmount === 0) return 0;
  return localAmount / rate;
}

function convertUSDtoLocal(usdAmount) {
  var rate = getExchangeRate();
  if (!usdAmount || usdAmount === 0) return 0;
  return usdAmount * rate;
}

// Legacy function names for backward compatibility
function convertMXNtoUSD(mxnAmount) {
  return convertLocalToUSD(mxnAmount);
}

function convertUSDtoMXN(usdAmount) {
  return convertUSDtoLocal(usdAmount);
}

function getLocalCurrency() {
  var config = getSetupConfig();
  return config.currency || 'MXN';
}

function getLocalCurrencySymbol() {
  var currency = getLocalCurrency();
  var config = getSetupConfig();
  var siteCode = config.site;
  
  if (SITE_CONFIG[siteCode]) {
    return SITE_CONFIG[siteCode].symbol;
  }
  return '$';
}

function formatLocalCurrency(amount) {
  var currency = getLocalCurrency();
  return formatCurrency(amount, currency);
}

function formatUSD(amount) {
  return '$' + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Smart detection: Is this amount likely in local currency or USD?
function isLikelyLocalCurrency(amount) {
  if (!amount || amount === 0) return false;
  
  var currency = getLocalCurrency();
  
  // Different thresholds for different currencies
  switch(currency) {
    case 'MXN':
      return amount > 1000;  // MXN amounts typically > 1000
    case 'INR':
      return amount > 5000;  // INR amounts typically > 5000
    case 'NGN':
      return amount > 50000; // NGN amounts typically > 50000
    case 'USD':
      return false;          // Already USD
    default:
      return amount > 1000;  // Default threshold
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getCurrentUser() {
  return Session.getActiveUser().getEmail();
}

function getLastRowInColumn(sheet, column) {
  var data = sheet.getRange(1, column, sheet.getMaxRows(), 1).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== '' && data[i][0] !== null) return i + 1;
  }
  return 5; // Start after header row
}

function getCurrentMonth() {
  var date = new Date();
  return MONTHS[date.getMonth()];
}

function clearRequestSheets() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Clear Planning Sheets',
    'This will clear:\n' +
    '- Budget Transfer Planning Sheet: columns H-R and month (D2)\n' +
    '- IN/OUT Planning Sheet: all data rows\n\n' +
    'Are you sure? This cannot be undone.',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear Budget Transfer Planning Sheet - only columns H-R and D2
  var budgetSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  if (budgetSheet) {
    var lastRow = budgetSheet.getLastRow();
    if (lastRow > 5) {
      // Clear columns H-R (8-18) - requested amounts and calculations
      budgetSheet.getRange(6, 8, lastRow - 5, 11).clearContent();
    }
    // Clear month in D2
    budgetSheet.getRange('D2').clearContent();
  }
  
  // Clear IN/OUT Planning Sheet (starting from row 6)
  var inoutSheet = ss.getSheetByName(SHEETS.INOUT_PLANNING);
  if (inoutSheet) {
    var lastRow = inoutSheet.getLastRow();
    if (lastRow > 5) {
      inoutSheet.getRange(6, 1, lastRow - 5, 21).clearContent();
    }
  }
  
  ui.alert('Success', 'Planning sheets have been cleared.', ui.ButtonSet.OK);
}

function refreshAllReports() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Refresh Reports',
    'All report formulas will be recalculated automatically.\n\n' +
    'This may take a few moments for large datasets.',
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
    
    // Validate site code
    if (config.site && !SITE_CONFIG[config.site]) {
      warnings.push('Site code "' + config.site + '" not in SITE_CONFIG');
    }
    
    // Validate required sheets exist
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requiredSheets = [
      SHEETS.SETUP,
      SHEETS.FULL_BUDGET,
      SHEETS.TRANSFER_COMMITMENT,
      SHEETS.BUDGET_PLANNING,
      SHEETS.INOUT_PLANNING,
      SHEETS.LOG_YTD_BUDGET,
      SHEETS.LOG_YTD_INOUT,
      SHEETS.SALARIES,
      SHEETS.SITE_RESOURCES
    ];
    
    for (var i = 0; i < requiredSheets.length; i++) {
      if (!ss.getSheetByName(requiredSheets[i])) {
        errors.push('Required sheet missing: ' + requiredSheets[i]);
      }
    }
    
    // Validate programs
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
              'Non-Budget Categories: ' + categories.length;
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
