# Corner Cases & Edge Cases Documentation

**Dream House Interior - Estimation System**

---

## 1. INPUT VALIDATION CORNER CASES

### Form Fields

- **Empty Values**
  - Party name: Empty string accepted, should show validation error
  - Contractor name: Empty string, should be required
  - Mobile number: Invalid format (letters, special chars), no validation currently
  - Location: Very long strings (>500 chars) - database accepts unlimited
  - Notes: Empty textarea should be optional

- **Special Characters**
  - Party name with symbols: `@#$%`, Unicode characters (✓, é, 中文)
  - Contractor name with quotes: `O'Brien`, `"Quoted Name"`
  - Mobile number with country codes: `+91-98456-45828`, spaces, dashes
  - Location with special chars: `22'-0" x 15'-6"`

- **Numeric Edge Cases**
  - Negative numbers for SFT, Rate, Amount: Should reject negative values
  - Zero values: SFT=0, Rate=0, Amount=0 (edge case for calculation)
  - Very large numbers: SFT=999999999, Rate=999999999 (database overflow?)
  - Decimal precision: SFT=1.123456789 (precision loss issues?)
  - Discount >100%: Currently allows, final amount becomes negative
  - Discount = 100%: Final amount = 0 (valid but unusual)
  - Advance > Gross Total: Final amount becomes negative

- **Date Edge Cases**
  - Past dates (very old): `01/01/1900`
  - Future dates: `31/12/2099`
  - Today's date: Should auto-populate
  - Invalid dates: `32/13/2026` (browser validation prevents, but API should validate)
  - Timezone issues: Date conversion to ISO format

---

## 2. LINE ITEMS CORNER CASES

### Table Operations

- **No items added**
  - User submits form with no line items (currently unchecked)
  - Table shows but all rows empty
  - Should show validation: "Add at least one item"

- **Single item vs multiple items**
  - Only 1 item: Should work fine
  - Very large number: 100+ items, UI performance issue?
  - Adding/removing items rapidly (race condition?)

- **Empty rows in table**
  - Description empty but other fields filled
  - All fields empty in a row (should reject or ignore?)
  - Only SFT filled, no Rate or Description

- **Row deletion edge cases**
  - Delete first row: Numbering should adjust
  - Delete last row: Should work fine
  - Delete all rows: Serial numbers reset to empty
  - Undo delete: Not supported, data lost

- **Calculation precision**
  - SFT=0.1, Rate=0.1: Amount=0.01 (very small amounts)
  - SFT=999.99, Rate=999.99: Amount=999980.0001 (large amounts)
  - Decimal rounding: 0.0066667 rounded to display (2 decimals)
  - Floating point errors: 0.1 + 0.2 ≠ 0.3 in JavaScript

---

## 3. FORM SUBMISSION CORNER CASES

### Data Collection

- **Rapid consecutive submissions**
  - User clicks "Save & Generate PDF" multiple times quickly
  - Creates duplicate estimates in DB
  - No debounce or loading state to prevent

- **Form reset**
  - After successful submission, should clear fields
  - Table resets but maintains one empty row
  - Date field resets to today

- **Network timeout**
  - Slow backend response (>30 seconds)
  - User refreshes page during submission (lost data)
  - Backend crashes mid-request

- **Large payload**
  - 100+ items with long descriptions: Payload size >10MB?
  - Should have payload size limit

---

## 4. VIEW/DISPLAY CORNER CASES

### Viewing Estimates

- **Empty database**
  - First time loading "View Estimates": "No estimates found" message shows
  - All estimates deleted: Same message should show

- **Large result sets**
  - 1000+ estimates returned: Performance issue?
  - Pagination not implemented
  - Sorting not available

- **Date formatting**
  - Different locales: `formatDate()` uses 'en-IN' hardcoded
  - Daylight saving time issues
  - Very old dates (before 1970)

- **Currency display**
  - Zero amount: Shows `₹ 0.00` correctly?
  - Negative amounts: Shows `-₹ 1000.00` (UI issue?)
  - Very large amounts: `₹ 999,999,999.99` formatting
  - Different currencies: Only INR supported, hardcoded

---

## 5. PDF GENERATION CORNER CASES

### PDF Creation

- **Missing PDF directory**
  - `generated_pdfs` folder deleted during runtime
  - PDF generation fails silently
  - No error handling for file system errors

- **Insufficient disk space**
  - PDF cannot be written if disk full
  - No user-facing error message

- **Long content in PDF**
  - Very long descriptions: Text overflow in table?
  - Multi-page PDFs: Does layout handle properly?
  - Long notes: Text wrapping/truncation?

- **Special characters in PDF**
  - Unicode characters might not render in PDF
  - Symbols (₹, °, etc.) support?
  - Special font requirements

