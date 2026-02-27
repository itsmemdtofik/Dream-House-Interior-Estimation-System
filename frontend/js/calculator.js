// ============== VALIDATION UTILITIES ==============

function validateFormField(fieldId, fieldName, maxLength = null) {
  const field = document.getElementById(fieldId);
  if (!field) {
    console.error(`Field ${fieldId} not found`);
    return null;
  }

  const value = field.value?.trim() || "";

  // Check if required field is empty
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Check max length
  if (maxLength && value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength} characters`,
    };
  }

  return { valid: true, value };
}

function validateMobileNumber(mobileNumber) {
  if (!mobileNumber) return { valid: true, value: null }; // Optional field

  // Allow: digits, spaces, dashes, plus sign, parentheses (typical phone formats)
  const cleanNumber = mobileNumber.replace(/[\s\-\(\)]/g, "");

  if (!/^\+?[0-9]{7,15}$/.test(cleanNumber)) {
    return {
      valid: false,
      error:
        "Invalid mobile number. Use 7-15 digits, can include spaces, dashes, or +",
    };
  }

  return { valid: true, value: mobileNumber };
}

function validateNumericField(fieldId, fieldName, allowNegative = false) {
  const field = document.getElementById(fieldId);
  if (!field) return { valid: false, error: `Field ${fieldId} not found` };

  const value = parseFloat(field.value || 0);

  if (isNaN(value)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (!allowNegative && value < 0) {
    return { valid: false, error: `${fieldName} cannot be negative` };
  }

  return { valid: true, value };
}

// ============== TABLE ROW OPERATIONS ==============

function addRow() {
  const tbody = document.querySelector("#items tbody");
  if (!tbody) {
    console.error("Table body not found");
    return;
  }

  const rowCount = tbody.children.length + 1;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="serial">${rowCount}</td>
    <td>
      <input 
        class="category" 
        type="text" 
        placeholder="e.g., Bedroom"
        maxlength="100"
      />
    </td>
    <td>
      <input 
        class="description" 
        type="text" 
        placeholder="e.g., Wardrobe"
        maxlength="500"
        required
      />
    </td>
    <td>
      <input 
        class="size" 
        type="text" 
        placeholder="e.g., 9'-0\" x 7'-0\""
        maxlength="100"
        oninput="calcRow(this)"
      />
    </td>
    <td>
      <input 
        class="sft" 
        type="number" 
        placeholder="0.0" 
        step="0.1"
        min="0"
        max="999999"
        oninput="calcRow(this)"
        required
      />
    </td>
    <td>
      <input 
        class="rate" 
        type="number" 
        placeholder="0" 
        step="1"
        min="0"
        max="999999"
        oninput="calcRow(this)"
        required
      />
    </td>
    <td>
      <input 
        class="cost_rate" 
        type="number" 
        placeholder="0" 
        step="1"
        min="0"
        max="999999"
        oninput="calcRow(this)"
      />
    </td>
    <td>
      <input 
        class="amount" 
        type="number" 
        placeholder="0" 
        step="0.01"
      />
    </td>
    <td>
      <input 
        class="total" 
        type="number" 
        placeholder="0" 
        step="0.01"
      />
    </td>
    <td>
      <input 
        class="profit" 
        type="number" 
        placeholder="0" 
        step="0.01"
        readonly
      />
    </td>
    <td>
      <button 
        type="button"
        class="btn-delete"
        onclick="removeRow(this)"
      >
        ❌
      </button>
    </td>
  `;

  tbody.appendChild(tr);
  renumberRows();
}

function removeRow(button) {
  button.closest("tr").remove();
  renumberRows();
  calculateTotals();
}

function renumberRows() {
  const tbody = document.querySelector("#items tbody");
  if (!tbody) return;
  tbody.querySelectorAll("tr").forEach((row, index) => {
    row.querySelector(".serial").innerText = index + 1;
  });
}

// ============== CALCULATIONS WITH PRECISION HANDLING ==============

function calcRow(el) {
  const row = el.closest("tr");
  if (!row) return;

  const sizeInput = row.querySelector(".size");
  let sft = parseFloat(row.querySelector(".sft")?.value || 0);
  let rate = parseFloat(row.querySelector(".rate")?.value || 0);
  let costRate = parseFloat(row.querySelector(".cost_rate")?.value || 0);

  // Validate: Reject negative values
  if (sft < 0) {
    alert("SFT cannot be negative");
    row.querySelector(".sft").value = "";
    return;
  }
  if (rate < 0) {
    alert("Rate cannot be negative");
    row.querySelector(".rate").value = "";
    return;
  }
  if (costRate < 0) {
    alert("Cost cannot be negative");
    row.querySelector(".cost_rate").value = "";
    return;
  }

  // Auto-calculate SFT from size if provided (e.g., 10'-0"x10'-0")
  if (sizeInput && sizeInput.value) {
    const parsed = parseSizeToSft(sizeInput.value);
    if (parsed > 0) {
      sft = parsed;
      const sftInput = row.querySelector(".sft");
      if (sftInput) sftInput.value = parsed.toFixed(2);
    }
  }

  // Handle NaN or invalid values
  sft = isNaN(sft) ? 0 : sft;
  rate = isNaN(rate) ? 0 : rate;
  costRate = isNaN(costRate) ? 0 : costRate;

  // Calculate with precision handling (avoid floating point errors)
  const amount = Math.round(sft * rate * 100) / 100;
  const costAmount = Math.round(sft * costRate * 100) / 100;
  const profit = Math.round((amount - costAmount) * 100) / 100;

  const amountInput = row.querySelector(".amount");
  if (amountInput) {
    amountInput.value = amount.toFixed(2);
  }

  // Set total to amount (always update, don't wait for empty value)
  const totalInput = row.querySelector(".total");
  if (totalInput) {
    totalInput.value = amount.toFixed(2);
  }

  const profitInput = row.querySelector(".profit");
  if (profitInput) {
    profitInput.value = profit.toFixed(2);
  }

  calculateTotals();
  scheduleDraftSave();
}

