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
        class="description" 
        type="text" 
        placeholder="e.g., Master Bedroom - Wardrobe"
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

  let sft = parseFloat(row.querySelector(".sft")?.value || 0);
  let rate = parseFloat(row.querySelector(".rate")?.value || 0);

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

  // Handle NaN or invalid values
  sft = isNaN(sft) ? 0 : sft;
  rate = isNaN(rate) ? 0 : rate;

  // Calculate with precision handling (avoid floating point errors)
  const amount = Math.round(sft * rate * 100) / 100;

  const amountInput = row.querySelector(".amount");
  if (amountInput) {
    amountInput.value = amount.toFixed(2);
  }

  // Set total to amount (always update, don't wait for empty value)
  const totalInput = row.querySelector(".total");
  if (totalInput) {
    totalInput.value = amount.toFixed(2);
  }

  calculateTotals();
}

function calculateTotals() {
  let gross = 0;

  // Sum all amounts with precision handling
  document.querySelectorAll("#items tbody tr").forEach((row) => {
    const amount = parseFloat(row.querySelector(".amount")?.value || 0);
    gross += isNaN(amount) ? 0 : amount;
  });

  // Round to 2 decimal places to avoid floating point errors
  gross = Math.round(gross * 100) / 100;

  let discount = parseFloat(document.getElementById("discount")?.value || 0);
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
  const final = Math.round((gross - discountAmount - advance) * 100) / 100;

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
  if (grossEl) grossEl.innerText = formatCurrency(gross);
  if (finalEl) finalEl.innerText = formatCurrency(final);
}

function formatCurrency(amount) {
  // Handle edge cases
  if (typeof amount !== "number" || isNaN(amount)) {
    amount = 0;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

    const tbody = document.getElementById("estimatesList");
    if (!tbody) {
      console.error("[loadEstimates] estimatesList table body not found");
      return;
    }

    tbody.innerHTML = "";

    if (!estimates || estimates.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #666;">📋 No estimates found. Create your first estimate!</td></tr>';
      return;
    }

    estimates.forEach((est) => {
      const row = document.createElement("tr");
      // Sanitize data to prevent XSS
      const partyName = (est.party_name || "").replace(/[<>]/g, "");
      const contractorName = (est.contractor_name || "").replace(/[<>]/g, "");

      row.innerHTML = `
        <td>${est.id || "N/A"}</td>
        <td>${partyName}</td>
        <td>${contractorName}</td>
        <td>${formatDate(est.date)}</td>
        <td>${formatCurrency(est.gross || 0)}</td>
        <td>${formatCurrency(est.final || 0)}</td>
        <td>
          <button class="btn-small" onclick="viewEstimate(${est.id})">View</button>
          <button class="btn-small" onclick="editEstimate(${est.id})">Edit</button>
          <button class="btn-small" onclick="downloadPDF(${est.id})">PDF</button>
          <button class="btn-small" onclick="deleteEstimateRecord(${est.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    console.log(`[loadEstimates] Displayed ${estimates.length} estimates`);
  } catch (error) {
    console.error("[loadEstimates] Error:", error);
    const tbody = document.getElementById("estimatesList");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red; padding: 20px;">Error loading estimates: ${error.message}</td></tr>`;
    }
    alert(`Error loading estimates: ${error.message}`);
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
        row.querySelector(".description").value = item.description || "";
        row.querySelector(".size").value = item.size || "";
        row.querySelector(".sft").value =
          typeof item.sft === "number" ? item.sft : "";
        row.querySelector(".rate").value =
          typeof item.rate === "number" ? item.rate : "";

        const amountInput = row.querySelector(".amount");
        const totalInput = row.querySelector(".total");
        if (amountInput) {
          amountInput.value =
            typeof item.amount === "number" ? item.amount.toFixed(2) : "";
        }
        if (totalInput) {
          totalInput.value =
            typeof item.total === "number" ? item.total.toFixed(2) : "";
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
      estimate.items.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${sanitizeForDisplay(item.description) || "-"}</td>
          <td>${sanitizeForDisplay(item.size) || "-"}</td>
          <td class="text-right">${(item.sft || 0).toFixed(2)}</td>
          <td class="text-right">${formatCurrency(item.rate || 0)}</td>
          <td class="text-right">${formatCurrency(item.amount || 0)}</td>
          <td class="text-right">${formatCurrency(item.total || 0)}</td>
        `;
        modalItems.appendChild(row);
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
    const discountAmount = (grossTotal * discountPercent) / 100;
    const advanceAmount = estimate.advance || 0;
    const finalAmount = estimate.final || 0;

    document.getElementById("modal-gross").innerText =
      formatCurrency(grossTotal);
    document.getElementById("modal-discount").innerText =
      `${discountPercent.toFixed(2)}%`;
    document.getElementById("modal-discount-amount").innerText =
      formatCurrency(discountAmount);
    document.getElementById("modal-advance").innerText =
      formatCurrency(advanceAmount);
    document.getElementById("modal-final").innerText =
      formatCurrency(finalAmount);

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
  }
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
      window.open(pdfData.pdf_url, "_blank");
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

async function deleteEstimateRecord(estimateId) {
  if (!estimateId || estimateId <= 0) {
    alert("Invalid estimate ID");
    return;
  }

  if (
    confirm(
      `Are you sure you want to delete estimate #${estimateId}? This cannot be undone.`,
    )
  ) {
    try {
      console.log("[deleteEstimateRecord] Deleting estimate:", estimateId);
      await deleteEstimate(estimateId);
      alert("✅ Estimate deleted successfully");
      loadEstimates(); // Reload list
    } catch (error) {
      console.error("[deleteEstimateRecord] Error:", error);
      alert(`Error deleting estimate: ${error.message}`);
    }
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