- **Concurrent PDF generation**
  - Multiple users downloading PDFs simultaneously
  - File naming conflict: `estimate_1.pdf` overwritten?
  - Race condition between write and read

- **Large file paths**
  - File path too long (system limit)
  - Windows vs macOS path separators

---

## 6. DATABASE CORNER CASES

### Data Integrity

- **Duplicate estimates**
  - Same data submitted twice creates duplicates
  - No unique constraint on (party_name, date, location)
  - Should prevent or warn user

- **Orphaned items**
  - Cascade delete works correctly? (configured in models)
  - Delete estimate: All items deleted with it
  - Database constraints enforced

- **NULL values**
  - Mobile number: Can be NULL, stored correctly?
  - Notes: Can be NULL, displayed correctly in frontend?
  - Size: Can be NULL for some items?

- **Data type mismatches**
  - String too long for VARCHAR column
  - Float precision loss in SQLite
  - DateTime timezone handling

- **Database file corruption**
  - Disk failure during write
  - Multiple backend instances accessing DB simultaneously
  - No database backups

---

## 7. API ENDPOINT CORNER CASES

### GET /api/estimates

- **Pagination parameters**
  - `skip=-1, limit=0`: Invalid values not validated
  - `skip=999999, limit=999999`: Performance issue
  - `limit=0`: Returns empty results

- **Response empty**
  - No estimates: `[]` returned correctly
  - Large response: JSON serialization issues?

### POST /api/estimates

- **Validation**
  - No items in payload: Backend should reject
  - Invalid item structure: Should validate schema
  - Missing required fields: Error handling?

- **Database constraints**
  - Duplicate entry: How does backend handle?
  - Transaction rollback if PDF generation fails?

### GET /api/estimates/{id}

- **Invalid ID**
  - ID doesn't exist: 404 status correct
  - ID is negative: Should return 404
  - ID is string: Type validation

- **Deleted estimate**
  - Estimate was deleted, then accessed: 404 correct

### PUT /api/estimates/{id}

- **Partial updates**
  - Only updating some fields: Are others preserved?
  - Can update to empty values? (validation)

- **Concurrent updates**
  - Two users editing same estimate simultaneously
  - Last write wins (data loss?)

### DELETE /api/estimates/{id}

- **Double delete**
  - Deleting already deleted estimate: 404 correct
  - No confirmation dialog (frontend side)

### GET /api/estimates/{id}/pdf

- **PDF not found**
  - PDF file deleted from disk after creation: 404 correct
  - Request made before PDF generated: Race condition

- **Concurrent PDF requests**
  - Multiple downloads of same estimate simultaneously
  - File locking issues on some OS

---

## 8. FRONTEND/UX CORNER CASES

### Tab Navigation

- **Rapid tab switching**
  - Click view, click create, click view quickly
  - `loadEstimates()` called multiple times
  - Memory leak from multiple requests?

- **Estimates loaded but tab closed**
  - User loads estimates, switches tab, comes back
  - Should reload or cache? (currently reloads each time)

### Button States

- **Disabled state during processing**
  - User can click "Save PDF" twice during submission
  - No loading spinner or disabled state
  - Backend receives duplicate request

- **Delete confirmation**
  - `confirm()` dialog skipped if user cancels
  - No undo functionality

### Window/Browser Events

- **Page refresh during submission**
  - User refreshes while form submitting
  - Data lost, estimate may or may not be created
  - Inconsistent state

- **Browser back button**
  - Tab content not preserved
  - Form data lost

- **Multiple browser tabs**
  - One tab creates estimate, another shows stale data
  - No real-time sync between tabs

---

## 9. BROWSER COMPATIBILITY CORNER CASES

### Browser-specific issues

- **Date input type**
  - Safari: Different date picker UI
  - Mobile browsers: Different date format
  - IE: `date` input not supported

- **Fetch API**
  - Older browsers: Not supported (no polyfill)
  - CORS issues with specific browser configurations

- **LocalStorage/SessionStorage**
  - Private browsing: Not available
  - Storage quota exceeded (unlikely but possible)

- **File download**
  - PDF download in popup (blocked by browser)
  - User didn't allow pop-ups: Silent failure
  - Different download behavior by browser

---

## 10. ERROR HANDLING CORNER CASES

### Network Errors

- **Backend unreachable**
  - Server down: Generic "Error" message
  - Connection timeout: No timeout handling
  - CORS errors: Unclear error message

- **Partial response received**
  - Response incomplete or corrupted
  - JSON parse error not handled gracefully

### Frontend Error Handling

- **Null reference errors**
  - DOM element not found: `.querySelector()` returns null
  - `.value` on null element: Uncaught error

- **JSON parsing**
  - Invalid JSON response: `.json()` throws
  - Missing fields in response: Undefined access

- **Unhandled promise rejection**
  - Async function errors not caught
  - Browser console shows uncaught error

---