function parseSizeToSft(sizeStr) {
  if (!sizeStr || typeof sizeStr !== "string") return 0;
  const raw = sizeStr.toLowerCase().replace(/\s+/g, "");
  const parts = raw.split("x");
  if (parts.length !== 2) return 0;

  const parseFeetInches = (val) => {
    // Accept formats: 10'-0", 10'0", 10-0, 10.0
    const cleaned = val.replace(/″|”/g, '"');
    const match = cleaned.match(/(\d+)(?:'|ft)?-?(\d+)?(?:\"|in)?/);
    if (!match) return 0;
    const feet = parseFloat(match[1] || "0");
    const inches = parseFloat(match[2] || "0");
    return feet + inches / 12;
  };

  const width = parseFeetInches(parts[0]);
  const height = parseFeetInches(parts[1]);
  if (!width || !height) return 0;
  return Math.round(width * height * 100) / 100;
}

function calculateTotals() {
  let gross = 0;
  let costTotal = 0;

  // Sum all amounts with precision handling
  document.querySelectorAll("#items tbody tr").forEach((row) => {
    const amount = parseFloat(row.querySelector(".amount")?.value || 0);
    const sft = parseFloat(row.querySelector(".sft")?.value || 0);
    const costRate = parseFloat(row.querySelector(".cost_rate")?.value || 0);
    gross += isNaN(amount) ? 0 : amount;
    const costAmount = Math.round((sft * (isNaN(costRate) ? 0 : costRate)) * 100) / 100;
    costTotal += costAmount;
  });

  // Round to 2 decimal places to avoid floating point errors
  gross = Math.round(gross * 100) / 100;

  let discount = parseFloat(document.getElementById("discount")?.value || 0);
  let taxPercent = parseFloat(document.getElementById("tax_percent")?.value || 0);
  let advance = parseFloat(document.getElementById("advance")?.value || 0);

  // Validate and constrain discount (0-100%)
  if (discount < 0) {
    alert("⚠️ Discount cannot be negative. Reset to 0%.");
    document.getElementById("discount").value = "0";
    discount = 0;
  }
  if (discount > 100) {
    alert("⚠️ Discount cannot exceed 100%. Reset to 100%.");
    document.getElementById("discount").value = "100";
    discount = 100;
  }

  // Validate and constrain tax
  if (taxPercent < 0) {
    alert("⚠️ Tax cannot be negative. Reset to 0%.");
    document.getElementById("tax_percent").value = "0";
    taxPercent = 0;
  }
  if (taxPercent > 100) {
    alert("⚠️ Tax cannot exceed 100%. Reset to 100%.");
    document.getElementById("tax_percent").value = "100";
    taxPercent = 100;
  }

  // Validate and constrain advance
  if (advance < 0) {
    alert("⚠️ Advance payment cannot be negative. Reset to 0.");
    document.getElementById("advance").value = "0";
    advance = 0;
  }
  if (advance > gross) {
    alert(
      `⚠️ Advance (₹${advance.toFixed(2)}) exceeds gross (₹${gross.toFixed(2)}). Setting to gross.`,
    );
    document.getElementById("advance").value = gross.toFixed(2);
    advance = gross;
  }

  // Calculate with precision
  const discountAmount = Math.round(((gross * discount) / 100) * 100) / 100;
  const taxAmount = Math.round(((gross * taxPercent) / 100) * 100) / 100;
  const final =
    Math.round((gross - discountAmount - advance + taxAmount) * 100) / 100;
  const profit = Math.round((gross - costTotal) * 100) / 100;
  const marginPercent = gross > 0 ? (profit / gross) * 100 : 0;

  // Log warning for negative final amount
  if (final < 0) {
    console.warn(
      "⚠️ Final amount is negative. Review discount and advance payments.",
      { gross, discount, discountAmount, advance, final },
    );
  }

  // Update display elements
  const grossEl = document.getElementById("gross");
  const finalEl = document.getElementById("final");
  const profitEl = document.getElementById("profit");
  const marginEl = document.getElementById("margin_percent");
  if (grossEl) grossEl.innerText = formatCurrency(gross);
  if (finalEl) finalEl.innerText = formatCurrency(final);
  if (profitEl) profitEl.innerText = formatCurrency(profit);
  if (marginEl) marginEl.innerText = `${marginPercent.toFixed(2)}%`;
  scheduleDraftSave();
}

function getCurrencyCode() {
  return document.getElementById("currency")?.value || "INR";
}

function formatCurrency(amount) {
  // Handle edge cases
  if (typeof amount !== "number" || isNaN(amount)) {
    amount = 0;
  }

  const currency = getCurrencyCode();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatCurrencyWithCode(amount, currencyCode) {
  const currency = currencyCode || getCurrencyCode();
  if (typeof amount !== "number" || isNaN(amount)) {
    amount = 0;
  }
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateString) {
  try {
    if (!dateString) return "N/A";
    const normalized =
      typeof dateString === "string" &&
      (dateString.includes("T") || dateString.includes(" "))
        ? dateString
        : `${dateString}T00:00:00`;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

function parseDate(dateString) {
  if (!dateString) return null;
  const normalized =
    typeof dateString === "string" &&
    (dateString.includes("T") || dateString.includes(" "))
      ? dateString
      : `${dateString}T00:00:00`;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateForInput(dateString) {
  if (!dateString) return "";
  const normalized =
    typeof dateString === "string" &&
    (dateString.includes("T") || dateString.includes(" "))
      ? dateString
      : `${dateString}T00:00:00`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setEditMode(estimateId) {
  window.editingEstimateId = estimateId;
  const submitBtn = document.querySelector('button[onclick="submitEstimate()"]');
  if (submitBtn) {
    submitBtn.innerText = "Update Estimate";
  }
}

function exitEditMode() {
  window.editingEstimateId = null;
  const submitBtn = document.querySelector('button[onclick="submitEstimate()"]');
  if (submitBtn) {
    submitBtn.innerText = "💾 Save & Generate PDF";
  }
}

let allEstimates = [];
let currentSort = { key: "id", dir: "desc" };
let inlineEditId = null;

// ============== TAB MANAGEMENT ==============

function showTab(tabName) {
  try {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });

    // Deactivate all buttons
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (!selectedTab) {
      console.error(`Tab ${tabName} not found`);
      return;
    }
    selectedTab.classList.add("active");

    // Activate clicked button
    if (event && event.target) {
      event.target.classList.add("active");
    }

    // Load estimates when viewing
    if (tabName === "view") {
      setTimeout(() => loadEstimates(), 100);
    }
  } catch (error) {
    console.error("Error switching tab:", error);
  }
}

// ============== ESTIMATES MANAGEMENT ==============

async function loadEstimates(skip = 0, limit = 50) {
  try {
    console.log(
      `[loadEstimates] Loading estimates (skip=${skip}, limit=${limit})...`,
    );
    const estimates = await getAllEstimates(skip, limit);
    console.log("[loadEstimates] Estimates loaded:", estimates);
    allEstimates = Array.isArray(estimates) ? estimates : [];
    renderEstimates();
  } catch (error) {
    console.error("[loadEstimates] Error:", error);
    const tbody = document.getElementById("estimatesList");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red; padding: 20px;">Error loading estimates: ${error.message}</td></tr>`;
    }
    alert(`Error loading estimates: ${error.message}`);
  }
}

function getFilterState() {
  return {
    party: document.getElementById("filter_party")?.value?.trim() || "",
    contractor: document
      .getElementById("filter_contractor")
      ?.value?.trim() || "",
    from: document.getElementById("filter_from")?.value || "",
    to: document.getElementById("filter_to")?.value || "",
  };
}

function applyFilters(estimates) {
  const { party, contractor, from, to } = getFilterState();
  const fromDate = from ? parseDate(from) : null;
  const toDate = to ? parseDate(to) : null;

  return estimates.filter((est) => {
    const partyName = (est.party_name || "").toLowerCase();
    const contractorName = (est.contractor_name || "").toLowerCase();
    const matchesParty = party
      ? partyName.includes(party.toLowerCase())
      : true;
    const matchesContractor = contractor
      ? contractorName.includes(contractor.toLowerCase())
      : true;

    const estDate = parseDate(est.date);
    const matchesFrom = fromDate ? estDate && estDate >= fromDate : true;
    const matchesTo = toDate ? estDate && estDate <= toDate : true;

    return matchesParty && matchesContractor && matchesFrom && matchesTo;
  });
}

function sortEstimates(estimates) {
  const { key, dir } = currentSort;
  const factor = dir === "asc" ? 1 : -1;
  const sorted = [...estimates];

  sorted.sort((a, b) => {
    let av = a?.[key];
    let bv = b?.[key];

    if (key === "date") {
      av = parseDate(av);
      bv = parseDate(bv);
      if (!av && !bv) return 0;
      if (!av) return 1 * factor;
      if (!bv) return -1 * factor;
      return av > bv ? 1 * factor : av < bv ? -1 * factor : 0;
    }

    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();

    if (av === undefined || av === null) return 1 * factor;
    if (bv === undefined || bv === null) return -1 * factor;
    if (av > bv) return 1 * factor;
    if (av < bv) return -1 * factor;
    return 0;
  });

  return sorted;
}

function renderEstimates() {
  const tbody = document.getElementById("estimatesList");
  if (!tbody) {
    console.error("[renderEstimates] estimatesList table body not found");
    return;
  }

  tbody.innerHTML = "";

  let filtered = applyFilters(allEstimates);
  filtered = sortEstimates(filtered);

  if (!filtered || filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #666;">📋 No estimates found. Create your first estimate!</td></tr>';
    return;
  }

  filtered.forEach((est) => {
    const row = document.createElement("tr");
    // Sanitize data to prevent XSS
    const partyName = (est.party_name || "").replace(/[<>]/g, "");
    const contractorName = (est.contractor_name || "").replace(/[<>]/g, "");

    if (inlineEditId === est.id) {
      row.classList.add("inline-edit");
      row.innerHTML = `
        <td>${est.id || "N/A"}</td>
        <td><input id="inline-party-${est.id}" value="${partyName}" /></td>
        <td><input id="inline-contractor-${est.id}" value="${contractorName}" /></td>
        <td><input id="inline-date-${est.id}" type="date" value="${formatDateForInput(est.date)}" /></td>
        <td>${formatCurrencyWithCode(est.gross || 0, est.currency_code)}</td>
        <td>${formatCurrencyWithCode(est.final || 0, est.currency_code)}</td>
        <td>
          <button class="btn-small" onclick="saveInlineEdit(${est.id})">Save</button>
          <button class="btn-small" onclick="cancelInlineEdit()">Cancel</button>
        </td>
      `;
    } else {
      const hasPendingDelete =
        window.pendingDeleteTimers &&
        window.pendingDeleteTimers[est.id];
      row.innerHTML = `
        <td>${est.id || "N/A"}</td>
        <td>${partyName}</td>
        <td>${contractorName}</td>
        <td>${formatDate(est.date)}</td>
        <td>${formatCurrencyWithCode(est.gross || 0, est.currency_code)}</td>
        <td>${formatCurrencyWithCode(est.final || 0, est.currency_code)}</td>
        <td>
          <button class="btn-small" onclick="viewEstimate(${est.id})">View</button>
          <button class="btn-small" onclick="editEstimate(${est.id})">Edit</button>
          <button class="btn-small" onclick="startInlineEdit(${est.id})">Quick Edit</button>
          <button class="btn-small" onclick="duplicateEstimateRecord(${est.id})">Duplicate</button>
          <button class="btn-small" onclick="downloadPDF(${est.id})">PDF</button>
          ${
            hasPendingDelete
              ? `<button class="btn-small" onclick="undoDelete(${est.id})">Undo</button>`
              : `<button class="btn-small" onclick="deleteEstimateRecord(${est.id})">Delete</button>`
          }
        </td>
      `;
    }
    tbody.appendChild(row);
  });
}

function clearFilters() {
  const party = document.getElementById("filter_party");
  const contractor = document.getElementById("filter_contractor");
  const from = document.getElementById("filter_from");
  const to = document.getElementById("filter_to");
  if (party) party.value = "";
  if (contractor) contractor.value = "";
  if (from) from.value = "";
  if (to) to.value = "";
  renderEstimates();
}

function setSort(key) {
  if (currentSort.key === key) {
    currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
  } else {
    currentSort.key = key;
    currentSort.dir = "asc";
  }
  updateSortIndicators();
  renderEstimates();
}

function updateSortIndicators() {
  document.querySelectorAll("#estimatesTable th[data-sort]").forEach((th) => {
    const key = th.getAttribute("data-sort");
    th.classList.toggle("sort-active", key === currentSort.key);
  });
}

function startInlineEdit(estimateId) {
  inlineEditId = estimateId;
  renderEstimates();
}

function cancelInlineEdit() {
  inlineEditId = null;
  renderEstimates();
}

async function saveInlineEdit(estimateId) {
  try {
    const partyName = document.getElementById(`inline-party-${estimateId}`)?.value || "";
    const contractorName = document.getElementById(`inline-contractor-${estimateId}`)?.value || "";
    const dateValue = document.getElementById(`inline-date-${estimateId}`)?.value || "";

    const payload = {
      party_name: partyName.trim(),
      contractor_name: contractorName.trim(),
      date: dateValue || null,
    };

    await updateEstimate(estimateId, payload);
    inlineEditId = null;
    loadEstimates();
  } catch (error) {
    console.error("[saveInlineEdit] Error:", error);
    alert(`Error updating estimate: ${error.message}`);
  }
}

async function duplicateEstimateRecord(estimateId) {
  try {
    if (!estimateId || estimateId <= 0) {
      alert("Invalid estimate ID");
      return;
    }
    const result = await duplicateEstimate(estimateId);
    alert(`Estimate duplicated successfully! New ID: ${result.id}`);
    loadEstimates();
  } catch (error) {
    console.error("[duplicateEstimateRecord] Error:", error);
    alert(`Error duplicating estimate: ${error.message}`);
  }
}

async function viewEstimate(estimateId) {
  try {
    if (!estimateId || estimateId <= 0) {
      alert("❌ Invalid estimate ID");
      return;
    }

    console.log("[viewEstimate] Loading estimate details for ID:", estimateId);

    // Fetch estimate details from API
    const estimate = await getEstimate(estimateId);
    console.log("[viewEstimate] Estimate data:", estimate);

    if (!estimate) {
      alert("❌ Estimate not found");
      return;
    }

    // Populate modal with estimate data
    displayEstimateInModal(estimate);

    // Show modal
    document.getElementById("viewModal").style.display = "block";
    console.log("✅ Modal displayed");
  } catch (error) {
    console.error("[viewEstimate] Error:", error);
    alert(`❌ Error loading estimate: ${error.message}`);
  }
}

async function editEstimate(estimateId) {
  try {
    if (!estimateId || estimateId <= 0) {
      alert("❌ Invalid estimate ID");
      return;
    }

    console.log("[editEstimate] Loading estimate for edit:", estimateId);
    const estimate = await getEstimate(estimateId);
    if (!estimate) {
      alert("❌ Estimate not found");
      return;
    }

    // Switch to create tab and populate form
    showTab("create");
    populateFormForEdit(estimate);
    setEditMode(estimateId);
  } catch (error) {
    console.error("[editEstimate] Error:", error);
    alert(`❌ Error loading estimate: ${error.message}`);
  }
}

function populateFormForEdit(estimate) {
  // Header fields
  document.getElementById("party_name").value = estimate.party_name || "";
  document.getElementById("contractor_name").value =
    estimate.contractor_name || "";
  document.getElementById("mobile_number").value =
    estimate.mobile_number || "";
  document.getElementById("location").value = estimate.location || "";
  document.getElementById("date").value = formatDateForInput(estimate.date);
  document.getElementById("discount").value = estimate.discount || 0;
  document.getElementById("advance").value = estimate.advance || 0;
  document.getElementById("notes").value = estimate.notes || "";

  // Line items
  const tbody = document.querySelector("#items tbody");
  if (tbody) {
    tbody.innerHTML = "";
    if (Array.isArray(estimate.items) && estimate.items.length > 0) {
      estimate.items.forEach((item) => {
        addRow();
        const row = tbody.lastElementChild;
        if (!row) return;
        row.querySelector(".category").value = item.category || "";
        row.querySelector(".description").value = item.description || "";
        row.querySelector(".size").value = item.size || "";
        row.querySelector(".sft").value =
          typeof item.sft === "number" ? item.sft : "";
        row.querySelector(".rate").value =
          typeof item.rate === "number" ? item.rate : "";
        row.querySelector(".cost_rate").value =
          typeof item.cost_rate === "number" ? item.cost_rate : "";

        const amountInput = row.querySelector(".amount");
        const totalInput = row.querySelector(".total");
        const profitInput = row.querySelector(".profit");
        if (amountInput) {
          amountInput.value =
            typeof item.amount === "number" ? item.amount.toFixed(2) : "";
        }
        if (totalInput) {
          totalInput.value =
            typeof item.total === "number" ? item.total.toFixed(2) : "";
        }
        if (profitInput) {
          profitInput.value =
            typeof item.profit === "number" ? item.profit.toFixed(2) : "";
        }
      });
    } else {
      addRow();
    }
  }

  calculateTotals();
}

function displayEstimateInModal(estimate) {
  try {
    // Header
    document.getElementById("modalTitle").innerText =
      `Estimate #${estimate.id} - ${estimate.party_name}`;

    // Project Information
    document.getElementById("modal-id").innerText = `#${estimate.id}`;
    document.getElementById("modal-date").innerText = formatDate(estimate.date);
    document.getElementById("modal-party").innerText =
      sanitizeForDisplay(estimate.party_name) || "N/A";
    document.getElementById("modal-mobile").innerText =
      estimate.mobile_number || "Not provided";
    document.getElementById("modal-contractor").innerText =
      sanitizeForDisplay(estimate.contractor_name) || "N/A";
    document.getElementById("modal-location").innerText =
      sanitizeForDisplay(estimate.location) || "N/A";

    // Line Items
    const modalItems = document.getElementById("modalItems");
    modalItems.innerHTML = "";

    if (estimate.items && estimate.items.length > 0) {
      const grouped = {};
      estimate.items.forEach((item) => {
        const category = item.category || "Uncategorized";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
      });

      Object.keys(grouped).forEach((category) => {
        let subtotal = 0;
        grouped[category].forEach((item, index) => {
          const row = document.createElement("tr");
          subtotal += item.total || 0;
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${sanitizeForDisplay(category)}</td>
            <td>${sanitizeForDisplay(item.description) || "-"}</td>
            <td>${sanitizeForDisplay(item.size) || "-"}</td>
            <td class="text-right">${(item.sft || 0).toFixed(2)}</td>
            <td class="text-right">${formatCurrencyWithCode(item.rate || 0, estimate.currency_code)}</td>
            <td class="text-right">${formatCurrencyWithCode(item.cost_rate || 0, estimate.currency_code)}</td>
            <td class="text-right">${formatCurrencyWithCode(item.amount || 0, estimate.currency_code)}</td>
            <td class="text-right">${formatCurrencyWithCode(item.profit || 0, estimate.currency_code)}</td>
            <td class="text-right">${formatCurrencyWithCode(item.total || 0, estimate.currency_code)}</td>
          `;
          modalItems.appendChild(row);
        });

        const subtotalRow = document.createElement("tr");
        subtotalRow.innerHTML = `
          <td></td>
          <td>${sanitizeForDisplay(category)}</td>
          <td><strong>Subtotal</strong></td>
          <td colspan="6"></td>
          <td class="text-right"><strong>${formatCurrencyWithCode(subtotal, estimate.currency_code)}</strong></td>
        `;
        modalItems.appendChild(subtotalRow);
      });
    } else {
      const row = document.createElement("tr");
      row.innerHTML =
        '<td colspan="7" style="text-align: center; color: #999;">No items found</td>';
      modalItems.appendChild(row);
    }

    // Financial Summary
    const grossTotal = estimate.gross || 0;
    const discountPercent = estimate.discount || 0;
    const taxPercent = estimate.tax_percent || 0;
    const discountAmount = (grossTotal * discountPercent) / 100;
    const taxAmount = (grossTotal * taxPercent) / 100;
    const advanceAmount = estimate.advance || 0;
    const finalAmount = estimate.final || 0;
    const profitAmount = estimate.profit || 0;
    const marginPercent =
      grossTotal > 0 ? (profitAmount / grossTotal) * 100 : 0;

    const currencyCode = estimate.currency_code || getCurrencyCode();
    document.getElementById("modal-gross").innerText =
      formatCurrencyWithCode(grossTotal, currencyCode);
    document.getElementById("modal-discount").innerText =
      `${discountPercent.toFixed(2)}%`;
    const modalTax = document.getElementById("modal-tax");
    if (modalTax) modalTax.innerText = `${taxPercent.toFixed(2)}%`;
    document.getElementById("modal-discount-amount").innerText =
      formatCurrency(discountAmount);
    const modalTaxAmount = document.getElementById("modal-tax-amount");
    if (modalTaxAmount)
      modalTaxAmount.innerText = formatCurrencyWithCode(taxAmount, currencyCode);
    document.getElementById("modal-advance").innerText =
      formatCurrencyWithCode(advanceAmount, currencyCode);
    const modalProfit = document.getElementById("modal-profit");
    if (modalProfit)
      modalProfit.innerText = formatCurrencyWithCode(profitAmount, currencyCode);
    const modalMargin = document.getElementById("modal-margin");
    if (modalMargin) modalMargin.innerText = `${marginPercent.toFixed(2)}%`;
    document.getElementById("modal-final").innerText =
      formatCurrencyWithCode(finalAmount, currencyCode);

    // Notes
    const notes = estimate.notes || "-";
    document.getElementById("modal-notes").innerText = notes;

    // Store current estimate ID for PDF download
    window.currentEstimateId = estimate.id;

    console.log("✅ Modal populated with data");
  } catch (error) {
    console.error("[displayEstimateInModal] Error:", error);
    alert("❌ Error displaying estimate details");
  }
}

function sanitizeForDisplay(text) {
  if (!text) return "";
  // Remove HTML tags to prevent XSS
  return String(text).replace(/[<>]/g, "");
}

function closeViewModal() {
  const modal = document.getElementById("viewModal");
  if (modal) {
    modal.style.display = "none";
    console.log("✅ Modal closed");
  }
}

function downloadPDFFromModal() {
  if (window.currentEstimateId) {
    downloadPDF(window.currentEstimateId);
  } else {
    alert("❌ No estimate selected");
  }
}

async function sharePDFFromModal() {
  if (!window.currentEstimateId) {
    alert("❌ No estimate selected");
    return;
  }

  try {
    const pdfData = await getEstimatePDF(window.currentEstimateId);
    if (!pdfData?.pdf_url) {
      alert("PDF URL not available. The PDF may not have been generated yet.");
      return;
    }
    const separator = pdfData.pdf_url.includes("?") ? "&" : "?";
    const shareUrl = `${pdfData.pdf_url}${separator}v=${Date.now()}`;

    if (navigator.share) {
      await navigator.share({
        title: `Estimate #${window.currentEstimateId}`,
        text: "Estimate PDF",
        url: shareUrl,
      });
    } else {
      const mailto = `mailto:?subject=Estimate%20%23${window.currentEstimateId}&body=${encodeURIComponent(shareUrl)}`;
      window.location.href = mailto;
    }
  } catch (error) {
    console.error("[sharePDFFromModal] Error:", error);
    alert(`Error sharing PDF: ${error.message}`);
  }
}

function exportItemsCSVFromModal() {
  if (!window.currentEstimateId) {
    alert("❌ No estimate selected");
    return;
  }
  window.open(
    `${API_URL}/estimates/${window.currentEstimateId}/items.csv`,
    "_blank",
  );
}

// Close modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById("viewModal");
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("estimateForm");
  if (form) {
    form.addEventListener("reset", () => {
      setTimeout(() => exitEditMode(), 0);
    });
    form.addEventListener("input", () => scheduleDraftSave());
    form.addEventListener("change", () => scheduleDraftSave());
  }

  ["filter_party", "filter_contractor", "filter_from", "filter_to"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => renderEstimates());
        el.addEventListener("change", () => renderEstimates());
      }
    },
  );

  document.querySelectorAll("#estimatesTable th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (key) setSort(key);
    });
  });
  updateSortIndicators();
  const currencySelect = document.getElementById("currency");
  if (currencySelect) {
    currencySelect.addEventListener("change", () => calculateTotals());
  }
  loadTemplates();
});

