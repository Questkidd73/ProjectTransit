#!/usr/bin/env python3
"""
Budget Sync Service - Google Sheets to Supabase

Reads budget data from Google Sheets "Local Budget by Program" tab
and syncs to budget_lines table in Supabase.

Structure:
- File setup tab: year, exchange rate, site info
- Local Budget by Program tab: programs × monthly amounts
"""

import os
import re
from typing import Dict, List, Optional
import pandas as pd
from dotenv import load_dotenv
import supabase
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

# Load environment variables
load_dotenv()

# Configuration
SPREADSHEET_ID = os.getenv("BUDGET_SPREADSHEET_ID", "1trqT5CklyP1McaKQQwoOeAw6llGLuPDNTWkRCJqG0oc")
SERVICE_ACCOUNT_PATH = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH", "service_account.json")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Tab names
TAB_FILE_SETUP = "File setup"
TAB_TOTAL_BUDGET = "Total Budget"
TAB_LOCAL_BUDGET = "Local Budget"

# Mapping from Google Sheet program names (Spanish/local) → DB program names (English)
# Add new entries here as more sites are onboarded.
PROGRAM_NAME_MAP: dict = {
    # Cancún
    "PROGRAMA ESPERANZA CUN":   "Hope Program Cancun",
    "FAMILIAS FUERTES CUN":     "Strong Families Cancun",
    "PROGRAMA TRANSICIÓN CUN":  "Transition Program Cancun",
    "PROGRAMA TRANSICION CUN":  "Transition Program Cancun",  # accent-insensitive fallback
    "OPERACIONES CUN":          "International Operations",
    "ARRENDAMIENTOS CUN":       "Projects & Improvements CUN",
    "DESARROLLO CUN":           "Ministry Partnerships Cancun",
    "PROGRAMA EDUCATIVO CUN":   "Reggio Emilia",
}


