# Mapping Save Issue - Root Cause & Fix

## Problem Summary
After the overnight cron run on Nov 20, 2025, 6 new constituents were created (77200-77205) but their mappings were NOT persisted to the `constituent_mapping.json` file on the server, even though the logs showed "Saved 111, 112, 113, 114, 115, 116 constituent mappings".

## Root Causes Identified

### 1. **Duplicate Save Calls**
The mapping was being saved TWICE for each new constituent:
- Once in `_create_nxt_constituent()` at line 694
- Again in the main sync loop at line 210

This created a race condition where the second save might use stale data.

### 2. **Missing File Flush**
The `_save_constituent_mapping()` function was not explicitly flushing the file buffer or forcing an OS sync, which could cause data loss if the process crashes or is interrupted.

### 3. **No Save Verification**
There was no verification that the file was actually written correctly after the save operation.

## Fixes Applied

### Fix 1: Removed Duplicate Save
**File:** `sync_orchestrator.py` line 210

**Before:**
```python
if not nxt_constituent_id:
    nxt_constituent_id = self._create_nxt_constituent(sr_participant)
    if not nxt_constituent_id:
        self.logger.error(f"Failed to create NXT constituent...")
        continue
    # Add constituent mapping
    self.mapping_service.add_constituent_mapping(sr_user_id, nxt_constituent_id)
```

**After:**
```python
if not nxt_constituent_id:
    # Note: _create_nxt_constituent already saves the mapping
    nxt_constituent_id = self._create_nxt_constituent(sr_participant)
    if not nxt_constituent_id:
        self.logger.error(f"Failed to create NXT constituent...")
        continue
```

### Fix 2: Added File Flush & Verification
**File:** `mapping_service.py` lines 94-111

**Before:**
```python
def _save_constituent_mapping(self):
    mapping_path = self.config.paths['constituent_mapping']
    try:
        with open(mapping_path, 'w') as f:
            json.dump(self.constituent_mapping, f, indent=2)
        self.logger.info(f"Saved {len(self.constituent_mapping)} constituent mappings")
    except Exception as e:
        self.logger.error(f"Error saving constituent mapping file: {e}")
```

**After:**
```python
def _save_constituent_mapping(self):
    mapping_path = self.config.paths['constituent_mapping']
    try:
        with open(mapping_path, 'w') as f:
            json.dump(self.constituent_mapping, f, indent=2)
            f.flush()  # Force write to disk
            os.fsync(f.fileno())  # Ensure OS writes to disk
        self.logger.info(f"Saved {len(self.constituent_mapping)} constituent mappings to {mapping_path}")
        # Verify the save by reading back
        with open(mapping_path, 'r') as f:
            verify_data = json.load(f)
        if len(verify_data) != len(self.constituent_mapping):
            self.logger.error(f"⚠️  SAVE VERIFICATION FAILED! Expected {len(self.constituent_mapping)} but file has {len(verify_data)}")
        else:
            self.logger.debug(f"✓ Save verified: {len(verify_data)} mappings in file")
    except Exception as e:
        self.logger.error(f"Error saving constituent mapping file: {e}")
```

## Missing Mappings to Add

The following 6 mappings need to be manually added to the server's `constituent_mapping.json`:

```json
"210732": "77200",
"210740": "77201",
"210717": "77202",
"210500": "77203",
"210386": "77204",
"210385": "77205"
```

## Next Steps

1. ✅ **Upload fixed files to server:**
   - `sync_orchestrator.py`
   - `mapping_service.py`

2. ✅ **Update server's constituent_mapping.json:**
   - Add the 6 missing mappings above
   - Verify file has 115 total entries (109 + 6)

3. ✅ **Monitor next cron run:**
   - Check logs for "✓ Save verified" messages
   - Check for any "SAVE VERIFICATION FAILED" errors
   - Verify mapping file is updated after sync

## Prevention

The new verification system will:
- Force immediate disk writes with `flush()` and `fsync()`
- Verify every save by reading the file back
- Log errors if verification fails
- Include full file path in save messages for debugging

This ensures that any future save issues will be immediately detected and logged.