async function downloadPDF(estimateId) {
  try {
    if (!estimateId || estimateId <= 0) {
      alert("Invalid estimate ID");
      return;
    }

    console.log("[downloadPDF] Downloading PDF for estimate:", estimateId);
    const pdfData = await getEstimatePDF(estimateId);
    console.log("[downloadPDF] PDF data:", pdfData);

    if (!pdfData) {
      alert("No PDF data returned from server");
      return;
    }

    if (pdfData.pdf_url) {
      // Validate URL to prevent XSS (only allow relative or https URLs)
      if (!/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(pdfData.pdf_url)) {
        alert("Invalid PDF URL received from server");
        console.error("Suspicious PDF URL:", pdfData.pdf_url);
        return;
      }
      const separator = pdfData.pdf_url.includes("?") ? "&" : "?";
      const cacheBustedUrl = `${pdfData.pdf_url}${separator}v=${Date.now()}`;
      window.open(cacheBustedUrl, "_blank");
      console.log("✅ PDF download initiated");
    } else {
      alert("PDF URL not available. The PDF may not have been generated yet.");
      console.warn("[downloadPDF] PDF URL missing in response:", pdfData);
    }
  } catch (error) {
    console.error("[downloadPDF] Error:", error);
    alert(`Error downloading PDF: ${error.message}`);
  }
}