## 11. CALCULATION CORNER CASES

### Financial Calculations

- **Gross total calculation**
  - All amounts are 0: Gross=0 (should allow?)
  - Sum precision: Floating point accumulation errors
  - Very large sum: Overflow issues?

- **Discount calculation**
  - `gross * discount / 100`: Precision loss
  - Discount=50%, Gross=0.01: Result=0.005 (rounding issues)

- **Final amount**
  - `(gross - discountAmount - advance)` can be negative
  - No validation to prevent negative final amount
  - Should display `-₹` for negative? (bad UX)

- **Currency formatting**
  - Locale hardcoded to 'en-IN'
  - Different browser language settings ignored
  - Negative numbers: Format might be `(₹1000)` in some locales

---

## 12. PERFORMANCE CORNER CASES

### Scalability Issues

- **Large tables**
  - 100+ line items: Rendering slow?
  - 1000+ saved estimates: List loading slow?
  - No virtualization/pagination

- **Memory leaks**
  - Event listeners not removed
  - Repeated tab switching accumulates listeners
  - Large data structures not garbage collected

- **JavaScript execution**
  - Heavy calculations in main thread
  - No Web Workers for processing
  - Blocks UI during large operations

---

## 13. SECURITY CORNER CASES

### Input Security

- **XSS (Cross-Site Scripting)**
  - HTML injection in description: `<script>alert('xss')</script>`
  - Not sanitized in display
  - Party name: `<img src=x onerror=alert('xss')>`

- **SQL Injection**
  - Backend uses SQLAlchemy ORM (protected)
  - But parameterized queries should be verified

- **CSRF (Cross-Site Request Forgery)**
  - No CSRF token on forms
  - Any website can POST to API (CORS allows all)

- **Sensitive data exposure**
  - PDF files world-readable in `generated_pdfs` folder
  - No authentication on API endpoints
  - No user authorization (anyone can access any estimate)

---

## 14. DATA CONSISTENCY CORNER CASES

### Sync Issues

- **Stale data**
  - User modifies estimate in frontend
  - Backend data not updated if API fails
  - No optimistic updates shown

- **Race conditions**
  - Two API requests in flight simultaneously
  - Older request completes after newer one
  - Stale data overwrites newer data

- **Data loss scenarios**
  - Browser crash during submission: Estimate lost
  - Database connection lost: Partial data saved?
  - Disk full during PDF write: Inconsistent state

---

## 15. WORKFLOW CORNER CASES

### Typical User Flows

- **Incomplete workflow**
  - User adds items but doesn't submit form
  - User navigates away: All data lost
  - No draft/autosave feature

- **Editing existing estimate**
  - Not supported in current implementation
  - Can view but cannot edit past estimates
  - Delete and recreate workaround

- **Duplicate estimate**
  - No quick duplicate button
  - User must manually re-enter all data

- **Estimate history**
  - No version control
  - No edit history/changelog
  - No comparison between versions

---

## SUMMARY: CRITICAL ISSUES TO ADDRESS

### High Priority

1. ⚠️ **Duplicate submissions** - Add debounce/disable button during submission
2. ⚠️ **XSS vulnerability** - Sanitize/escape HTML in outputs
3. ⚠️ **Negative final amounts** - Validate and prevent
4. ⚠️ **No authentication** - Add user login/authorization
5. ⚠️ **PDF file security** - Require auth to download PDFs

### Medium Priority

6. ⚠️ **Pagination** - Implement for large result sets
7. ⚠️ **Input validation** - Validate all form fields
8. ⚠️ **Error messages** - Show meaningful error text
9. ⚠️ **Mobile number format** - Validate phone numbers
10. ⚠️ **Decimal precision** - Test calculations thoroughly

### Low Priority

11. ⚠️ **Performance optimization** - Virtual scrolling for large lists
12. ⚠️ **Edit functionality** - Allow editing saved estimates
13. ⚠️ **Autosave draft** - Save form data automatically
14. ⚠️ **Multi-language** - Support different locales
15. ⚠️ **Data backup** - Automated backup system

---

## TESTING RECOMMENDATIONS

### Unit Tests Needed

- [ ] Calculation functions (calcRow, calculateTotals)
- [ ] Currency formatting
- [ ] Date formatting
- [ ] API response parsing

### Integration Tests Needed

- [ ] Create estimate → View estimate → Delete estimate
- [ ] Large form submission (100+ items)
- [ ] PDF generation and download
- [ ] Concurrent operations

### Edge Case Tests Needed

- [ ] Submit with no items
- [ ] Discount = 100%
- [ ] Advance > Gross
- [ ] All fields empty except dates
- [ ] Very long text (2000+ characters)
- [ ] Special characters and Unicode
- [ ] Rapid consecutive submissions

---

**Last Updated:** January 29, 2026
**Project:** Dream House Interior - Estimation System
