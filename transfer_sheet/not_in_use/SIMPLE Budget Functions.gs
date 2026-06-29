// SIMPLE BUDGET FUNCTIONS - EXACT COPY FROM OLD SCRIPT
// Only 3 functions: runBudgetFormulas, requestThisMonthBudget, and menu

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Budget Management")
    .addItem("Setup Budget Formulas", "runBudgetFormulas")
    .addItem("Autofill Budget → Column J", "requestThisMonthBudget")
    .addToUi();
}

// ** Budget Requests ** //
function runBudgetFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Budget Transfer Planning Sheet")
  var range = sheet.getRange("A:W");

  // ** Query Budget ** //
  var cell = sheet.getRange(("A6"));
  cell.setFormula("=QUERY('Transfer Commitment'!A6:G)")

  var clearRange = sheet.getRange("H6:V");
  clearRange.clearContent();

  var lookuprange = [];
  lookuprange[0] = "6:";
  lookuprange[1] = sheet.getLastRow();

  // ** Budget MXN ** //
  var cell = sheet.getRange("H"+lookuprange[0] + "H"+lookuprange[1]);
  cell.setFormula("=IFERROR(INDEX(budget,match(A6,'Transfer Commitment'!$A:$A,0),match($D$2,'Transfer Commitment'!$5:$5,0)),)")

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

}

// ** Request this month's budget ** //
function requestThisMonthBudget() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Budget Transfer Planning Sheet")
  var source = sheet.getRange("I6:I");
  var destination = sheet.getRange("J6:J");
  var clearRange = sheet.getRange("J6:N");
  clearRange.clearContent();
  source.copyTo(destination, {contentsOnly:true});

}