// ============== DRAFT AUTOSAVE ==============

let draftSaveTimer = null;

function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(saveDraft, 400);
}

function collectDraft() {
  const items = [];
  document.querySelectorAll("#items tbody tr").forEach((row, index) => {
    items.push({
      serial_number: index + 1,
      category: row.querySelector(".category")?.value || "",
      description: row.querySelector(".description")?.value || "",
      size: row.querySelector(".size")?.value || "",
      sft: row.querySelector(".sft")?.value || "",
      rate: row.querySelector(".rate")?.value || "",
      cost_rate: row.querySelector(".cost_rate")?.value || "",
      amount: row.querySelector(".amount")?.value || "",
      total: row.querySelector(".total")?.value || "",
      profit: row.querySelector(".profit")?.value || "",
    });
  });

  return {
    party_name: document.getElementById("party_name")?.value || "",
    contractor_name: document.getElementById("contractor_name")?.value || "",
    mobile_number: document.getElementById("mobile_number")?.value || "",
    location: document.getElementById("location")?.value || "",
    date: document.getElementById("date")?.value || "",
    discount: document.getElementById("discount")?.value || "0",
    tax_percent: document.getElementById("tax_percent")?.value || "0",
    advance: document.getElementById("advance")?.value || "0",
    currency_code: document.getElementById("currency")?.value || "INR",
    exchange_rate: document.getElementById("exchange_rate")?.value || "1.0",
    notes: document.getElementById("notes")?.value || "",
    items,
    saved_at: new Date().toISOString(),
  };
}

