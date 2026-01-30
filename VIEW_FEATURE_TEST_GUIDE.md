# Quick Test Guide - View Estimate Feature

## Getting Started 🚀

### Prerequisites:

- System running on localhost:3000 (frontend) and localhost:8000 (backend)
- At least one estimate already created in the database

---

## Test Steps

### Option 1: Fresh Test (Create & View)

#### Step 1: Create an Estimate

```
1. Go to http://localhost:3000
2. Fill in the form:
   - Location: Your Home, Your City
   - Date: Today (auto-filled)
   - Party Name: Test Customer
   - Mobile: 9876543210
   - Contractor: Test Contractor

3. Add at least one line item:
   - Description: Test Item
   - SFT: 100
   - Rate: 500

4. Enter financial info:
   - Discount: 10
   - Advance: 5000

5. Click "💾 Save & Generate PDF"
6. You should see: "✅ Estimate created successfully! Estimate ID: 1"
```

#### Step 2: View the Estimate

```
1. Go to "📋 View Estimates" tab
2. You should see your estimate in the table:
   ID │ Party │ Contractor │ Gross │ Final │ Action
   1  │ Test  │ Test       │ ...   │ ...   │ [View]

3. Click the "View" button
4. Beautiful modal should open!
```

#### Step 3: Verify Display

```
Check the modal displays:
✅ Estimate #1 - Test Customer (title)
✅ Project Information section with all details
✅ Line Items table with your item
✅ Financial Summary showing totals
✅ Notes section (if you added notes)
✅ Download PDF and Close buttons
```

---

### Option 2: Test with Existing Data

If you already have estimates:

```
1. Go to View Estimates tab
2. Click any "View" button
3. Modal should open with estimate details
4. Test features (see below)
```

---

## Feature Testing Checklist

### Display Features ✅

- [ ] Estimate ID displays correctly
- [ ] Party name displays
- [ ] Contractor name displays
- [ ] Location displays
- [ ] Mobile number displays (or "Not provided")
- [ ] Date displays in readable format (e.g., "Jan 29, 2026")

### Line Items Table ✅

- [ ] Serial number (1, 2, 3...)
- [ ] Description shows
- [ ] Size displays (or "-" if none)
- [ ] SFT value shows
- [ ] Rate displays with ₹
- [ ] Amount calculated correctly
- [ ] Total shows correctly
- [ ] If no items: shows "No items found"

### Financial Summary ✅

- [ ] Gross Total shows with ₹
- [ ] Discount percentage shows (0%, 10%, etc.)
- [ ] Discount Amount calculated (Gross × Discount%)
- [ ] Advance Payment shows with ₹
- [ ] Final Amount shows with ₹
  - Calculation: Gross - Discount - Advance
- [ ] Final Amount row highlighted (greenish background)

### Notes Section ✅

- [ ] Shows the notes text
- [ ] Or shows "-" if no notes
- [ ] Multiple lines display correctly
- [ ] Special characters show safely

### Buttons & Interactions ✅

- [ ] "📥 Download PDF" button visible
- [ ] "✖️ Close" button visible
- [ ] Click "📥 Download PDF" → PDF downloads
- [ ] Click "✖️ Close" → Modal closes
- [ ] Click outside modal → Modal closes
- [ ] Click X in header → Modal closes

---

## Edge Case Testing

### Test with Special Data:

```
1. Create estimate with HTML in names:
   Party: "<script>alert('test')</script>"
   Expected: Script tags removed, shows safely

2. Create estimate with very long description:
   Description: "Lorem ipsum dolor sit amet..."
   Expected: Text wraps properly in modal

3. Create estimate without mobile number:
   Leave mobile blank
   Expected: Shows "Not provided"

4. Create estimate without notes:
   Leave notes empty
   Expected: Shows "-"
```

### Test Responsive:

```
Desktop:
- Open modal on laptop/desktop
- Should see 2-column layout for fields
- Modal width ~900px

Mobile:
- Open on phone/tablet
- Pinch to zoom around modal
- Should see 1-column layout
- Modal full width (95%)
- Buttons stacked vertically
```

---

## Expected Results

### ✅ Success Indicators:

- Modal opens smoothly (fade-in animation)
- All data displays correctly
- Layout looks professional
- Colors match design (purple/blue header)
- No console errors
- Buttons are clickable
- PDF download works

### ❌ Issues to Report:

- Modal doesn't open
- Data displays incorrectly
- Missing fields
- Layout broken
- Colors wrong
- Console errors
- Buttons don't work
- PDF doesn't download

---

## Console Testing

### Open Browser Console (F12):

```
Look for messages like:
✅ [viewEstimate] Loading estimate details for ID: 1
✅ [viewEstimate] Estimate data: {id: 1, ...}
✅ Modal displayed

No errors should appear!
```

### If Errors Occur:

```
Screenshot the error
Note the line number
Check network tab for API errors
Report to developer
```

---

## Network Testing

### Open Network Tab (F12 → Network):

```
1. Click "View" button
2. Watch network requests
3. Should see:
   GET /api/estimates/1  → Status 200
   (Shows estimate data in response)
```

### Expected Response:

```json
{
  "id": 1,
  "party_name": "Test Customer",
  "contractor_name": "Test Contractor",
  "mobile_number": "9876543210",
  "location": "Test Location",
  "date": "2026-01-29T00:00:00",
  "gross": 50000,
  "discount": 10,
  "advance": 5000,
  "final": 40000,
  "notes": "Test notes",
  "items": [
    {
      "id": 1,
      "description": "Item 1",
      "sft": 100,
      "rate": 500,
      "amount": 50000,
      "total": 50000
    }
  ]
}
```

---

## Performance Testing

### Load Time:

- Modal should open within 1-2 seconds
- Data should display instantly
- No loading spinners needed

### Responsiveness:

- Smooth scrolling in modal
- No lag when scrolling items
- Buttons respond immediately

---

## Accessibility Testing

### Keyboard Navigation:

- Tab through buttons
- Enter to activate buttons
- Esc to close modal (if implemented)

### Screen Readers:

- All text should be readable
- Table structure clear
- Button purposes obvious

---

## Browser Compatibility Testing

Test on these browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iPhone)
- [ ] Chrome Mobile (Android)

---

## Troubleshooting Common Issues

### "Modal doesn't appear"

```
1. Check browser console (F12)
2. Look for error messages
3. Verify JavaScript loaded
4. Try refreshing page
5. Clear browser cache
```

### "Data doesn't show"

```
1. Check Network tab for API response
2. Verify estimate exists in database
3. Check browser console for errors
4. Try with a different estimate
```

### "Layout looks wrong"

```
1. Clear browser cache (Ctrl+Shift+R)
2. Verify CSS file loaded
3. Try different browser
4. Check browser zoom (should be 100%)
```

### "PDF won't download"

```
1. Check if PDF was generated on backend
2. Verify /generated_pdfs directory exists
3. Check browser popup blocker
4. Try in different browser
```

---

## Final Validation

Before declaring feature complete:

- [ ] Modal opens correctly
- [ ] All data displays
- [ ] No console errors
- [ ] Buttons work
- [ ] Responsive design works
- [ ] PDF downloads work
- [ ] Can close modal
- [ ] No security issues (XSS safe)

---

## Success! ✅

If all tests pass, the View Estimate feature is working perfectly!

**Ready for:** Production Use  
**Test Duration:** ~15 minutes  
**Expected Outcome:** 100% feature complete

---

## Need Help?

1. Check console for errors (F12)
2. Look at Network requests
3. Review browser compatibility
4. Compare with screenshots
5. Report issues with details

---

**Last Updated:** January 29, 2026  
**Status:** Ready for Testing