class BudgetSyncService:
    def __init__(self):
        self.supabase = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)
        self.sheets_service = self._init_sheets_service()
        
    def _init_sheets_service(self):
        """Initialize Google Sheets API service."""
        credentials = Credentials.from_service_account_file(
            SERVICE_ACCOUNT_PATH,
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
        )
        return build("sheets", "v4", credentials=credentials)
    
    def read_sheet(self, tab_name: str, range_spec: str) -> List[List]:
        """Read data from Google Sheets tab."""
        sheet = self.sheets_service.spreadsheets()
        result = sheet.values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{tab_name}!{range_spec}"
        ).execute()
        return result.get("values", [])
    
    def get_file_setup(self) -> Dict:
        """
        Read File setup tab to get:
        - Budget year (row 4, col F)
        - Site name (row 5, col E)
        - Currency (row 7, col E)
        - Exchange rate (row 8, col E)
        """
        data = self.read_sheet(TAB_FILE_SETUP, "A1:Z50")
        
        # Parse by finding key-value pairs
        year = 2026
        site_name = "Cancun"
        currency = "MXN"
        exchange_rate = 17.2
        
        for row in data:
            if not row or len(row) < 2:
                continue
            for i, cell in enumerate(row):
                if "Budget year" in str(cell) and i + 1 < len(row):
                    try:
                        year = int(row[i + 1])
                    except (ValueError, IndexError):
                        pass
                elif "Budget" in str(cell) and "Cancun" in str(row[i + 1]) if i + 1 < len(row) else False:
                    site_name = row[i + 1] if i + 1 < len(row) else "Cancun"
                elif "Budget currency" in str(cell) and i + 1 < len(row):
                    currency = row[i + 1] if i + 1 < len(row) else "MXN"
                elif "Exchange rate" in str(cell) and i + 1 < len(row):
                    try:
                        exchange_rate = float(row[i + 1])
                    except (ValueError, IndexError):
                        pass
        
        # Extract master lists for Clase and Category (Dato estadístico)
        clases = []
        categories = []
        clase_col = None
        cat_col = None

        # First pass: find the column indices for Clase and Category headers
        for row in data:
            if not row:
                continue
            for i, cell in enumerate(row):
                cell_str = str(cell).strip()
                if "Clase" in cell_str and clase_col is None:
                    clase_col = i
                elif ("Dato" in cell_str or "Category" in cell_str or "Presupuesto" in cell_str) and cat_col is None:
                    cat_col = i

        # Second pass: collect values from the identified columns
        if clase_col is not None:
            for row in data:
                if row and len(row) > clase_col and row[clase_col] and str(row[clase_col]).strip():
                    clases.append(str(row[clase_col]).strip())

        if cat_col is not None:
            for row in data:
                if row and len(row) > cat_col and row[cat_col] and str(row[cat_col]).strip():
                    categories.append(str(row[cat_col]).strip())

        return {
            "year": year,
            "site_name": site_name,
            "currency": currency,
            "exchange_rate": exchange_rate,
            "clases": clases,
            "categories": categories,
        }
    
    def _parse_amount(self, value) -> float:
        """Parse a currency string to float, return 0.0 on failure."""
        if not value or str(value).strip() in ("", "$ -", "-"):
            return 0.0
        cleaned = re.sub(r"[^\d.]", "", str(value))
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def get_budget_rows(self, tab_name: str) -> List[Dict]:
        """
        Read a budget tab and return raw rows with all descriptive columns and monthly amounts.

        Confirmed column structure (0-indexed, from live header inspection):
          0: Budget              -> site name
          1: KEY
          2: US Netsuite Category -> Program name (English, matches DB directly)
          3: Producto             -> Spanish program name (ignored — col 2 used)
          4: Clase                -> sub-group within program
          5: Dato estadistico: Presupuesto -> line item name (stored as 'category')
          6: Description
          7: Additional Desc. (optional)
          8-19: January..December MXN
          20: Annual MXN total (skip)
          21-24: empty
          25-36: January..December USD
        """
        data = self.read_sheet(tab_name, "A3:AJ500")
        if not data or len(data) < 2:
            return []

        COL_SITE     = 0
        COL_PROGRAM  = 2  # US Netsuite Category = English program name, matches DB directly
        COL_PRODUCTO = 3  # Producto = Spanish sub-group under US NS Category
        COL_CLASE    = 4  # Clase = sub-group within Producto
        COL_DATO     = 5  # Dato estadistico = line item name
        COL_DESC     = 6  # Description
        COL_ADDL     = 7  # Additional Desc.
        COL_JAN      = 8  # January MXN
        COL_JAN_USD  = 25 # January USD

        # First pass: collect all known program names to filter out subtotal rows
        all_program_names = set()
        for row in data[1:]:
            if row and len(row) > COL_PROGRAM:
                pn = str(row[COL_PROGRAM]).strip()
                if pn and pn not in ("$ -", ""):
                    all_program_names.add(pn.lower())

        rows = []
        for row in data[1:]:
            if not row or len(row) <= COL_DATO:
                continue
            site_name    = str(row[COL_SITE]).strip()     if len(row) > COL_SITE     else ""
            program_name = str(row[COL_PROGRAM]).strip()   if len(row) > COL_PROGRAM  else ""
            producto     = str(row[COL_PRODUCTO]).strip()  if len(row) > COL_PRODUCTO else ""
            clase        = str(row[COL_CLASE]).strip()     if len(row) > COL_CLASE    else ""
            category     = str(row[COL_DATO]).strip()      if len(row) > COL_DATO     else ""
            description  = str(row[COL_DESC]).strip()      if len(row) > COL_DESC     else ""
            additional_desc = str(row[COL_ADDL]).strip()   if len(row) > COL_ADDL     else ""

            if not program_name or program_name in ("$ -", ""):
                continue
            if not category or category in ("$ -", ""):
                continue
            # Skip subtotal rows — category equals a known program name
            if category.lower() in all_program_names:
                continue

            monthly_local = {}
            monthly_usd   = {}
            for m in range(1, 13):
                monthly_local[m] = self._parse_amount(row[COL_JAN + (m-1)]     if COL_JAN + (m-1)     < len(row) else None)
                monthly_usd[m]   = self._parse_amount(row[COL_JAN_USD + (m-1)] if COL_JAN_USD + (m-1) < len(row) else None)

            rows.append({
                "site_name":      site_name,
                "program_name":   program_name,   # English, matches DB directly
                "producto":       producto,        # Spanish sub-group under US NS Category
                "clase":          clase,
                "category":       category,        # dato_estadistico = line item name
                "description":    description,
                "additional_desc": additional_desc,
                "monthly_local":  monthly_local,
                "monthly_usd":    monthly_usd,
            })
        return rows

    def get_total_budget_aggregated(self) -> Dict[str, Dict[int, float]]:
        """Aggregate line items by program for budget_lines table."""
        rows = self.get_budget_rows(TAB_TOTAL_BUDGET)
        program_monthly_totals: Dict[str, Dict[int, float]] = {}
        for row in rows:
            p = row["program_name"]
            if p not in program_monthly_totals:
                program_monthly_totals[p] = {i: 0.0 for i in range(1, 13)}
            for m in range(1, 13):
                program_monthly_totals[p][m] += row["monthly_local"][m]
        return program_monthly_totals
    
    def get_local_budget_by_program(self) -> List[Dict]:
        """Read Local Budget tab using shared get_budget_rows() method."""
        rows = self.get_budget_rows(TAB_LOCAL_BUDGET)
        # Reformat to old dict shape for backward compat with sync_budget
        result = []
        for row in rows:
            result.append({
                "site_name":      row["site_name"],
                "program_name":   row["program_name"],
                "category":       row["category"],
                "description":    row["description"],
                "monthly_amounts": row["monthly_local"],
                "monthly_usd":     row["monthly_usd"],
            })
        return result
    
    def get_site_id(self, site_name: str) -> Optional[str]:
        """Get site UUID from site name."""
        response = self.supabase.table("sites").select("id").eq("name", site_name).execute()
        if response.data:
            return response.data[0]["id"]
        return None
    
    def get_program_id(self, site_id: str, program_name: str) -> Optional[str]:
        """Get program UUID from site_id and program name."""
        response = self.supabase.table("programs").select("id").eq("site_id", site_id).eq("name", program_name).execute()
        if response.data:
            return response.data[0]["id"]
        return None
    
    def sync_budget(self):
        """Main sync function: read from Sheets, write to Supabase."""
        print("Starting budget sync...")

        setup = self.get_file_setup()
        print(f"Budget year: {setup['year']}, Exchange rate: {setup['exchange_rate']}")

        # Read all raw rows (Total Budget preferred, Local Budget fallback)
        print("Reading from Total Budget tab...")
        raw_rows = self.get_budget_rows(TAB_TOTAL_BUDGET)
        if not raw_rows:
            print("Total Budget empty, falling back to Local Budget tab...")
            raw_rows = self.get_budget_rows(TAB_LOCAL_BUDGET)
        print(f"Found {len(raw_rows)} raw rows")

        # Group rows by site → program for aggregation
        budget_by_site: Dict[str, List[Dict]] = {}
        for row in raw_rows:
            s = row["site_name"]
            if s not in budget_by_site:
                budget_by_site[s] = []
            budget_by_site[s].append(row)

        budget_lines_synced = 0
        line_items_synced   = 0
        missing_programs    = 0

        for site_name, rows in budget_by_site.items():
            site_id = self.get_site_id(site_name)
            if not site_id:
                print(f"Warning: Site '{site_name}' not found in database — skipping")
                continue
            print(f"Syncing {len(rows)} rows for {site_name}...")

            # Aggregate by program for budget_lines
            program_totals: Dict[str, Dict[int, Dict]] = {}
            for row in rows:
                p = row["program_name"]
                if p not in program_totals:
                    program_totals[p] = {m: {"local": 0.0, "usd": 0.0} for m in range(1, 13)}
                for m in range(1, 13):
                    program_totals[p][m]["local"] += row["monthly_local"][m]
                    program_totals[p][m]["usd"]   += row["monthly_usd"][m]

            for program_name, monthly in program_totals.items():
                # Col 2 (US Netsuite Category) is already the English DB name — try direct first
                db_program_name = program_name.strip()
                program_id = self.get_program_id(site_id, db_program_name)
                # Fallback: try PROGRAM_NAME_MAP (for sheets that use local-language names)
                if not program_id:
                    mapped = PROGRAM_NAME_MAP.get(db_program_name)
                    if mapped:
                        program_id = self.get_program_id(site_id, mapped)
                        if program_id:
                            db_program_name = mapped
                if not program_id:
                    missing_programs += 1
                    if missing_programs <= 10:
                        print(f"  Skipped (no DB match): '{program_name}'")
                    continue

                # --- Write budget_lines (program-level totals) ---
                for month, amounts in monthly.items():
                    existing = self.supabase.table("budget_lines").select("id").eq(
                        "program_id", program_id).eq("year", setup["year"]).eq("month", month).execute()
                    record = {
                        "local_amount": amounts["local"],
                        "usd_amount": amounts["usd"] or None,
                        "budgeted_exchange_rate": setup["exchange_rate"],
                    }
                    if existing.data:
                        self.supabase.table("budget_lines").update(record).eq("id", existing.data[0]["id"]).execute()
                    else:
                        record.update({"program_id": program_id, "year": setup["year"], "month": month})
                        self.supabase.table("budget_lines").insert(record).execute()
                    budget_lines_synced += 1

                # --- Write budget_line_items (individual expense categories) ---
                # Aggregate rows by (category, clase): same NetSuite category can have multiple
                # descriptions in the sheet — sum them before writing so amounts are not overwritten.
                program_rows = [r for r in rows if r["program_name"].strip() == program_name.strip()]
                category_totals: Dict[tuple, dict] = {}
                for row in program_rows:
                    # Key includes description so same category with different descriptions = separate rows
                    key = (
                        (row["producto"]        or "").strip().lower(),
                        (row["clase"]           or "").strip().lower(),
                        row["category"].strip().lower(),
                        (row["description"]     or "").strip().lower(),
                        (row["additional_desc"] or "").strip().lower(),
                    )
                    if key not in category_totals:
                        category_totals[key] = {
                            "category":        row["category"].strip(),
                            "producto":        row["producto"].strip()        if row["producto"]        else "",
                            "clase":           row["clase"].strip()           if row["clase"]           else "",
                            "description":     row["description"].strip()     if row["description"]     else "",
                            "additional_desc": row["additional_desc"].strip() if row["additional_desc"] else "",
                            "monthly_local": {m: 0.0 for m in range(1, 13)},
                            "monthly_usd":   {m: 0.0 for m in range(1, 13)},
                        }
                    for m in range(1, 13):
                        category_totals[key]["monthly_local"][m] += row["monthly_local"][m]
                        category_totals[key]["monthly_usd"][m]   += row["monthly_usd"][m]

                for agg in category_totals.values():
                    for month in range(1, 13):
                        local_amt = agg["monthly_local"][month]
                        usd_amt   = agg["monthly_usd"][month]
                        existing_li = self.supabase.table("budget_line_items").select("id").eq(
                            "program_id", program_id).eq("year", setup["year"]).eq("month", month
                            ).eq("category", agg["category"]
                            ).eq("clase",    agg["clase"]    or ""  
                            ).eq("producto", agg["producto"] or ""
                            ).eq("description", agg["description"] or "").execute()
                        li_record = {
                            "local_amount":           local_amt,
                            "usd_amount":             usd_amt or None,
                            "budgeted_exchange_rate": setup["exchange_rate"],
                            "producto":               agg["producto"]        or None,
                            "clase":                  agg["clase"]           or None,
                            "description":            agg["description"]     or None,
                            "additional_desc":        agg["additional_desc"] or None,
                            "synced_at":              __import__('datetime').datetime.utcnow().isoformat(),
                        }
                        if existing_li.data:
                            self.supabase.table("budget_line_items").update(li_record).eq("id", existing_li.data[0]["id"]).execute()
                        else:
                            li_record.update({"program_id": program_id, "year": setup["year"], "month": month, "category": agg["category"]})
                            self.supabase.table("budget_line_items").insert(li_record).execute()
                        line_items_synced += 1

        print(f"Sync complete: {budget_lines_synced} program budget lines, {line_items_synced} line items synced, {missing_programs} programs not found")

        # --- Sync site_productos: collect all distinct Producto values per site ---
        for site_name, rows in budget_by_site.items():
            site_id = self.get_site_id(site_name)
            if not site_id:
                continue
            seen = set()
            for row in rows:
                p = (row.get("producto") or "").strip()
                if p and p.lower() not in seen:
                    seen.add(p.lower())
                    self.supabase.table("site_productos").upsert(
                        {"site_id": site_id, "name": p},
                        on_conflict="site_id,name"
                    ).execute()
            # Also seed from PROGRAM_NAME_MAP keys (Spanish names) so all known
            # Productos are available even if not yet used in a budget row.
            for sort_i, spanish_name in enumerate(PROGRAM_NAME_MAP.keys()):
                if spanish_name.lower() not in seen:
                    self.supabase.table("site_productos").upsert(
                        {"site_id": site_id, "name": spanish_name, "sort_order": 100 + sort_i},
                        on_conflict="site_id,name"
                    ).execute()
        print("site_productos sync complete")

        # --- Sync site_clases and site_categories from Setup tab master lists ---
        clases = setup.get("clases", [])
        categories = setup.get("categories", [])
        for site_name in budget_by_site.keys():
            site_id = self.get_site_id(site_name)
            if not site_id:
                continue
            for sort_i, clase in enumerate(clases):
                if clase:
                    self.supabase.table("site_clases").upsert(
                        {"site_id": site_id, "name": clase, "sort_order": sort_i},
                        on_conflict="site_id,name"
                    ).execute()
            for sort_i, cat in enumerate(categories):
                if cat:
                    self.supabase.table("site_categories").upsert(
                        {"site_id": site_id, "name": cat, "sort_order": sort_i},
                        on_conflict="site_id,name"
                    ).execute()
        print("site_clases and site_categories sync complete")


if __name__ == "__main__":
    service = BudgetSyncService()
    service.sync_budget()