function saveDraft() {
  try {
    const draft = collectDraft();
    localStorage.setItem("estimateDraft", JSON.stringify(draft));
  } catch (error) {
    console.warn("[saveDraft] Failed:", error);
  }
}

function clearDraft() {
  localStorage.removeItem("estimateDraft");
}

function initDraft() {
  try {
    const raw = localStorage.getItem("estimateDraft");
    if (!raw) return false;
    const draft = JSON.parse(raw);
    if (!draft) return false;

    document.getElementById("party_name").value = draft.party_name || "";
    document.getElementById("contractor_name").value =
      draft.contractor_name || "";
    document.getElementById("mobile_number").value =
      draft.mobile_number || "";
    document.getElementById("location").value = draft.location || "";
    document.getElementById("date").value = draft.date || "";
    document.getElementById("discount").value = draft.discount || "0";
    document.getElementById("tax_percent").value = draft.tax_percent || "0";
    document.getElementById("advance").value = draft.advance || "0";
    document.getElementById("currency").value = draft.currency_code || "INR";
    document.getElementById("exchange_rate").value =
      draft.exchange_rate || "1.0";
    document.getElementById("notes").value = draft.notes || "";

    const tbody = document.querySelector("#items tbody");
    if (tbody) {
      tbody.innerHTML = "";
      if (Array.isArray(draft.items) && draft.items.length > 0) {
        draft.items.forEach((item) => {
          addRow();
          const row = tbody.lastElementChild;
          if (!row) return;
          row.querySelector(".category").value = item.category || "";
          row.querySelector(".description").value = item.description || "";
          row.querySelector(".size").value = item.size || "";
          row.querySelector(".sft").value = item.sft || "";
          row.querySelector(".rate").value = item.rate || "";
          row.querySelector(".cost_rate").value = item.cost_rate || "";
          row.querySelector(".amount").value = item.amount || "";
          row.querySelector(".total").value = item.total || "";
          row.querySelector(".profit").value = item.profit || "";
        });
      } else {
        addRow();
      }
    }

    calculateTotals();
    return true;
  } catch (error) {
    console.warn("[initDraft] Failed:", error);
    return false;
  }
}

