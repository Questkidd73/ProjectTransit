/**
 * ============================================================================
 * CUN BUDGET MANAGEMENT SYSTEM - PART 2: REQUEST SUBMISSION (V4.0)
 * ============================================================================
 * Version: 4.0 | Updated: 2025-12-12
 * Purpose: Handle Budget and IN/OUT request submissions with new structure
 */

// ============================================================================
// BUDGET REQUEST SUBMISSION
// ============================================================================

function submitBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check authorization
  if (!isAuthorizedToLog()) {
    ui.alert(
      'Access Denied / Acceso Denegado',
      'You do not have permission to log budget requests.\n\n' +
      'Please contact an administrator to log this request.\n\n' +
      '---\n\n' +
      'No tiene permiso para registrar solicitudes de presupuesto.\n\n' +
      'Por favor contacte a un administrador para registrar esta solicitud.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Get month from dropdown in Budget Request sheet (cell D2)
  var requestSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  
  if (!requestSheet) {
    ui.alert('Error', 'Budget Request sheet not found.\n\n---\n\nHoja de Budget Request no encontrada.', ui.ButtonSet.OK);
    return;
  }
  
  var month = requestSheet.getRange("D2").getValue();
  
  if (!month || month === '') {
    ui.alert(
      'Error',
      'Please select a month in cell D2 of the Budget Request sheet first.\n\n---\n\nPor favor seleccione un mes en la celda D2 de la hoja Budget Request primero.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Validate month
  if (MONTHS.indexOf(month) === -1) {
    ui.alert(
      'Error',
      'Invalid month in cell D2. Please select a valid month.\n\n---\n\nMes inválido en celda D2. Por favor seleccione un mes válido.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Confirm logging
  var result = ui.alert(
    'Confirm Logging / Confirmar Registro',
    'This will:\n' +
    '1. Copy Budget Request to Log: YTD Budget\n' +
    '2. Copy Spending Plan to Log: YTD Spending Plan\n' +
    '3. Set Transfer Month to: ' + month + '\n' +
    '4. Clear Spending Plan and Budget Request sheets\n\n' +
    'Continue?\n\n' +
    '---\n\n' +
    'Esto hará:\n' +
    '1. Copiar Budget Request a Log: YTD Budget\n' +
    '2. Copiar Spending Plan a Log: YTD Spending Plan\n' +
    '3. Establecer Mes de Transferencia a: ' + month + '\n' +
    '4. Limpiar hojas de Spending Plan y Budget Request\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    // Add timestamps to Spending Plan and Budget Request before logging
    addTimestampsToSpendingPlan(month);
    addTimestampsToBudgetRequest(month);
    
    // Copy to both log sheets
    var transferCount = copyBudgetRequestToLog(month);
    var spendingCount = copySpendingPlanToLog(month);
    
    if (transferCount === 0 && spendingCount === 0) {
      ui.alert(
        'No Data / Sin Datos',
        'No budget requests found to log.\n\n---\n\nNo se encontraron solicitudes de presupuesto para registrar.',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Clear only Budget-related sheets (Spending Plan and Budget Request)
    clearSpendingPlanAndBudgetRequestInternal();
    
    ui.alert(
      'Success / Éxito',
      'Budget request logged!\n\n' +
      'Transfer items logged: ' + transferCount + '\n' +
      'Spending Plan items logged: ' + spendingCount + '\n' +
      'Month: ' + month + '\n\n' +
      'Spending Plan and Budget Request sheets have been cleared.\n' +
      'Check log sheets for details.\n\n' +
      '---\n\n' +
      '¡Solicitud de presupuesto registrada!\n\n' +
      'Elementos de Budget registrados: ' + transferCount + '\n' +
      'Elementos de Spending Plan registrados: ' + spendingCount + '\n' +
      'Mes: ' + month + '\n\n' +
      'Las hojas de Spending Plan y Budget Request han sido limpiadas.\n' +
      'Revise las hojas de registro para detalles.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert(
      'Error',
      'Failed to log request: ' + e.message + '\n\n---\n\nError al registrar solicitud: ' + e.message,
      ui.ButtonSet.OK
    );
  }
}

function copyBudgetRequestToLog(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_BUDGET);
  
  if (!requestSheet || !logSheet) {
    throw new Error('Required sheets not found');
  }
  
  var lastRow = requestSheet.getLastRow();
  if (lastRow < 4) return 0;
  
  var exchangeRate = getExchangeRate();
  
  // Read data from Budget Request sheet
  // Columns: A-B (key numbers), C-D (identifiers), E-O (11 MXN columns), W-AG (11 USD columns)
  // Exclude P-T and AH-AK (not used/logged)
  var dataA_B = requestSheet.getRange(4, 1, lastRow - 3, 2).getValues(); // A-B (key numbers)
  var dataC_D = requestSheet.getRange(4, 3, lastRow - 3, 2).getValues(); // C-D
  var dataE_O = requestSheet.getRange(4, 5, lastRow - 3, 11).getValues(); // E-O (11 MXN columns)
  var dataW_AG = requestSheet.getRange(4, 23, lastRow - 3, 11).getValues(); // W-AG (11 USD columns)
  
  var logData = [];
  var count = 0;
  
  // Prepare data arrays for each column range
  var logA_B = []; // Key numbers
  var logC_D = [];
  var logE_O = [];
  var logW_AG = [];
  var logAL = []; // Transfer Month
  var logAM = []; // Time Stamp
  
  var date = new Date();
  var formattedDate = Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "MM/dd/yyyy HH:mm:ss");
  
  for (var i = 0; i < dataC_D.length; i++) {
    // Skip empty rows (check if US Netsuite Category is empty)
    if (!dataC_D[i][0] || dataC_D[i][0] === '') continue;
    
    // Build row data for each range
    logA_B.push([dataA_B[i][0], dataA_B[i][1]]); // A-B (key numbers)
    logC_D.push([dataC_D[i][0], dataC_D[i][1]]); // C-D
    logE_O.push(dataE_O[i]); // E-O (11 columns)
    logW_AG.push(dataW_AG[i]); // W-AG (11 columns)
    logAL.push([month]); // AL - Transfer Month
    logAM.push([formattedDate]); // AM - Time Stamp
    
    count++;
  }
  
  if (count > 0) {
    // Find last row in log sheet (check column C since A-B are alignment columns)
    var logLastRow = getLastRowInColumn(logSheet, 3);
    var startRow = logLastRow + 1;
    
    Logger.log('Log sheet last row in column C: ' + logLastRow);
    Logger.log('Writing ' + count + ' rows starting at row ' + startRow);
    
    // Write to separate ranges to maintain column alignment (skipping P-V and AH-AK)
    logSheet.getRange(startRow, 1, count, 2).setValues(logA_B);     // A-B - Key numbers
    logSheet.getRange(startRow, 3, count, 2).setValues(logC_D);     // C-D
    logSheet.getRange(startRow, 5, count, 11).setValues(logE_O);    // E-O (excludes P-T)
    logSheet.getRange(startRow, 23, count, 11).setValues(logW_AG);  // W-AG (excludes AH-AK)
    logSheet.getRange(startRow, 38, count, 1).setValues(logAL);     // AL - Transfer Month
    logSheet.getRange(startRow, 39, count, 1).setValues(logAM);     // AM - Time Stamp
    
    Logger.log('Data written successfully to rows ' + startRow + '-' + (startRow + count - 1));
    
    // Add empty separator row after this month's data
    // This makes it easier to visually separate different months in the log
  }
  
  return count;
}

function copySpendingPlanToLog(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_SPENDING_PLAN);
  
  if (!planningSheet || !logSheet) {
    throw new Error('Required sheets not found');
  }
  
  var lastRow = planningSheet.getLastRow();
  if (lastRow < 4) return 0;
  
  // Read data from Spending Plan sheet (columns A-B key numbers, C-U data)
  var dataA_B = planningSheet.getRange(4, 1, lastRow - 3, 2).getValues(); // A-B (key numbers)
  var dataC_U = planningSheet.getRange(4, 3, lastRow - 3, 19).getValues(); // C-U
  
  var logA_B = []; // Key numbers
  var logC_U = [];
  var count = 0;
  
  var date = new Date();
  var formattedDate = Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "MM/dd/yyyy");
  
  for (var i = 0; i < dataC_U.length; i++) {
    // Skip empty rows (check if Category in column C is empty)
    if (!dataC_U[i][0] || dataC_U[i][0] === '') continue;
    
    // Copy A-B and C-U
    logA_B.push([dataA_B[i][0], dataA_B[i][1]]); // A-B (key numbers)
    logC_U.push(dataC_U[i]); // C-U
    count++;
  }
  
  if (count > 0) {
    // Find last row in log sheet (check column C)
    var logLastRow = getLastRowInColumn(logSheet, 3);
    var startRow = logLastRow + 1;
    
    Logger.log('Log: YTD Spending Plan - last row in column C: ' + logLastRow);
    Logger.log('Writing ' + count + ' rows starting at row ' + startRow);
    
    // Write to log sheet (columns A-B and C-U)
    logSheet.getRange(startRow, 1, count, 2).setValues(logA_B);   // A-B - Key numbers
    logSheet.getRange(startRow, 3, count, 19).setValues(logC_U); // C-U
    
    Logger.log('Data written successfully to rows ' + startRow + '-' + (startRow + count - 1));
    
    // Add empty separator row after this month's data
    // This makes it easier to visually separate different months in the log
  }
  
  return count;
}

// Add timestamps to Spending Plan (Column U = Timestamp only, T already has =$D$2 formula)
function addTimestampsToSpendingPlan(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  
  if (!planningSheet) return;
  
  var lastRow = planningSheet.getLastRow();
  if (lastRow < 4) return;
  
  var timestamp = new Date();
  var formattedTimestamp = Utilities.formatDate(timestamp, ss.getSpreadsheetTimeZone(), "MM/dd/yyyy HH:mm:ss");
  
  // Get data from column C to identify non-empty rows
  var categoryData = planningSheet.getRange(4, 3, lastRow - 3, 1).getValues();
  
  // Build timestamp array for batch write (same logic, just batched)
  var timestamps = [];
  for (var i = 0; i < categoryData.length; i++) {
    if (categoryData[i][0] && categoryData[i][0] !== '') {
      timestamps.push([formattedTimestamp]);
    } else {
      timestamps.push(['']); // Keep empty rows empty
    }
  }
  
  // Write all timestamps at once (1 API call instead of 50+)
  if (timestamps.length > 0) {
    planningSheet.getRange(4, 21, timestamps.length, 1).setValues(timestamps); // Column U
  }
}

// Add timestamps to Budget Request (Column AL = Month from Spending Plan T, Column AM = Timestamp from Spending Plan U)
function addTimestampsToBudgetRequest(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var transferSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  
  if (!transferSheet || !planningSheet) return;
  
  var lastRow = transferSheet.getLastRow();
  if (lastRow < 4) return;
  
  // Get data from column C to identify non-empty rows
  var categoryData = transferSheet.getRange(4, 3, lastRow - 3, 1).getValues();
  
  // Get Spending Plan column T (month) and U (timestamp) data
  var planningMonths = planningSheet.getRange(4, 20, lastRow - 3, 1).getValues(); // Column T
  var planningTimestamps = planningSheet.getRange(4, 21, lastRow - 3, 1).getValues(); // Column U
  
  // Build arrays for BOTH columns for batch write
  var monthsAL = [];     // Column AL - copy from Spending Plan T
  var timestampsAM = []; // Column AM - copy from Spending Plan U
  
  for (var i = 0; i < categoryData.length; i++) {
    if (categoryData[i][0] && categoryData[i][0] !== '') {
      monthsAL.push([planningMonths[i][0]]);
      timestampsAM.push([planningTimestamps[i][0]]);
    } else {
      monthsAL.push(['']); // Keep empty rows empty
      timestampsAM.push(['']);
    }
  }
  
  // Write all data at once (2 API calls)
  if (monthsAL.length > 0) {
    transferSheet.getRange(4, 38, monthsAL.length, 1).setValues(monthsAL);         // Column AL - Month
    transferSheet.getRange(4, 39, timestampsAM.length, 1).setValues(timestampsAM); // Column AM - Timestamp
  }
}

// Add timestamps to In/Out Request (Column AO = Timestamp on submission)
function addTimestampsToInOutRequest(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inoutSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  
  if (!inoutSheet) return;
  
  var lastRow = inoutSheet.getLastRow();
  if (lastRow < 4) return;
  
  var timestamp = new Date();
  var formattedTimestamp = Utilities.formatDate(timestamp, ss.getSpreadsheetTimeZone(), "MM/dd/yyyy HH:mm:ss");
  
  // Get data from column C to identify non-empty rows
  var categoryData = inoutSheet.getRange(4, 3, lastRow - 3, 1).getValues();
  
  // Build timestamp array for batch write (MUCH faster than row-by-row)
  var timestamps = [];
  for (var i = 0; i < categoryData.length; i++) {
    if (categoryData[i][0] && categoryData[i][0] !== '') {
      timestamps.push([formattedTimestamp]);
    } else {
      timestamps.push(['']); // Empty for blank rows
    }
  }
  
  // Write all timestamps at once (single API call instead of 50+)
  if (timestamps.length > 0) {
    inoutSheet.getRange(4, 41, timestamps.length, 1).setValues(timestamps);
  }
}

// ============================================================================
// IN/OUT REQUEST SUBMISSION
// ============================================================================

function submitInOutRequest() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check authorization
  if (!isAuthorizedToLog()) {
    ui.alert(
      'Access Denied / Acceso Denegado',
      'You do not have permission to log In/Out requests.\n\n' +
      'Please contact an administrator to log this request.\n\n' +
      '---\n\n' +
      'No tiene permiso para registrar solicitudes de In/Out.\n\n' +
      'Por favor contacte a un administrador para registrar esta solicitud.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Get month from dropdown in IN/OUT Request sheet (cell D2)
  var requestSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  
  if (!requestSheet) {
    ui.alert('Error', 'In/Out Request sheet not found.\n\n---\n\nHoja de In/Out Request no encontrada.', ui.ButtonSet.OK);
    return;
  }
  
  var month = requestSheet.getRange("D2").getValue();
  
  if (!month || month === '') {
    ui.alert(
      'Error',
      'Please select a month in cell D2 of the In/Out Request sheet first.\n\n---\n\nPor favor seleccione un mes en la celda D2 de la hoja In/Out Request primero.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Validate month
  if (MONTHS.indexOf(month) === -1) {
    ui.alert(
      'Error',
      'Invalid month in cell D2. Please select a valid month.\n\n---\n\nMes inválido en celda D2. Por favor seleccione un mes válido.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Confirm submission
  var result = ui.alert(
    'Confirm Logging / Confirmar Registro',
    'This will:\n' +
    '1. Copy all IN/OUT requests to Log: YTD In/Out\n' +
    '2. Set Transfer Month to: ' + month + '\n' +
    '3. Clear the In/Out Request sheet\n\n' +
    'Continue?\n\n' +
    '---\n\n' +
    'Esto hará:\n' +
    '1. Copiar todas las solicitudes IN/OUT a Log: YTD In/Out\n' +
    '2. Establecer Mes de Transferencia a: ' + month + '\n' +
    '3. Limpiar la hoja de In/Out Request\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    // Add timestamp to In/Out Request before submission
    addTimestampsToInOutRequest(month);
    
    var count = copyInOutRequestToLog(month);
    
    if (count === 0) {
      ui.alert(
        'No Data / Sin Datos',
        'No IN/OUT requests found to log.\n\n---\n\nNo se encontraron solicitudes IN/OUT para registrar.',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Clear In/Out Request only
    clearInOutRequestInternal();
    
    ui.alert(
      'Success / Éxito',
      'IN/OUT request logged!\n\n' +
      'Items logged: ' + count + '\n' +
      'Month: ' + month + '\n\n' +
      'In/Out Request sheet has been cleared.\n' +
      'Check "Log: YTD In/Out" sheet for details.\n\n' +
      '---\n\n' +
      '¡Solicitud IN/OUT registrada!\n\n' +
      'Elementos registrados: ' + count + '\n' +
      'Mes: ' + month + '\n\n' +
      'La hoja de In/Out Request ha sido limpiada.\n' +
      'Revise la hoja "Log: YTD In/Out" para detalles.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert(
      'Error',
      'Failed to log request: ' + e.message + '\n\n---\n\nError al registrar solicitud: ' + e.message,
      ui.ButtonSet.OK
    );
  }
}

function copyInOutRequestToLog(month) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
  
  if (!requestSheet || !logSheet) {
    throw new Error('Required sheets not found');
  }
  
  var lastRow = requestSheet.getLastRow();
  if (lastRow < 4) return 0;
  
  var exchangeRate = getExchangeRate();
  
  // Read data from IN/OUT Request sheet
  // Columns: A-B (key numbers), C-D (identifiers), E-U (17 USD columns), X-AK (14 MXN columns), skip V-W
  var dataA_B = requestSheet.getRange(4, 1, lastRow - 3, 2).getValues(); // A-B (key numbers)
  var dataC_D = requestSheet.getRange(4, 3, lastRow - 3, 2).getValues(); // C-D
  var dataE_U = requestSheet.getRange(4, 5, lastRow - 3, 17).getValues(); // E-U (USD data)
  var dataX_AK = requestSheet.getRange(4, 24, lastRow - 3, 14).getValues(); // X-AK (MXN data)
  
  // Prepare data arrays for each column range
  var logA_B = []; // Key numbers
  var logC_D = [];
  var logE_U = [];
  var logX_AK = [];
  var logAN = []; // Transfer Month
  var logAO = []; // Time Stamp
  
  var date = new Date();
  var formattedDate = Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "MM/dd/yyyy HH:mm:ss");
  var count = 0;
  
  for (var i = 0; i < dataC_D.length; i++) {
    // Skip empty rows (check if US Netsuite Category is empty)
    if (!dataC_D[i][0] || dataC_D[i][0] === '') continue;
    
    // Build row data for each range
    logA_B.push([dataA_B[i][0], dataA_B[i][1]]); // A-B (key numbers)
    logC_D.push([dataC_D[i][0], dataC_D[i][1]]); // C-D
    logE_U.push(dataE_U[i]); // E-U (17 USD columns)
    logX_AK.push(dataX_AK[i]); // X-AK (14 MXN columns)
    logAN.push([month]); // AN - Transfer Month
    logAO.push([formattedDate]); // AO - Time Stamp
    
    count++;
  }
  
  if (count > 0) {
    // Find last row in log sheet (check column C since A-B are alignment columns)
    var logLastRow = getLastRowInColumn(logSheet, 3);
    var startRow = logLastRow + 1;
    
    Logger.log('Log: YTD In/Out last row in column C: ' + logLastRow);
    Logger.log('Writing ' + count + ' rows starting at row ' + startRow);
    
    // Write to separate ranges to maintain column alignment (skipping V-W)
    logSheet.getRange(startRow, 1, count, 2).setValues(logA_B);     // A-B - Key numbers
    logSheet.getRange(startRow, 3, count, 2).setValues(logC_D);     // C-D
    logSheet.getRange(startRow, 5, count, 17).setValues(logE_U);    // E-U (USD data)
    logSheet.getRange(startRow, 24, count, 14).setValues(logX_AK);  // X-AK (MXN data)
    logSheet.getRange(startRow, 40, count, 1).setValues(logAN);     // AN - Transfer Month
    logSheet.getRange(startRow, 41, count, 1).setValues(logAO);     // AO - Time Stamp
    
    Logger.log('Data written successfully to rows ' + startRow + '-' + (startRow + count - 1));
    
    // Add empty separator row after this month's data
    // This makes it easier to visually separate different months in the log
  }
  
  return count;
}

// ============================================================================
// FORMULA SETUP FUNCTIONS
// ============================================================================

// Load budget data into Spending Plan columns I & O when month is selected
function runBudgetRequestFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  var budgetSheet = ss.getSheetByName(SHEETS.TRANSFER_BUDGET);
  
  if (!planningSheet || !budgetSheet) {
    ui.alert('Error', 'Required sheets not found. Check sheet names.', ui.ButtonSet.OK);
    return;
  }
  
  // Get month from D2
  var monthRaw = planningSheet.getRange("D2").getValue();
  if (!monthRaw) {
    ui.alert('Error', 'Please select a month in cell D2 first.', ui.ButtonSet.OK);
    return;
  }
  
  // Extract month name (handles "January MXN", "January USD", or just "January")
  var month = String(monthRaw).trim().split(' ')[0];
  
  if (MONTHS.indexOf(month) === -1) {
    ui.alert('Error', 'Invalid month format in D2. Expected format: "January" or "January MXN".', ui.ButtonSet.OK);
    return;
  }
  
  // Find which column the month is in
  var monthIndex = MONTHS.indexOf(month);
  var mxnColIndex = 9 + monthIndex; // I=9 (Jan), J=10 (Feb), ..., T=20 (Dec)
  var usdColIndex = 26 + monthIndex; // Z=26 (Jan), AA=27 (Feb), ..., AK=37 (Dec)
  
  // Get budget data
  var budgetLastRow = budgetSheet.getLastRow();
  if (budgetLastRow < 4) {
    ui.alert('Error', 'Local budget sheet has no data.', ui.ButtonSet.OK);
    return;
  }
  
  // Read all budget data (columns C, D, and the month columns)
  var budgetData = budgetSheet.getRange(4, 1, budgetLastRow - 3, Math.max(mxnColIndex, usdColIndex)).getValues();
  
  // Get planning data
  var planningLastRow = planningSheet.getLastRow();
  if (planningLastRow < 4) {
    ui.alert('Error', 'Budget transfer planning sheet has no data.', ui.ButtonSet.OK);
    return;
  }
  
  var planningData = planningSheet.getRange(4, 1, planningLastRow - 3, 4).getValues();
  
  // Clear columns I (MXN) and O (USD)
  planningSheet.getRange(4, 9, planningLastRow - 3, 1).clearContent(); // I
  planningSheet.getRange(4, 15, planningLastRow - 3, 1).clearContent(); // O
  
  // Match and copy values
  var updatedCount = 0;
  var notFoundCount = 0;
  
  for (var i = 0; i < planningData.length; i++) {
    // Match by Key (Column B) - the unique identifier
    var planKey = String(planningData[i][1]).trim(); // Column B (Key)
    
    if (!planKey) continue;
    
    var found = false;
    
    // Find matching row in budget by Key
    for (var j = 0; j < budgetData.length; j++) {
      var budgetKey = String(budgetData[j][1]).trim(); // Column B (Key)
      
      if (planKey === budgetKey) {
        // Found match - copy values
        var mxnValue = budgetData[j][mxnColIndex - 1]; // -1 for 0-indexed array
        var usdValue = budgetData[j][usdColIndex - 1];
        
        planningSheet.getRange(i + 4, 9).setValue(mxnValue); // Column I (MXN)
        planningSheet.getRange(i + 4, 15).setValue(usdValue); // Column O (USD)
        updatedCount++;
        found = true;
        break;
      }
    }
    
    if (!found) {
      notFoundCount++;
    }
  }
  
  var message = '✓ Current month budget has been loaded.\n\n' +
    'NEXT STEPS:\n' +
    '1. Go to Budget Management menu → Autofill Spending Plan\n' +
    '2. This will populate your spending plan\n' +
    '3. Review and adjust values as needed\n\n' +
    '---\n\n' +
    '✓ El presupuesto del mes actual ha sido cargado.\n\n' +
    'PRÓXIMOS PASOS:\n' +
    '1. Vaya al menú Budget Management → Autofill Spending Plan\n' +
    '2. Esto llenará su plan de gastos\n' +
    '3. Revise y ajuste los valores según sea necesario';
  
  ui.alert('Budget Loaded / Presupuesto Cargado', message, ui.ButtonSet.OK);
}

function runInOutRequestFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requestSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  
  if (!requestSheet) return;
  
  try {
    // USD SECTION (columns G, H, I are manual USD entries)
    
    // Set ARRAYFORMULA in column L (row 4) - Total Request USD (sum of G-K)
    requestSheet.getRange('L4').setFormula('=ARRAYFORMULA(IF(C4:C="", "", G4:G + H4:H + I4:I + J4:J + K4:K))');
    
    // Set RUNNING SUM in column O - YTD cumulative total
    // O4 starts with Log YTD + current row
    requestSheet.getRange('O4').setFormula('=IF(L4="", "", \'Log: YTD In/Out\'!$O$2 + L4)');
    
    // O5 onwards: previous O + current L (running sum)
    // Limit to 100 rows to prevent script timeout
    var formulas = [];
    for (var row = 5; row <= 103; row++) {
      formulas.push(['=IF(L' + row + '="", "", O' + (row-1) + ' + L' + row + ')']);
    }
    requestSheet.getRange('O5:O103').setFormulas(formulas);
    
    // Set month formula in column U (row 4) - only show when G, L, or O have entries
    requestSheet.getRange('U4').setFormula('=ARRAYFORMULA(IF((G4:G<>"")+(L4:L<>"")+(O4:O<>"")>0, $D$2, ""))');
    
    // Set month formula in column AN (row 4)
    requestSheet.getRange('AN4').setFormula('=$D$2');
    
    // MXN SECTION - Convert USD to MXN (multiply by exchange rate)
    
    // Convert individual USD columns to MXN
    // W is empty (skip)
    requestSheet.getRange('X4').setFormula('=ARRAYFORMULA(IF(G4:G="", "", G4:G*\'File setup\'!$F$8))');
    requestSheet.getRange('Y4').setFormula('=ARRAYFORMULA(IF(I4:I="", "", I4:I*\'File setup\'!$F$8))');
    
    // Convert total USD (L) to Total In/Out request MXN (AC)
    requestSheet.getRange('AC4').setFormula('=ARRAYFORMULA(IF(L4:L="", "", L4:L*\'File setup\'!$F$8))');
    
    // Convert YTD cumulative USD (O) to MXN (AF)
    requestSheet.getRange('AF4').setFormula('=ARRAYFORMULA(IF(O4:O="", "", O4:O*\'File setup\'!$F$8))');
    
    Logger.log('In/Out Request formulas set successfully');
    
  } catch (error) {
    Logger.log('Error in runInOutRequestFormulas: ' + error.toString());
  }
}

// ============================================================================
// AUTOFILL FUNCTIONS
// ============================================================================

function autofillSpendingPlan() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  
  if (!planningSheet) {
    ui.alert('Error', 'Spending Plan sheet not found.\n\n---\n\nHoja de Spending Plan no encontrada.', ui.ButtonSet.OK);
    return;
  }
  
  var lastRow = planningSheet.getLastRow();
  if (lastRow < 4) {
    ui.alert('Error', 'No data found in Spending Plan sheet.\n\n---\n\nNo se encontraron datos en la hoja Spending Plan.', ui.ButtonSet.OK);
    return;
  }
  
  // Get month from D2
  var monthRaw = planningSheet.getRange("D2").getValue();
  if (!monthRaw) {
    ui.alert('Error', 'Please select a month in cell D2 first.\n\n---\n\nPor favor seleccione un mes en la celda D2 primero.', ui.ButtonSet.OK);
    return;
  }
  
  // Extract month name (handles "January MXN", "January USD", or just "January")
  var month = String(monthRaw).trim().split(' ')[0];
  
  if (MONTHS.indexOf(month) === -1) {
    ui.alert('Error', 'Invalid month format in D2. Expected format: "January" or "January MXN".\n\n---\n\nFormato de mes inválido en D2. Formato esperado: "January" o "January MXN".', ui.ButtonSet.OK);
    return;
  }
  
  // Copy column I (budget MXN) to column J (plan to spend MXN)
  var mxnValues = planningSheet.getRange(4, 9, lastRow - 3, 1).getValues(); // Column I
  planningSheet.getRange(4, 10, lastRow - 3, 1).setValues(mxnValues); // Column J
  
  // MXN SECTION
  // Column K: Current month over/(under) = I - J
  var formulaK = planningSheet.getRange(4, 11, lastRow - 3, 1);
  formulaK.setFormula('=J4-I4');
  
  // Column L: YTD local budget MXN (from Local budget)
  var formulaL = planningSheet.getRange(4, 12, lastRow - 3, 1);
  formulaL.setFormula(
    '=IF($D$2&" MXN"=\'Local budget\'!I$3,SUM(\'Local budget\'!$I4),' +
    'IF($D$2&" MXN"=\'Local budget\'!J$3,SUM(\'Local budget\'!$I4:$J4),' +
    'IF($D$2&" MXN"=\'Local budget\'!K$3,SUM(\'Local budget\'!$I4:$K4),' +
    'IF($D$2&" MXN"=\'Local budget\'!L$3,SUM(\'Local budget\'!$I4:$L4),' +
    'IF($D$2&" MXN"=\'Local budget\'!M$3,SUM(\'Local budget\'!$I4:$M4),' +
    'IF($D$2&" MXN"=\'Local budget\'!N$3,SUM(\'Local budget\'!$I4:$N4),' +
    'IF($D$2&" MXN"=\'Local budget\'!O$3,SUM(\'Local budget\'!$I4:$O4),' +
    'IF($D$2&" MXN"=\'Local budget\'!P$3,SUM(\'Local budget\'!$I4:$P4),' +
    'IF($D$2&" MXN"=\'Local budget\'!Q$3,SUM(\'Local budget\'!$I4:$Q4),' +
    'IF($D$2&" MXN"=\'Local budget\'!R$3,SUM(\'Local budget\'!$I4:$R4),' +
    'IF($D$2&" MXN"=\'Local budget\'!S$3,SUM(\'Local budget\'!$I4:$S4),' +
    'IF($D$2&" MXN"=\'Local budget\'!T$3,SUM(\'Local budget\'!$I4:$T4),))))))))))))'
  );
  
  // Column M: YTD over/(under) - manually placed formula, DO NOT overwrite
  
  // USD SECTION
  // Column P: Plan to spend USD = J converted to USD
  var formulaP = planningSheet.getRange(4, 16, lastRow - 3, 1);
  formulaP.setFormula('=J4/\'File setup\'!$F$8');
  formulaP.setNumberFormat('0.00');
  
  // Column Q: Current month over/(under) USD = O - P
  var formulaQ = planningSheet.getRange(4, 17, lastRow - 3, 1);
  formulaQ.setFormula('=O4-P4');
  formulaQ.setNumberFormat('0.00');
  
  // Column R: YTD local budget USD (from Local budget)
  var formulaR = planningSheet.getRange(4, 18, lastRow - 3, 1);
  formulaR.setFormula(
    '=IF($D$2&" USD"=\'Local budget\'!Z$3,SUM(\'Local budget\'!$Z4),' +
    'IF($D$2&" USD"=\'Local budget\'!AA$3,SUM(\'Local budget\'!$Z4:$AA4),' +
    'IF($D$2&" USD"=\'Local budget\'!AB$3,SUM(\'Local budget\'!$Z4:$AB4),' +
    'IF($D$2&" USD"=\'Local budget\'!AC$3,SUM(\'Local budget\'!$Z4:$AC4),' +
    'IF($D$2&" USD"=\'Local budget\'!AD$3,SUM(\'Local budget\'!$Z4:$AD4),' +
    'IF($D$2&" USD"=\'Local budget\'!AE$3,SUM(\'Local budget\'!$Z4:$AE4),' +
    'IF($D$2&" USD"=\'Local budget\'!AF$3,SUM(\'Local budget\'!$Z4:$AF4),' +
    'IF($D$2&" USD"=\'Local budget\'!AG$3,SUM(\'Local budget\'!$Z4:$AG4),' +
    'IF($D$2&" USD"=\'Local budget\'!AH$3,SUM(\'Local budget\'!$Z4:$AH4),' +
    'IF($D$2&" USD"=\'Local budget\'!AI$3,SUM(\'Local budget\'!$Z4:$AI4),' +
    'IF($D$2&" USD"=\'Local budget\'!AJ$3,SUM(\'Local budget\'!$Z4:$AJ4),' +
    'IF($D$2&" USD"=\'Local budget\'!AK$3,SUM(\'Local budget\'!$Z4:$AK4),))))))))))))'
  );
  
  // Column S: YTD over/(under) USD - manually placed formula, DO NOT overwrite
  
  // Column T: Transfer Month (references D2)
  var formulaT = planningSheet.getRange(4, 20, lastRow - 3, 1);
  formulaT.setFormula('=$D$2');
  
  // Column U is for timestamp - will be populated during logging, leave blank for now
  
  ui.alert(
    'Ready to Review / Listo para Revisar',
    'Your spending plan has been populated.\n\n' +
    'NEXT STEPS:\n' +
    '1. Review the budget\n' +
    '2. Adjust amounts as needed\n' +
    '3. Autofill Budget Request next\n\n' +
    '---\n\n' +
    'Su plan de gastos ha sido completado.\n\n' +
    'PRÓXIMOS PASOS:\n' +
    '1. Revise el presupuesto\n' +
    '2. Ajuste las cantidades según sea necesario\n' +
    '3. Autofill Budget Request siguiente',
    ui.ButtonSet.OK
  );
}

function autofillBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var transferSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  
  if (!transferSheet) {
    ui.alert('Error', 'Budget Request sheet not found.\n\n---\n\nHoja de Budget Request no encontrada.', ui.ButtonSet.OK);
    return;
  }
  
  var transferLastRow = transferSheet.getLastRow();
  if (transferLastRow < 4) {
    ui.alert('Error', 'No data found in Budget Request sheet.\n\n---\n\nNo se encontraron datos en la hoja Budget Request.', ui.ButtonSet.OK);
    return;
  }
  
  // Copy column E (Actual) to column F (Carry Forward)
  var columnEValues = transferSheet.getRange(4, 5, transferLastRow - 3, 1).getValues(); // Column E
  transferSheet.getRange(4, 6, transferLastRow - 3, 1).setValues(columnEValues); // Column F
  SpreadsheetApp.flush();
  Logger.log('Budget Request column F autofilled from column E');
  
  ui.alert(
    'Ready to Review / Listo para Revisar',
    'Budget Request has been populated.\n\n' +
    'NEXT STEPS:\n' +
    '1. Review amounts\n' +
    '2. Adjust as needed\n' +
    '3. Go to Budget Management → Log Budget Request\n\n' +
    '---\n\n' +
    'Budget Request ha sido completado.\n\n' +
    'PRÓXIMOS PASOS:\n' +
    '1. Revise las cantidades\n' +
    '2. Ajuste según sea necesario\n' +
    '3. Vaya a Budget Management → Log Budget Request',
    ui.ButtonSet.OK
  );
}

// Backward compatibility wrapper - calls both functions
function autofillBanorteColumns() {
  autofillSpendingPlan();
  autofillBudgetRequest();
}

// ============================================================================
// CONDITIONAL FORMATTING FOR OVER/UNDER COLUMNS
// ============================================================================

// Function to remove all conditional formatting from sheets
function removeAllConditionalFormatting() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Remove Color Formatting',
    'This will remove all conditional formatting (color coding) from:\n' +
    '- Spending Plan (columns Q, S)\n' +
    '- Budget Request (all columns)\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    // Clear Spending Plan conditional formatting
    var spendingSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
    if (spendingSheet) {
      spendingSheet.clearConditionalFormatRules();
      Logger.log('Cleared conditional formatting from Spending Plan');
    }
    
    // Clear Budget Request conditional formatting
    var transferSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
    if (transferSheet) {
      transferSheet.clearConditionalFormatRules();
      Logger.log('Cleared conditional formatting from Budget Request');
    }
    
    ui.alert('Success', 'All conditional formatting has been removed.', ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('Error', 'Failed to remove formatting: ' + error.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// CLEAR ALL REQUEST SHEETS
// ============================================================================

// ============================================================================
// CLEAR FUNCTIONS (INTERNAL - NO CONFIRMATION)
// ============================================================================

// Clear Spending Plan and Budget Request only
function clearSpendingPlanAndBudgetRequestInternal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear Spending Plan - only USER INPUT columns, preserve FORMULA columns
  var planningSheet = ss.getSheetByName(SHEETS.BUDGET_PLANNING);
  if (planningSheet) {
    // Find last row with ACTUAL DATA in column C (not just formulas)
    var planningLastRow = getLastRowInColumn(planningSheet, 3);
    if (planningLastRow >= 4) {
      // Clear user input columns only:
      planningSheet.getRange(4, 9, planningLastRow - 3, 1).clearContent();  // I: Current Month Local Budget MXN
      planningSheet.getRange(4, 10, planningLastRow - 3, 1).clearContent(); // J: Plan to spend MXN
      planningSheet.getRange(4, 15, planningLastRow - 3, 1).clearContent(); // O: Current Month Local Budget USD
      planningSheet.getRange(4, 21, planningLastRow - 3, 1).clearContent(); // U: Timestamp
      planningSheet.getRange("D2").clearContent(); // Month
      
      // Preserve formula columns: K, L, M, N, P, Q, R, S, T
      // Once O is cleared, P, Q, R, S formulas will show blank/zero
    }
  }
  
  // Clear Budget Request - only USER INPUT columns, preserve FORMULA columns
  var transferSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  if (transferSheet) {
    // Find last row with ACTUAL DATA in column C (not just formulas)
    var transferLastRow = getLastRowInColumn(transferSheet, 3);
    if (transferLastRow >= 4) {
      // Clear user input columns only:
      transferSheet.getRange(4, 6, transferLastRow - 3, 5).clearContent();   // F-J: MXN manual entries
      transferSheet.getRange(4, 16, transferLastRow - 3, 5).clearContent();  // P-T: Not used/logged
      transferSheet.getRange(4, 34, transferLastRow - 3, 4).clearContent();  // AH-AK: Not used/logged
      transferSheet.getRange(4, 38, transferLastRow - 3, 1).clearContent();  // AL: Month (copy from Spending Plan)
      transferSheet.getRange(4, 39, transferLastRow - 3, 1).clearContent();  // AM: Timestamp (copy from Spending Plan)
      transferSheet.getRange("D2").clearContent(); // Month
      
      // Preserve formula columns: K, L, M, N, O, U, W, X, Y, Z, AA, AB, AC, AD, AE, AF, AG
    }
  }
}

// Clear In/Out Request only
function clearInOutRequestInternal() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear In/Out Request - only clear USER INPUT columns, preserve FORMULA columns
  var inoutSheet = ss.getSheetByName(SHEETS.INOUT_REQUEST);
  if (inoutSheet) {
    // Find last row with ACTUAL DATA in column C (not just formulas)
    var inoutLastRow = getLastRowInColumn(inoutSheet, 3);
    if (inoutLastRow >= 4) {
      // Clear user input columns only (only rows with actual data, not all formula rows)
      inoutSheet.getRange(4, 3, inoutLastRow - 3, 2).clearContent();   // C-D: Category and Sub-Category
      inoutSheet.getRange(4, 5, inoutLastRow - 3, 2).clearContent();   // E-F: User input
      inoutSheet.getRange(4, 7, inoutLastRow - 3, 5).clearContent();   // G-K: USD input amounts
      inoutSheet.getRange(4, 26, inoutLastRow - 3, 3).clearContent();  // Z-AB: MXN input amounts
      inoutSheet.getRange(4, 41, inoutLastRow - 3, 1).clearContent();  // AO: Timestamp
      
      // Preserve formula columns: L, O, P, U, W, X, Y, AC, AF, AG, AN
      // These are set by runInOutRequestFormulas() and should not be cleared
    }
    
    // Always clear D2 (month dropdown), even if no data exists
    inoutSheet.getRange("D2").clearContent();
  }
}

// Legacy function - clears all sheets (kept for backwards compatibility)
function clearAllRequestSheetsInternal() {
  clearSpendingPlanAndBudgetRequestInternal();
  clearInOutRequestInternal();
}

// ============================================================================
// CLEAR FUNCTIONS (MENU - WITH CONFIRMATION)
// ============================================================================

// Clear Spending Plan and Budget Request with confirmation
function clearSpendingPlanAndBudgetRequest() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Confirm Clear / Confirmar Borrado',
    'This will clear all data from:\n' +
    '• Spending Plan\n' +
    '• Budget Request\n\n' +
    'Esto borrará todos los datos de:\n' +
    '• Spending Plan\n' +
    '• Budget Request\n\n' +
    'Continue? / ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    clearSpendingPlanAndBudgetRequestInternal();
    
    ui.alert(
      'Clear Complete / Borrado Completo',
      'Spending Plan and Budget Request have been cleared.\n\n' +
      'Spending Plan y Budget Request han sido borrados.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to clear sheets: ' + e.message, ui.ButtonSet.OK);
  }
}

// Clear In/Out Request with confirmation
function clearInOutRequest() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Confirm Clear / Confirmar Borrado',
    'This will clear all data from:\n' +
    '• In/Out Request\n\n' +
    'Esto borrará todos los datos de:\n' +
    '• In/Out Request\n\n' +
    'Continue? / ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    clearInOutRequestInternal();
    
    ui.alert(
      'Clear Complete / Borrado Completo',
      'In/Out Request has been cleared.\n\n' +
      'In/Out Request ha sido borrado.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to clear sheets: ' + e.message, ui.ButtonSet.OK);
  }
}

