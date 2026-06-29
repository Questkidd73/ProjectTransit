# Log Sheet Setup for CUN Template

## Required Sheet: Log: Transfer Requests

This sheet needs to be added to your "Copy of CUN 2025 Monthly Transfer Request" template.

### Create the Sheet

1. In your Google Sheet, click the **+** button at the bottom to add a new sheet
2. Name it exactly: **Log: Transfer Requests**

### Column Headers (Row 1)

Copy these headers into Row 1:

```
A1: Request ID
B1: Timestamp
C1: Submitted By
D1: Site
E1: Year
F1: Month
G1: Type
H1: Program
I1: Line Item Description
J1: Category
K1: Local Account 1 USD
L1: Local Account 2 USD
M1: Local Account 3 USD
N1: PNC USD
O1: Payments to Others USD
P1: Total USD
Q1: Total MXN
R1: Exchange Rate
S1: Status
T1: Finance Notes
U1: Disbursement Date
V1: Reference Number
```

### Quick Setup Instructions

**Method 1: Manual Entry**
1. Create new sheet named "Log: Transfer Requests"
2. In Row 1, enter the 22 column headers listed above
3. Format Row 1 as bold
4. Freeze Row 1 (View > Freeze > 1 row)
5. Set column widths:
   - A: 200px (Request ID)
   - B: 150px (Timestamp)
   - C: 200px (Submitted By)
   - D-J: 120px each
   - K-Q: 100px each (USD/MXN amounts)
   - R: 80px (Exchange Rate)
   - S: 100px (Status)
   - T: 200px (Finance Notes)
   - U: 120px (Disbursement Date)
   - V: 150px (Reference Number)

**Method 2: Copy Template**
```
Request ID | Timestamp | Submitted By | Site | Year | Month | Type | Program | Line Item Description | Category | Local Account 1 USD | Local Account 2 USD | Local Account 3 USD | PNC USD | Payments to Others USD | Total USD | Total MXN | Exchange Rate | Status | Finance Notes | Disbursement Date | Reference Number
```

### Column Descriptions

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | Request ID | Text | Auto-generated (YYYY-MM-SITE-PROG-###) |
| B | Timestamp | Date/Time | When request was submitted |
| C | Submitted By | Email | User who submitted request |
| D | Site | Text | From Setup sheet (e.g., CUN) |
| E | Year | Number | From Setup sheet (e.g., 2025) |
| F | Month | Text | Month of request (e.g., January) |
| G | Type | Text | "Budget" or "Non-Budget" |
| H | Program | Text | Program name or category |
| I | Line Item Description | Text | Description of expense |
| J | Category | Text | Expense category |
| K | Local Account 1 USD | Currency | Amount from local account 1 |
| L | Local Account 2 USD | Currency | Amount from local account 2 |
| M | Local Account 3 USD | Currency | Amount from local account 3 |
| N | PNC USD | Currency | Amount from PNC account |
| O | Payments to Others USD | Currency | Amount for payments to others |
| P | Total USD | Currency | Sum of all USD amounts |
| Q | Total MXN | Currency | Total in MXN (USD * rate) |
| R | Exchange Rate | Number | Rate at time of request |
| S | Status | Text | "Requested" or "Disbursed" |
| T | Finance Notes | Text | Notes from Finance Dept |
| U | Disbursement Date | Date | When Finance sent funds |
| V | Reference Number | Text | Wire/check reference # |

### Formatting Recommendations

**Row 1 (Headers):**
- Bold
- Background color: Light blue (#4A86E8)
- Text color: White
- Freeze row

**Columns K-Q (Currency):**
- Format: Currency ($)
- Decimal places: 2

**Column R (Exchange Rate):**
- Format: Number
- Decimal places: 2

**Column S (Status):**
- Data validation dropdown:
  - Requested
  - Disbursed

**Column U (Disbursement Date):**
- Format: Date (MM/DD/YYYY)

### Optional: Conditional Formatting

**Status Column (S):**
- If "Requested" → Yellow background
- If "Disbursed" → Green background

**Setup:**
1. Select column S (from S2 down)
2. Format > Conditional formatting
3. Rule 1: Text is exactly "Requested" → Yellow (#FFF2CC)
4. Rule 2: Text is exactly "Disbursed" → Green (#D9EAD3)

### Sample Data (for testing)

After setting up headers, you can test with this sample row:

```
A2: 2025-07-CUN-STRO-001
B2: 11/25/2025 14:30:00
C2: user@example.com
D2: CUN
E2: 2025
F2: July
G2: Budget
H2: Strong Families Cancun
I2: Staff Salaries
J2: Personnel
K2: 1000
L2: 0
M2: 0
N2: 0
O2: 0
P2: 1000
Q2: 17000
R2: 17.0
S2: Requested
T2: 
U2: 
V2: 
```

### Verification

After setup, verify:
- [ ] Sheet named exactly "Log: Transfer Requests"
- [ ] 22 columns (A through V)
- [ ] Headers in Row 1
- [ ] Row 1 is frozen
- [ ] Currency columns formatted
- [ ] Status dropdown works
- [ ] Ready for data starting in Row 2

### Integration with Scripts

Once this sheet is created, the scripts will:
1. **Auto-populate** when you submit requests
2. **Track** all budget and non-budget items
3. **Calculate** totals automatically
4. **Enable** Finance to update status
5. **Generate** reports from this data

### Maintenance

**Monthly:**
- Review pending requests (Status = "Requested")
- Finance updates disbursed items

**Yearly:**
- Archive previous year's data
- Start fresh for new year (or keep for historical tracking)

**As Needed:**
- Export to Excel for external reporting
- Filter by program, month, or status
- Sort by disbursement date for Finance tracking

---

## Quick Copy-Paste Headers

For fastest setup, copy this single line and paste into Row 1:

```
Request ID	Timestamp	Submitted By	Site	Year	Month	Type	Program	Line Item Description	Category	Local Account 1 USD	Local Account 2 USD	Local Account 3 USD	PNC USD	Payments to Others USD	Total USD	Total MXN	Exchange Rate	Status	Finance Notes	Disbursement Date	Reference Number
```

(This is tab-separated, so it will paste into separate cells)

---

**Status:** Ready to Create  
**Time to Setup:** 5-10 minutes  
**Required for:** Scripts to function properly