// ============== TEMPLATE LIBRARY ==============

let templatesCache = [];

async function loadTemplates() {
  try {
    const templates = await listTemplates();
    templatesCache = Array.isArray(templates) ? templates : [];
    const select = document.getElementById("template_select");
    if (!select) return;
    select.innerHTML = '<option value="">Select a template</option>';
    if (templatesCache.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No templates yet";
      select.appendChild(opt);
      return;
    }
    templatesCache.forEach((tpl) => {
      const opt = document.createElement("option");
      opt.value = tpl.id;
      opt.textContent = tpl.name;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error("[loadTemplates] Error:", error);
  }
}

async function saveTemplate() {
  try {
    const name = document.getElementById("template_name")?.value?.trim();
    const description =
      document.getElementById("template_desc")?.value?.trim() || "";
    if (!name) {
      alert("Template name is required");
      return;
    }

    const data = collectDraft();
    const result = await createTemplate({ name, description, data });
    alert(`Template saved: ${result.name}`);
    await loadTemplates();
  } catch (error) {
    console.error("[saveTemplate] Error:", error);
    alert(`Error saving template: ${error.message}`);
  }
}

function applyTemplate() {
  const select = document.getElementById("template_select");
  if (!select || !select.value) {
    alert("Please select a template");
    return;
  }
  const tpl = templatesCache.find((t) => String(t.id) === String(select.value));
  if (!tpl) {
    alert("Template not found");
    return;
  }
  const data = tpl.data || {};
  try {
    document.getElementById("party_name").value = data.party_name || "";
    document.getElementById("contractor_name").value =
      data.contractor_name || "";
    document.getElementById("mobile_number").value =
      data.mobile_number || "";
    document.getElementById("location").value = data.location || "";
    document.getElementById("date").value = data.date || "";
    document.getElementById("discount").value = data.discount || "0";
    document.getElementById("tax_percent").value = data.tax_percent || "0";
    document.getElementById("advance").value = data.advance || "0";
    document.getElementById("currency").value = data.currency_code || "INR";
    document.getElementById("exchange_rate").value =
      data.exchange_rate || "1.0";
    document.getElementById("notes").value = data.notes || "";

    const tbody = document.querySelector("#items tbody");
    if (tbody) {
      tbody.innerHTML = "";
      if (Array.isArray(data.items) && data.items.length > 0) {
        data.items.forEach((item) => {
          addRow();
          const row = tbody.lastElementChild;
          if (!row) return;
          row.querySelector(".category").value = item.category || "";
          row.querySelector(".description").value = item.description || "";
          row.querySelector(".size").value = item.size || "";
          row.querySelector(".sft").value = item.sft || "";
          row.querySelector(".rate").value = item.rate || "";
          row.querySelector(".cost_rate").value = item.cost_rate || "";
          row.querySelector(".amount").value = item.amount || "";
          row.querySelector(".total").value = item.total || "";
          row.querySelector(".profit").value = item.profit || "";
        });
      } else {
        addRow();
      }
    }

    calculateTotals();
  } catch (error) {
    console.error("[applyTemplate] Error:", error);
    alert("Error applying template");
  }
}

function exportEstimatesCSV() {
  window.open(`${API_URL}/estimates/export.csv`, "_blank");
}

async function deleteEstimateRecord(estimateId) {
  if (!estimateId || estimateId <= 0) {
    alert("Invalid estimate ID");
    return;
  }

  if (!confirm(`Delete estimate #${estimateId}? You can undo within 8 seconds.`)) {
    return;
  }

  // Delay actual delete to allow undo.
  if (!window.pendingDeleteTimers) {
    window.pendingDeleteTimers = {};
  }

  if (window.pendingDeleteTimers[estimateId]) {
    clearTimeout(window.pendingDeleteTimers[estimateId]);
  }

  alert(`Estimate #${estimateId} will be deleted in 8 seconds. Click OK, then press Undo in the list.`);
  window.pendingDeleteTimers[estimateId] = setTimeout(async () => {
    try {
      console.log("[deleteEstimateRecord] Deleting estimate:", estimateId);
      await deleteEstimate(estimateId);
      alert("✅ Estimate deleted successfully");
      loadEstimates(); // Reload list
    } catch (error) {
      console.error("[deleteEstimateRecord] Error:", error);
      alert(`Error deleting estimate: ${error.message}`);
    } finally {
      delete window.pendingDeleteTimers[estimateId];
    }
  }, 8000);

  renderEstimates();
}

function undoDelete(estimateId) {
  if (window.pendingDeleteTimers && window.pendingDeleteTimers[estimateId]) {
    clearTimeout(window.pendingDeleteTimers[estimateId]);
    delete window.pendingDeleteTimers[estimateId];
    alert(`Delete cancelled for estimate #${estimateId}`);
    renderEstimates();
  }
}

// ============== INITIALIZATION ==============

// Set today's date as default when page loads
window.addEventListener("load", () => {
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
  }

  // Add initial empty row
  const tbody = document.querySelector("#items tbody");
  if (tbody && tbody.children.length === 0) {
    addRow();
  }

  calculateTotals();
});