// Clear all request sheets with confirmation (legacy function)
function clearAllRequestSheets() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Confirm Clear / Confirmar Borrado',
    'This will clear all data from:\n' +
    '• Spending Plan\n' +
    '• Transfer Request\n' +
    '• In/Out Request\n\n' +
    'Esto borrará todos los datos de:\n' +
    '• Spending Plan\n' +
    '• Transfer Request\n' +
    '• In/Out Request\n\n' +
    'Continue? / ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    clearAllRequestSheetsInternal();
    
    ui.alert(
      'Clear Complete / Borrado Completo',
      'All request sheets have been cleared.\n\n' +
      'Todas las hojas de solicitud han sido borradas.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to clear sheets: ' + e.message, ui.ButtonSet.OK);
  }
}

// Clear Log: YTD Budget sheet with confirmation
function clearLogYTDBudget() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Confirm Clear / Confirmar Borrado',
    'This will permanently delete all data from:\n' +
    '• Log: YTD Budget\n\n' +
    '⚠️ WARNING: This cannot be undone!\n\n' +
    'Esto borrará permanentemente todos los datos de:\n' +
    '• Log: YTD Budget\n\n' +
    '⚠️ ADVERTENCIA: ¡Esto no se puede deshacer!\n\n' +
    'Continue? / ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_BUDGET);
    
    if (!logSheet) {
      ui.alert('Error', 'Log: YTD Budget sheet not found.', ui.ButtonSet.OK);
      return;
    }
    
    // Clear all data starting from row 4, including columns A-B (keep headers in rows 1-3 only)
    var lastRow = logSheet.getLastRow();
    if (lastRow >= 4) {
      var lastCol = logSheet.getMaxColumns();
      if (lastCol >= 1) {
        logSheet.getRange(4, 1, lastRow - 3, lastCol).clearContent();
      }
    }
    
    ui.alert(
      'Clear Complete / Borrado Completo',
      'Log: YTD Budget has been cleared.\n\n' +
      'Log: YTD Budget ha sido borrado.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to clear Log: YTD Budget: ' + e.message, ui.ButtonSet.OK);
  }
}

