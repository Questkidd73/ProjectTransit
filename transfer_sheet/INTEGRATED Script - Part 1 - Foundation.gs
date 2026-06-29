/**
 * ============================================================================
 * CUN BUDGET MANAGEMENT SYSTEM - PART 1: FOUNDATION (V4.0)
 * ============================================================================
 * Version: 4.0 | Updated: 2025-12-12
 * Purpose: Updated for new Budget Entry structure with program-level requests
 * Changes: New sheet structure, updated column mappings, exchange rate from File Setup
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
  'Hope Program Cancun',
  'International Operations',
  'Reggio Emilia',
  'Strong Families Cancun',
  'Transition Program Cancun',
  'All Programs Cancun'
];

// Sheet names - NEW STRUCTURE (V4.0)
const SHEETS = {
  // Core setup sheets
  SETUP: 'Setup',
  FILE_SETUP: 'File setup',
  
  // Budget sheets
  TOTAL_BUDGET: 'Total budget',
  TRANSFER_BUDGET: 'Local budget',
  BUDGET_PLANNING: 'Spending Plan',
  BUDGET_REQUEST: 'Budget transfer request',
  TRANSFER_REQUEST: 'Budget Request',
  
  // IN/OUT sheets
  INOUT_REQUEST: 'In/Out Request',
  
  // Log sheets (keeping existing structure for now)
  LOG_YTD_BUDGET: 'Log: YTD Budget',
  LOG_YTD_INOUT: 'Log: YTD In/Out',
  LOG_YTD_SPENDING_PLAN: 'Log: YTD Spending Plan',
  
  // FIN tabs
  FIN_TRANSFERS_BY_ACCOUNT: 'FIN: Transfers by account',
  FIN_TRANSFERS_IN_USD: 'FIN: Transfers in USD',
  FIN_RATES: 'FIN: Rates'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Authorized users for logging budget requests
const AUTHORIZED_USERS = [
  'phoneck@back2back.org',
  'jmorgan@back2back.org',
  'dmoss@back2back.org',
  'snewcomer@back2back.org',
  'thesson@back2back.org',
  'jlantz@back2back.org',
  'ssheckler@back2back.org',
  'clantz@back2back.org',
  'tguckenberger@back2back.org'
];

// ============================================================================
// MENU SYSTEM
// ============================================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Management")
    .addItem("📋 Autofill Spending Plan", "autofillSpendingPlan")
    .addItem("📋 Autofill Budget Request", "autofillBudgetRequest")
    .addSeparator()
    .addItem("Log Budget Request", "submitBudgetRequest")
    .addItem("Log IN/OUT Request", "submitInOutRequest")
    .addSeparator()
    .addSubMenu(ui.createMenu("🗑️ Clear Sheets")
      .addItem("Clear Spending Plan & Budget Request", "clearSpendingPlanAndBudgetRequest")
      .addItem("Clear In/Out Request", "clearInOutRequest")
      .addSeparator()
      .addItem("Clear All Request Sheets", "clearAllRequestSheets")
      .addSeparator()
      .addItem("Clear Log: YTD Budget", "clearLogYTDBudget")
      .addItem("Clear Log: YTD In/Out", "clearLogYTDInOut")
      .addItem("Clear Log: YTD Spending Plan", "clearLogYTDSpendingPlan")
      .addSeparator()
      .addItem("Remove Color Formatting", "removeAllConditionalFormatting"))
    .addSeparator()
    .addItem("🔍 Diagnose Setup", "checkSetup")
    .addToUi();
}

// Auto-sync month when changed in D2 of Spending Plan
function onEdit(e) {
  if (!e || !e.range) return;
  
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var sheetName = sheet.getName();
  var cell = range.getA1Notation();
  
  // Only respond to D2 edits
  if (cell !== 'D2') return;
  
  // Check if edit was in cell D2 of Spending Plan sheet
  if (sheetName === SHEETS.BUDGET_PLANNING) {
    runBudgetRequestFormulas(); // Copies budget VALUES to columns I & O (not formulas)
    syncMonthToTransferRequest(); // Syncs month to other sheets
  }
  
  // Check if edit was in cell D2 of Budget Request sheet
  if (sheetName === SHEETS.TRANSFER_REQUEST) {
    runBudgetRequestSheetFormulas(); // Updates month-dynamic formulas in Budget Request (preserves F-J as user input)
  }
  
  // No formula setting on D2 edits for IN/OUT Request - formulas are manually placed and never overwritten
}

// Sync month from Spending Plan to both Budget Request and In/Out Request (D2 only - no formulas)
function syncMonthToTransferRequest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  var budgetSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  var inoutSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  
  if (!planningSheet) return;
  
  var month = planningSheet.getRange("D2").getValue();
  if (month) {
    // Sync to Budget Request - set D2 value AND update formulas to be month-dynamic
    if (budgetSheet) {
      budgetSheet.getRange("D2").setValue(month);
      runBudgetRequestSheetFormulas(); // Update formulas to reference correct month column
    }
    
    // Sync to In/Out Request - only set D2 value, do NOT set formulas
    if (inoutSheet) {
      inoutSheet.getRange("D2").setValue(month);
    }
  }
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

function isAuthorizedToLog() {
  var userEmail = Session.getActiveUser().getEmail();
  return AUTHORIZED_USERS.indexOf(userEmail) !== -1;
}

// ============================================================================
// EXCHANGE RATE FUNCTIONS
// ============================================================================

function getExchangeRate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fileSetupSheet = ss.getSheetByName(SHEETS.FILE_SETUP);
  
  if (!fileSetupSheet) {
    throw new Error('File setup sheet not found');
  }
  
  // Exchange rate is in File Setup sheet F8 (primary location used by all formulas)
  var rate = fileSetupSheet.getRange("F8").getValue();
  
  if (!rate || rate <= 0) {
    throw new Error('Invalid exchange rate in File Setup sheet (F8). Please set a valid rate.');
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
    ui.alert(
      'Error',
      'Invalid exchange rate. Please enter a positive number.\n\n---\n\nTipo de cambio inválido. Por favor ingrese un número positivo.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fileSetupSheet = ss.getSheetByName(SHEETS.FILE_SETUP);
  
  // Update I18 by default
  fileSetupSheet.getRange("I18").setValue(newRate);
  
  ui.alert(
    'Success / Éxito',
    'Exchange rate updated to: ' + newRate + '\n\n---\n\nTipo de cambio actualizado a: ' + newRate,
    ui.ButtonSet.OK
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getLastRowInColumn(sheet, column) {
  // Use built-in getLastRow() for better performance
  var lastRow = sheet.getLastRow();
  
  // If sheet is empty or lastRow < 1, return 0
  if (lastRow < 1) return 0;
  
  // Cap at 300 rows maximum for performance (never need to check beyond this)
  var maxRowsToCheck = Math.min(lastRow, 300);
  
  // Read only up to 300 rows or last row with content (whichever is less)
  var data = sheet.getRange(1, column, maxRowsToCheck, 1).getValues();
  
  // Loop backward to find last non-empty cell in this column
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== '' && data[i][0] !== null) {
      return i + 1;
    }
  }
  return 0;
}

function clearRequestSheets() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Clear Request Sheets',
    'This will clear all data from Budget Request and IN/OUT Request sheets.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear Budget Request (rows 4+, columns J-AE)
  var budgetSheet = ss.getSheetByName(SHEETS.BUDGET_REQUEST);
  if (budgetSheet) {
    var lastRow = budgetSheet.getLastRow();
    if (lastRow >= 4) {
      budgetSheet.getRange(4, 10, lastRow - 3, 22).clearContent(); // J-AE
    }
  }
  
  // Clear IN/OUT Request (rows 4+, columns J, M, N, O, Q, W-AE)
  var inoutSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  if (inoutSheet) {
    var lastRow = inoutSheet.getLastRow();
    if (lastRow >= 4) {
      inoutSheet.getRange(4, 10, lastRow - 3, 1).clearContent(); // J
      inoutSheet.getRange(4, 13, lastRow - 3, 3).clearContent(); // M-O
      inoutSheet.getRange(4, 17, lastRow - 3, 1).clearContent(); // Q
      inoutSheet.getRange(4, 23, lastRow - 3, 9).clearContent(); // W-AE
    }
  }
  
  ui.alert('Success', 'Request sheets have been cleared.', ui.ButtonSet.OK);
}

function checkSetup() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var messages = [];
  
  // Check all required sheets exist
  var requiredSheets = [
    SHEETS.FILE_SETUP,
    SHEETS.TOTAL_BUDGET,
    SHEETS.BUDGET_PLANNING,
    SHEETS.BUDGET_REQUEST,
    SHEETS.INOUT_REQUEST,
    SHEETS.LOG_YTD_BUDGET,
    SHEETS.LOG_YTD_INOUT
  ];
  
  for (var i = 0; i < requiredSheets.length; i++) {
    var sheet = ss.getSheetByName(requiredSheets[i]);
    if (!sheet) {
      messages.push('❌ Missing sheet: ' + requiredSheets[i]);
    } else {
      messages.push('✅ Found sheet: ' + requiredSheets[i]);
    }
  }
  
  // Check exchange rate
  try {
    var rate = getExchangeRate();
    messages.push('✅ Exchange rate: ' + rate);
  } catch (e) {
    messages.push('❌ Exchange rate error: ' + e.message);
  }
  
  ui.alert('Setup Diagnostic', messages.join('\n'), ui.ButtonSet.OK);
}