// Clear Log: YTD In/Out sheet with confirmation
function clearLogYTDInOut() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Confirm Clear / Confirmar Borrado',
    'This will permanently delete all data from:\n' +
    '• Log: YTD In/Out\n\n' +
    '⚠️ WARNING: This cannot be undone!\n\n' +
    'Esto borrará permanentemente todos los datos de:\n' +
    '• Log: YTD In/Out\n\n' +
    '⚠️ ADVERTENCIA: ¡Esto no se puede deshacer!\n\n' +
    'Continue? / ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_INOUT);
    
    if (!logSheet) {
      ui.alert('Error', 'Log: YTD In/Out sheet not found.', ui.ButtonSet.OK);
      return;
    }
    
    // Clear all data starting from row 4, including columns A-B (keep headers in rows 1-3 only)
    var lastRow = logSheet.getLastRow();
    if (lastRow >= 4) {
      var lastCol = logSheet.getMaxColumns();
      if (lastCol >= 1) {
        logSheet.getRange(4, 1, lastRow - 3, lastCol).clearContent();
      }
    }
    
    ui.alert(
      'Clear Complete / Borrado Completo',
      'Log: YTD In/Out has been cleared.\n\n' +
      'Log: YTD In/Out ha sido borrado.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to clear Log: YTD In/Out: ' + e.message, ui.ButtonSet.OK);
  }
}

// Clear Log: YTD Spending Plan sheet with confirmation
function clearLogYTDSpendingPlan() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.alert(
    'Confirm Clear / Confirmar Borrado',
    'This will permanently delete all data from:\n' +
    '• Log: YTD Spending Plan\n\n' +
    '⚠️ WARNING: This cannot be undone!\n\n' +
    'Esto borrará permanentemente todos los datos de:\n' +
    '• Log: YTD Spending Plan\n\n' +
    '⚠️ ADVERTENCIA: ¡Esto no se puede deshacer!\n\n' +
    'Continue? / ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEETS.LOG_YTD_SPENDING_PLAN);
    
    if (!logSheet) {
      ui.alert('Error', 'Log: YTD Spending Plan sheet not found.\n\n---\n\nHoja Log: YTD Spending Plan no encontrada.', ui.ButtonSet.OK);
      return;
    }
    
    // Clear all data starting from row 4, including columns A-B (keep headers in rows 1-3 only)
    var lastRow = logSheet.getLastRow();
    if (lastRow >= 4) {
      var lastCol = logSheet.getMaxColumns();
      if (lastCol >= 1) {
        logSheet.getRange(4, 1, lastRow - 3, lastCol).clearContent();
      }
    }
    
    ui.alert(
      'Clear Complete / Borrado Completo',
      'Log: YTD Spending Plan has been cleared.\n\n' +
      'Log: YTD Spending Plan ha sido borrado.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('Error', 'Failed to clear Log: YTD Spending Plan: ' + e.message + '\n\n---\n\nError al borrar Log: YTD Spending Plan: ' + e.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// BUDGET REQUEST SHEET FORMULAS
// ============================================================================

function runBudgetRequestSheetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var transferSheet = ss.getSheetByName(SHEETS.TRANSFER_REQUEST);
  
  if (!transferSheet) {
    Logger.log('Budget Request sheet not found');
    return;
  }
  
  // Get month from D2
  var monthRaw = transferSheet.getRange("D2").getValue();
  if (!monthRaw) {
    Logger.log('No month selected in Budget Request D2');
    return;
  }
  
  // Extract month name (handles "January MXN", "January USD", or just "January")
  var month = String(monthRaw).trim().split(' ')[0];
  
  if (MONTHS.indexOf(month) === -1) {
    Logger.log('Invalid month format in Budget Request D2: ' + monthRaw);
    return;
  }
  
  var lastRow = transferSheet.getLastRow();
  if (lastRow < 4) {
    Logger.log('No data found in Budget Request sheet');
    return;
  }
  
  // Find which column the month is in Local Budget (I=9 for Jan, J=10 for Feb, etc.)
  var monthIndex = MONTHS.indexOf(month);
  var monthColLetter = String.fromCharCode(73 + monthIndex); // I + monthIndex
  
  try {
    // Get all category data to check which rows have content
    var categoryData = transferSheet.getRange(4, 3, lastRow - 3, 1).getValues();
    
    // Build formula arrays for batch setting
    var formulasE = [], formulasK = [], formulasL = [], formulasM = [], formulasN = [];
    var formulasO = [], formulasP = [], formulasQ = [], formulasR = [], formulasS = [], formulasT = [], formulasU = [];
    var formulasV = [], formulasW = [], formulasX = [], formulasY = [], formulasZ = [], formulasAA = [];
    var formulasAB = [], formulasAC = [], formulasAD = [], formulasAE = [], formulasAF = [];
    var formulasAG = [], formulasAH = [], formulasAI = [], formulasAJ = [], formulasAK = [], formulasAL = [];
    
    for (var i = 0; i < categoryData.length; i++) {
      var rowNum = i + 4;
      var category = categoryData[i][0];
      
      if (!category) {
        // Empty row - leave formulas blank (F-J preserved as user input, not touched)
        formulasE.push(['']); formulasK.push(['']); formulasL.push(['']); formulasM.push(['']);
        formulasN.push(['']); formulasO.push(['']); formulasP.push(['']); formulasQ.push(['']);
        formulasR.push(['']); formulasS.push(['']); formulasT.push(['']); formulasU.push(['']);
        formulasV.push(['']); formulasW.push(['']); formulasX.push(['']); formulasY.push(['']);
        formulasZ.push(['']); formulasAA.push(['']); formulasAB.push(['']); formulasAC.push(['']);
        formulasAD.push(['']); formulasAE.push(['']); formulasAF.push(['']); formulasAG.push(['']);
        formulasAH.push(['']); formulasAI.push(['']); formulasAJ.push(['']); formulasAK.push(['']);
        formulasAL.push(['']);
        continue;
      }
      
      // MXN SECTION FORMULAS
      // Column E: Spending Plan J - Local Resources (month-dynamic) - user input F-J (returns 0 if D2 blank)
      formulasE.push([
        '=IF(ISBLANK($D$2),0,SUMIFS(\'Spending Plan\'!$J:$J,\'Spending Plan\'!$C:$C,$C' + rowNum + ',\'Spending Plan\'!$D:$D,$D' + rowNum + ')-SUMIFS(\'Local Resources\'!' + monthColLetter + ':' + monthColLetter + ',\'Local Resources\'!$C:$C,$C' + rowNum + ',\'Local Resources\'!$D:$D,$D' + rowNum + ')-SUM(F' + rowNum + ':J' + rowNum + '))'
      ]);
      // Columns F-J: USER INPUT - preserved, not touched by script
      formulasK.push(['=SUM(F' + rowNum + ':J' + rowNum + ')']); // Column K - Total
      
      // Column L - US Resources MAX current month (month-dynamic)
      formulasL.push(['=IF(ISBLANK(C' + rowNum + '),,SUMIFS(\'US Resources MAX\'!' + monthColLetter + ':' + monthColLetter + ',\'US Resources MAX\'!$C:$C,$C' + rowNum + ',\'US Resources MAX\'!$D:$D,$D' + rowNum + '))']);
      
      formulasM.push(['=IF(ISBLANK(C' + rowNum + '),,SUM(K' + rowNum + '-L' + rowNum + '))']); // Column M - K - L (over/under)
      
      // Column N - YTD US Resources MAX (SUMPRODUCT up to selected month in D2)
      var nFormula = '=IFERROR(IF(ISBLANK(C' + rowNum + '),,SUMPRODUCT(' +
        '(\'US Resources MAX\'!$C$4:$C$100=$C' + rowNum + ')*' +
        '(\'US Resources MAX\'!$D$4:$D$100=$D' + rowNum + ')*' +
        '(COLUMN(\'US Resources MAX\'!$I$3:$T$3)<=COLUMN(INDEX(\'US Resources MAX\'!$I$3:$T$3,1,MATCH($D$2&\" \"&\'File setup\'!$F$7,\'US Resources MAX\'!$I$3:$T$3,0))))*' +
        '\'US Resources MAX\'!$I$4:$T$100)),0)';
      formulasN.push([nFormula]); // Column N - YTD US Resources MAX

      // Column O - Log YTD Budget + K - N
      formulasO.push([
        '=IFERROR(SUMIFS(\'Log: YTD Budget\'!$K:$K,\'Log: YTD Budget\'!$C:$C,$C' + rowNum + ',\'Log: YTD Budget\'!$D:$D,$D' + rowNum + ')+$K' + rowNum + '-$N' + rowNum + ',0)'
      ]);
      formulasP.push(['=IF(ISBLANK(C' + rowNum + '),,SUMIFS(\'Local budget\'!$P:$P,\'Local budget\'!$C:$C,$C' + rowNum + ',\'Local budget\'!$D:$D,$D' + rowNum + '))']); // Column P - Local budget P
      formulasQ.push(['=IF(ISBLANK(C' + rowNum + '),,SUMIFS(\'Spending Plan\'!$J:$J,\'Spending Plan\'!$C:$C,$C' + rowNum + ',\'Spending Plan\'!$D:$D,$D' + rowNum + '))']); // Column Q - Spending Plan J
      formulasR.push(['=IF(ISBLANK(C' + rowNum + '),,SUMIFS(\'Local Resources\'!P:P,\'Local Resources\'!$C:$C,$C' + rowNum + ',\'Local Resources\'!$D:$D,$D' + rowNum + '))']); // Column R - Local Resources P
      formulasS.push(['=SUMIFS(\'US Resources MAX\'!P:P,\'US Resources MAX\'!$C:$C,$C' + rowNum + ',\'US Resources MAX\'!$D:$D,$D' + rowNum + ')']); // Column S - US Resources MAX P
      formulasT.push(['']); // Column T - empty (month only in AL)
      formulasU.push(['']); // Column U - empty
      formulasV.push(['']); // Column V - empty (manual entry)
      
      // USD SECTION FORMULAS (W-AL)
      formulasW.push(['=E' + rowNum + '/\'File setup\'!$F$8']); // Column W = E/F8 (Actual)
      formulasX.push(['=F' + rowNum + '/\'File setup\'!$F$8']); // Column X = F/F8
      formulasY.push(['=G' + rowNum + '/\'File setup\'!$F$8']); // Column Y = G/F8
      formulasZ.push(['=H' + rowNum + '/\'File setup\'!$F$8']); // Column Z = H/F8
      formulasAA.push(['=I' + rowNum + '/\'File setup\'!$F$8']); // Column AA = I/F8
      formulasAB.push(['=J' + rowNum + '/\'File setup\'!$F$8']); // Column AB = J/F8
      formulasAC.push(['=K' + rowNum + '/\'File setup\'!$F$8']); // Column AC = K/F8
      formulasAD.push(['=L' + rowNum + '/\'File setup\'!$F$8']); // Column AD = L/F8
      formulasAE.push(['=M' + rowNum + '/\'File setup\'!$F$8']); // Column AE = M/F8
      formulasAF.push(['=N' + rowNum + '/\'File setup\'!$F$8']); // Column AF = N/F8
      formulasAG.push(['=O' + rowNum + '/\'File setup\'!$F$8']); // Column AG = O/F8
      formulasAH.push(['=P' + rowNum + '/\'File setup\'!$F$8']); // Column AH = P/F8
      formulasAI.push(['=Q' + rowNum + '/\'File setup\'!$F$8']); // Column AI = Q/F8
      formulasAJ.push(['=R' + rowNum + '/\'File setup\'!$F$8']); // Column AJ = R/F8
      formulasAK.push(['=S' + rowNum + '/\'File setup\'!$F$8']); // Column AK = S/F8
      formulasAL.push(['=$D$2']); // Column AL = Transfer Month
    }
    
    // Set all formulas at once for performance
    if (formulasE.length > 0) {
      transferSheet.getRange(4, 5, formulasE.length, 1).setFormulas(formulasE); // E = MAX(0,MIN(...))
      // Columns F-J: USER INPUT - preserved, not touched by script
      transferSheet.getRange(4, 11, formulasK.length, 1).setFormulas(formulasK); // K = SUM(F:J)
      transferSheet.getRange(4, 12, formulasL.length, 1).setFormulas(formulasL); // L = Spending Plan I
      transferSheet.getRange(4, 13, formulasM.length, 1).setFormulas(formulasM); // M = L - M (over/under)
      
      // Write column N first and force calculation before O (which references N)
      transferSheet.getRange(4, 14, formulasN.length, 1).setFormulas(formulasN); // N = YTD Local budget (nested IF)
      SpreadsheetApp.flush(); // Force N to calculate completely before O references it
      
      // Now write column O (which depends on N being calculated)
      transferSheet.getRange(4, 15, formulasO.length, 1).setFormulas(formulasO); // O = N - log transfers + L
      
      transferSheet.getRange(4, 16, formulasP.length, 1).setFormulas(formulasP); // P = Local budget P
      transferSheet.getRange(4, 17, formulasQ.length, 1).setFormulas(formulasQ); // Q = Spending Plan J
      transferSheet.getRange(4, 18, formulasR.length, 1).setFormulas(formulasR); // R = Local Resources P
      transferSheet.getRange(4, 19, formulasS.length, 1).setFormulas(formulasS); // S = US Resources P
      transferSheet.getRange(4, 20, formulasT.length, 1).setFormulas(formulasT); // T = Transfer Month
      transferSheet.getRange(4, 21, formulasU.length, 1).setFormulas(formulasU); // U = empty
      // Column V (22) is empty - manual entry
      transferSheet.getRange(4, 23, formulasW.length, 1).setFormulas(formulasW); // W = E/F8
      transferSheet.getRange(4, 24, formulasX.length, 1).setFormulas(formulasX); // X = E/F8 (Carry Forward)
      transferSheet.getRange(4, 25, formulasY.length, 1).setFormulas(formulasY); // Y = G/F8
      transferSheet.getRange(4, 26, formulasZ.length, 1).setFormulas(formulasZ); // Z = H/F8
      transferSheet.getRange(4, 27, formulasAA.length, 1).setFormulas(formulasAA); // AA = I/F8
      transferSheet.getRange(4, 28, formulasAB.length, 1).setFormulas(formulasAB); // AB = J/F8
      transferSheet.getRange(4, 29, formulasAC.length, 1).setFormulas(formulasAC); // AC = K/F8
      transferSheet.getRange(4, 30, formulasAD.length, 1).setFormulas(formulasAD); // AD = L/F8
      transferSheet.getRange(4, 31, formulasAE.length, 1).setFormulas(formulasAE); // AE = M/F8
      transferSheet.getRange(4, 32, formulasAF.length, 1).setFormulas(formulasAF); // AF = N/F8
      transferSheet.getRange(4, 33, formulasAG.length, 1).setFormulas(formulasAG); // AG = P/F8
      transferSheet.getRange(4, 34, formulasAH.length, 1).setFormulas(formulasAH); // AH = Q/F8
      transferSheet.getRange(4, 35, formulasAI.length, 1).setFormulas(formulasAI); // AI = R/F8
      transferSheet.getRange(4, 36, formulasAJ.length, 1).setFormulas(formulasAJ); // AJ = S/F8
      transferSheet.getRange(4, 37, formulasAK.length, 1).setFormulas(formulasAK); // AK = T/F8
      transferSheet.getRange(4, 38, formulasAL.length, 1).setFormulas(formulasAL); // AL = Transfer Month

      // Ensure formulas are applied and recalculated before returning control to the UI.
      SpreadsheetApp.flush();
    }
    
    
    Logger.log('Transfer Request formulas set for ' + month + ' (' + formulasE.length + ' rows)');
    
  } catch (error) {
    Logger.log('Error in runTransferRequestFormulas: ' + error.toString());
  }
}
