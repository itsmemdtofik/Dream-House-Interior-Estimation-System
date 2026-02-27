const API_URL = "http://localhost:8000/api";

// ============== VALIDATION UTILITIES ==============

function isValidURL(url) {
  // Only allow relative or https URLs to prevent XSS
  if (typeof url !== "string") return false;
  return /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(url);
}

function sanitizeString(str) {
  if (typeof str !== "string") return "";
  // Remove HTML tags and scripts
  return str.replace(/[<>]/g, "");
}

function validateEstimateId(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    throw new Error("Invalid estimate ID");
  }
  return numId;
}

function extractApiErrorMessage(errorPayload, statusCode = null, fallbackText = "") {
  const fallbackMessage =
    fallbackText?.toString().trim() ||
    (statusCode ? `HTTP error! status: ${statusCode}` : "Request failed");

  if (!errorPayload) return fallbackMessage;

  if (typeof errorPayload === "string") {
    const trimmed = errorPayload.trim();
    return trimmed || fallbackMessage;
  }

  if (Array.isArray(errorPayload)) {
    const parts = errorPayload
      .map((item) => extractApiErrorMessage(item, null, ""))
      .filter(Boolean);
    return parts.length > 0 ? parts.join("; ") : fallbackMessage;
  }

  if (typeof errorPayload === "object") {
    if (typeof errorPayload.detail === "string") {
      return errorPayload.detail.trim() || fallbackMessage;
    }
    if (errorPayload.detail !== undefined) {
      return extractApiErrorMessage(errorPayload.detail, null, fallbackMessage);
    }
    if (typeof errorPayload.message === "string") {
      return errorPayload.message.trim() || fallbackMessage;
    }
    if (typeof errorPayload.msg === "string") {
      return errorPayload.msg.trim() || fallbackMessage;
    }
    if (typeof errorPayload.error === "string") {
      return errorPayload.error.trim() || fallbackMessage;
    }

    try {
      const asJson = JSON.stringify(errorPayload);
      return asJson && asJson !== "{}" ? asJson : fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }

  return fallbackMessage;
}

function extractErrorMessageFromUnknown(error, fallbackText = "Request failed") {
  if (!error) return fallbackText;

  if (error instanceof Error) {
    const rawMessage = error.message;
    if (typeof rawMessage === "string") {
      const trimmed = rawMessage.trim();
      if (!trimmed) return fallbackText;

      // Some code paths can stringify plain objects into Error messages.
      if (trimmed === "[object Object]") {
        return fallbackText;
      }

      try {
        const parsed = JSON.parse(trimmed);
        return extractApiErrorMessage(parsed, null, trimmed);
      } catch {
        return trimmed;
      }
    }

    return extractApiErrorMessage(rawMessage, null, fallbackText);
  }

  return extractApiErrorMessage(error, null, fallbackText);
}

// ============== ESTIMATE API CALLS ==============

async function createEstimate(estimateData) {
  try {
    console.log("[createEstimate] Sending request with data:", estimateData);
    // Normalize date if it is provided as YYYY-MM-DD
    if (typeof estimateData.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(estimateData.date)) {
      estimateData.date = `${estimateData.date}T00:00:00`;
    }

    // Validate required fields
    if (!estimateData.party_name?.trim()) {
      throw new Error("Party name is required");
    }
    if (!estimateData.contractor_name?.trim()) {
      throw new Error("Contractor name is required");
    }
    if (!estimateData.location?.trim()) {
      throw new Error("Location is required");
    }
    if (!estimateData.date) {
      throw new Error("Date is required");
    }
    if (!Array.isArray(estimateData.items) || estimateData.items.length === 0) {
      throw new Error("At least one item is required");
    }

    // Validate numeric values
    if (
      typeof estimateData.discount !== "number" ||
      estimateData.discount < 0 ||
      estimateData.discount > 100
    ) {
      throw new Error("Discount must be between 0 and 100");
    }
    if (
      typeof estimateData.tax_percent !== "number" ||
      estimateData.tax_percent < 0 ||
      estimateData.tax_percent > 100
    ) {
      throw new Error("Tax must be between 0 and 100");
    }
    if (typeof estimateData.advance !== "number" || estimateData.advance < 0) {
      throw new Error("Advance cannot be negative");
    }
    if (
      typeof estimateData.exchange_rate !== "number" ||
      estimateData.exchange_rate <= 0
    ) {
      throw new Error("Exchange rate must be positive");
    }

    // Validate field lengths
    if (estimateData.party_name.length > 200) {
      throw new Error("Party name exceeds 200 characters");
    }
    if (estimateData.contractor_name.length > 200) {
      throw new Error("Contractor name exceeds 200 characters");
    }
    if (estimateData.location.length > 500) {
      throw new Error("Location exceeds 500 characters");
    }

    // Validate mobile number if provided
    if (estimateData.mobile_number) {
      const cleanMobile = estimateData.mobile_number.replace(/[\s\-\(\)]/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(cleanMobile)) {
        throw new Error(
          "Invalid mobile number format. Use 7-15 digits, can include spaces, dashes, or +",
        );
      }
    }

    // Validate each item
    estimateData.items.forEach((item, idx) => {
      if (!item.description?.trim()) {
        throw new Error(`Item ${idx + 1}: Description is required`);
      }
      if (typeof item.sft !== "number" || item.sft < 0) {
        throw new Error(`Item ${idx + 1}: SFT must be a positive number`);
      }
      if (typeof item.rate !== "number" || item.rate < 0) {
        throw new Error(`Item ${idx + 1}: Rate must be a positive number`);
      }
      if (item.cost_rate !== undefined && item.cost_rate < 0) {
        throw new Error(`Item ${idx + 1}: Cost must be a positive number`);
      }
      if (item.description.length > 500) {
        throw new Error(`Item ${idx + 1}: Description exceeds 500 characters`);
      }
    });

    const response = await fetch(`${API_URL}/estimates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estimateData),
      timeout: 30000, // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.clone().json().catch(() => null);
      const errorText = errorData
        ? ""
        : await response.text().catch(() => "");
      const errorMessage = extractApiErrorMessage(
        errorData,
        response.status,
        errorText,
      );
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("[createEstimate] Success:", result);
    return result;
  } catch (error) {
    console.error("[createEstimate] Error:", error);
    throw error;
  }
}

async function getEstimate(estimateId) {
  try {
    const id = validateEstimateId(estimateId);
    console.log("[getEstimate] Fetching estimate:", id);

    const response = await fetch(`${API_URL}/estimates/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Estimate #${id} not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("[getEstimate] Success:", result);
    return result;
  } catch (error) {
    console.error("[getEstimate] Error:", error);
    throw error;
  }
}

async function getAllEstimates(skip = 0, limit = 50) {
  try {
    // Validate pagination parameters
    skip = Math.max(0, Math.floor(skip || 0));
    limit = Math.min(Math.max(1, Math.floor(limit || 50)), 500); // Clamp: 1-500

    console.log("[getAllEstimates] Fetching with skip:", skip, "limit:", limit);

    const response = await fetch(
      `${API_URL}/estimates?skip=${skip}&limit=${limit}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Validate response is an array
    if (!Array.isArray(result)) {
      console.warn("[getAllEstimates] Response is not an array:", result);
      return [];
    }

    console.log(`[getAllEstimates] Retrieved ${result.length} estimates`);
    return result;
  } catch (error) {
    console.error("[getAllEstimates] Error:", error);
    throw error;
  }
}

async function listTemplates() {
  try {
    const response = await fetch(`${API_URL}/templates`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("[listTemplates] Error:", error);
    throw error;
  }
}

async function createTemplate(templateData) {
  try {
    const response = await fetch(`${API_URL}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templateData),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("[createTemplate] Error:", error);
    throw error;
  }
}

async function deleteTemplate(templateId) {
  try {
    const response = await fetch(`${API_URL}/templates/${templateId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("[deleteTemplate] Error:", error);
    throw error;
  }
}

async function createPortalLink(estimateId) {
  const id = validateEstimateId(estimateId);
  const response = await fetch(`${API_URL}/estimates/${id}/portal-link`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function createShareLink(estimateId, channel = "whatsapp") {
  const id = validateEstimateId(estimateId);
  const response = await fetch(
    `${API_URL}/estimates/${id}/share-link?channel=${encodeURIComponent(channel)}`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function sendProposalEmail(estimateId, toEmail, subject, message) {
  const id = validateEstimateId(estimateId);
  const params = new URLSearchParams({
    to_email: toEmail,
    subject: subject || "Your Proposal",
    message:
      message ||
      "Please find your proposal at the link below.",
  });
  const response = await fetch(
    `${API_URL}/estimates/${id}/send-email?${params.toString()}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function getProposalVersions(estimateId) {
  const id = validateEstimateId(estimateId);
  const response = await fetch(`${API_URL}/estimates/${id}/versions`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function listVendors() {
  const response = await fetch(`${API_URL}/vendors`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function createVendor(vendor) {
  const response = await fetch(`${API_URL}/vendors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function listVendorRates(vendorId) {
  const q = vendorId ? `?vendor_id=${vendorId}` : "";
  const response = await fetch(`${API_URL}/vendor-rates${q}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function createVendorRate(rate) {
  const response = await fetch(`${API_URL}/vendor-rates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rate),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function getReportSummary() {
  const response = await fetch(`${API_URL}/reports/summary`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function createWorkOrder(estimateId) {
  const response = await fetch(`${API_URL}/work-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estimate_id: estimateId }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function listWorkOrders(estimateId) {
  const q = estimateId ? `?estimate_id=${estimateId}` : "";
  const response = await fetch(`${API_URL}/work-orders${q}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function createInvoice(estimateId, total, workOrderId = null) {
  const response = await fetch(`${API_URL}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      estimate_id: estimateId,
      work_order_id: workOrderId,
      total,
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function listInvoices(estimateId) {
  const q = estimateId ? `?estimate_id=${estimateId}` : "";
  const response = await fetch(`${API_URL}/invoices${q}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function addPayment(invoiceId, amount, method, note) {
  const response = await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_id: invoiceId,
      amount,
      method,
      note,
    }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function listPayments({ invoiceId = null, estimateId = null } = {}) {
  const params = new URLSearchParams();
  if (invoiceId) params.append("invoice_id", invoiceId);
  if (estimateId) params.append("estimate_id", estimateId);
  const q = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}/payments${q}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function createChangeRequest(estimateId, title, details) {
  const response = await fetch(`${API_URL}/change-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estimate_id: estimateId, title, details }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function listChangeRequests(estimateId) {
  const q = estimateId ? `?estimate_id=${estimateId}` : "";
  const response = await fetch(`${API_URL}/change-requests${q}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function triggerBackup() {
  const response = await fetch(`${API_URL}/admin/backup`, { method: "POST" });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function updateEstimate(estimateId, estimateData) {
  try {
    const id = validateEstimateId(estimateId);
    console.log("[updateEstimate] Updating estimate:", id);

    // Normalize date if provided as YYYY-MM-DD
    if (
      typeof estimateData.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(estimateData.date)
    ) {
      estimateData.date = `${estimateData.date}T00:00:00`;
    }

    // Validate update data
    if (estimateData.discount !== undefined) {
      if (
        typeof estimateData.discount !== "number" ||
        estimateData.discount < 0 ||
        estimateData.discount > 100
      ) {
        throw new Error("Discount must be between 0 and 100");
      }
    }
    if (estimateData.tax_percent !== undefined) {
      if (
        typeof estimateData.tax_percent !== "number" ||
        estimateData.tax_percent < 0 ||
        estimateData.tax_percent > 100
      ) {
        throw new Error("Tax must be between 0 and 100");
      }
    }
    if (estimateData.advance !== undefined) {
      if (
        typeof estimateData.advance !== "number" ||
        estimateData.advance < 0
      ) {
        throw new Error("Advance cannot be negative");
      }
    }
    if (estimateData.exchange_rate !== undefined) {
      if (
        typeof estimateData.exchange_rate !== "number" ||
        estimateData.exchange_rate <= 0
      ) {
        throw new Error("Exchange rate must be positive");
      }
    }

    const response = await fetch(`${API_URL}/estimates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estimateData),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Estimate #${id} not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("[updateEstimate] Success:", result);
    return result;
  } catch (error) {
    console.error("[updateEstimate] Error:", error);
    throw error;
  }
}

async function deleteEstimate(estimateId) {
  try {
    const id = validateEstimateId(estimateId);
    console.log("[deleteEstimate] Deleting estimate:", id);

    const response = await fetch(`${API_URL}/estimates/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Estimate #${id} not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("[deleteEstimate] Success:", result);
    return result;
  } catch (error) {
    console.error("[deleteEstimate] Error:", error);
    throw error;
  }
}

async function getEstimatePDF(estimateId) {
  try {
    const id = validateEstimateId(estimateId);
    console.log("[getEstimatePDF] Fetching PDF URL for estimate:", id);

    const response = await fetch(`${API_URL}/estimates/${id}/pdf`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Estimate #${id} not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Validate PDF URL to prevent XSS
    if (result.pdf_url && !isValidURL(result.pdf_url)) {
      console.error("[getEstimatePDF] Suspicious PDF URL:", result.pdf_url);
      throw new Error("Invalid PDF URL returned from server");
    }

    console.log("[getEstimatePDF] Success:", result);
    return result;
  } catch (error) {
    console.error("[getEstimatePDF] Error:", error);
    throw error;
  }
}

async function duplicateEstimate(estimateId) {
  try {
    const id = validateEstimateId(estimateId);
    console.log("[duplicateEstimate] Duplicating estimate:", id);

    const response = await fetch(`${API_URL}/estimates/${id}/duplicate`, {
      method: "POST",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Estimate #${id} not found`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("[duplicateEstimate] Success:", result);
    return result;
  } catch (error) {
    console.error("[duplicateEstimate] Error:", error);
    throw error;
  }
}

// ============== FORM SUBMISSION ==============

let isSubmitting = false; // Prevent duplicate submissions

async function submitEstimate() {
  try {
    console.log("[submitEstimate] Starting form submission");

    // Prevent duplicate submissions
    if (isSubmitting) {
      alert("⏳ Form submission in progress. Please wait...");
      return;
    }
    isSubmitting = true;

    // Disable submit button during submission
    const submitBtn = document.querySelector(
      'button[onclick="submitEstimate()"]',
    );
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "⏳ Saving...";
    }

    try {
      // Collect items from table
      const items = [];
      const rows = document.querySelectorAll("#items tbody tr");

      if (rows.length === 0) {
        throw new Error("Please add at least one line item before submitting");
      }

      // Ensure numeric fields are sanitized and amounts are present.
      rows.forEach((row, index) => {
        const category = row.querySelector(".category")?.value?.trim() || "";
        const vendor_name =
          document.getElementById("vendor_name")?.value?.trim() || "";
        const item_type =
          row.querySelector(".item_type")?.value?.trim() || "material";
        const description = row.querySelector(".description")?.value?.trim();
        const size = row.querySelector(".size")?.value?.trim() || "";

        // Sanitize numeric strings (remove commas) before parsing
        const sftRaw = (row.querySelector(".sft")?.value || "")
          .toString()
          .replace(/,/g, "");
        const rateRaw = (row.querySelector(".rate")?.value || "")
          .toString()
          .replace(/,/g, "");
        const costRateRaw = (row.querySelector(".cost_rate")?.value || "")
          .toString()
          .replace(/,/g, "");
        let sft = parseFloat(sftRaw || 0);
        let rate = parseFloat(rateRaw || 0);
        let cost_rate = parseFloat(costRateRaw || 0);

        sft = isNaN(sft) ? 0 : sft;
        rate = isNaN(rate) ? 0 : rate;
        cost_rate = isNaN(cost_rate) ? 0 : cost_rate;

        // Recompute amount/total if missing or formatted with commas
        let amountInput = row.querySelector(".amount");
        let totalInput = row.querySelector(".total");

        const computedAmount = Math.round(sft * rate * 100) / 100;

        if (amountInput) {
          // sanitize and set value
          const amtRaw = (amountInput.value || "").toString().replace(/,/g, "");
          let amt = parseFloat(amtRaw || 0);
          if (isNaN(amt) || amt === 0) {
            amt = computedAmount;
            amountInput.value = amt.toFixed(2);
          }
        }

        if (totalInput) {
          const totRaw = (totalInput.value || "").toString().replace(/,/g, "");
          let tot = parseFloat(totRaw || 0);
          if (isNaN(tot) || tot === 0) {
            tot = computedAmount;
            totalInput.value = tot.toFixed(2);
          }
        }

        // Only include rows with valid data
        if (description && sft > 0 && rate > 0) {
          if (sft < 0 || rate < 0 || cost_rate < 0) {
            throw new Error(`Item ${index + 1}: Negative values not allowed`);
          }

          // Read sanitized numeric values for push
          const amount =
            parseFloat(
              (row.querySelector(".amount")?.value || "")
                .toString()
                .replace(/,/g, ""),
            ) || 0;
          const total =
            parseFloat(
              (row.querySelector(".total")?.value || "")
                .toString()
                .replace(/,/g, ""),
            ) || 0;

          if (amount < 0 || total < 0) {
            throw new Error(`Item ${index + 1}: Negative values not allowed`);
          }

          items.push({
            serial_number: index + 1,
            category,
            item_type,
            vendor_name,
            description,
            size,
            sft,
            rate,
            cost_rate,
            amount,
            total,
          });
        }
      });

      if (items.length === 0) {
        throw new Error("Please add at least one valid item before submitting");
      }

      console.log("[submitEstimate] Collected items:", items);
      console.table(items);
      const debugGross = items.reduce((sum, item) => {
        console.log(
          `Item: ${item.description}, amount: ${item.amount}, running sum: ${sum + item.amount}`,
        );
        return sum + (item.amount || 0);
      }, 0);
      console.log("DEBUG: Calculated gross total:", debugGross);

      // Collect form fields
      const party_name = document.getElementById("party_name")?.value?.trim();
      const contractor_name = document
        .getElementById("contractor_name")
        ?.value?.trim();
      let mobile_number =
        document.getElementById("mobile_number")?.value?.trim() || null;
      const location = document.getElementById("location")?.value?.trim();
      const dateValue = document.getElementById("date")?.value;
      const notes = document.getElementById("notes")?.value?.trim() || "";
      let discount = parseFloat(
        document.getElementById("discount")?.value || 0,
      );
      let tax_percent = parseFloat(
        document.getElementById("tax_percent")?.value || 0,
      );
      let advance = parseFloat(document.getElementById("advance")?.value || 0);
      const currency_code = document.getElementById("currency")?.value || "INR";
      let exchange_rate = parseFloat(
        document.getElementById("exchange_rate")?.value || 1,
      );

      // Validate required fields
      if (!party_name) {
        throw new Error("Party name is required");
      }
      if (!contractor_name) {
        throw new Error("Contractor name is required");
      }
      if (!location) {
        throw new Error("Location is required");
      }
      if (!dateValue) {
        throw new Error("Date is required");
      }
      const date = `${dateValue}T00:00:00`;

      // Validate field lengths
      if (party_name.length > 200) {
        throw new Error("Party name exceeds 200 characters");
      }
      if (contractor_name.length > 200) {
        throw new Error("Contractor name exceeds 200 characters");
      }
      if (location.length > 500) {
        throw new Error("Location exceeds 500 characters");
      }

      // Validate mobile number format if provided
      if (mobile_number) {
        const cleanMobile = mobile_number.replace(/[\s\-\(\)]/g, "");
        if (!/^\+?[0-9]{7,15}$/.test(cleanMobile)) {
          throw new Error(
            "Invalid mobile number. Use 7-15 digits, can include spaces, dashes, or +",
          );
        }
      }

      // Validate discount and tax and advance
      if (discount < 0 || discount > 100) {
        throw new Error("Discount must be between 0 and 100%");
      }
      if (tax_percent < 0 || tax_percent > 100) {
        throw new Error("Tax must be between 0 and 100%");
      }
      if (advance < 0) {
        throw new Error("Advance cannot be negative");
      }
      if (exchange_rate <= 0 || isNaN(exchange_rate)) {
        throw new Error("Exchange rate must be a positive number");
      }

      // Calculate totals for validation
      const gross = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      if (advance > gross) {
        throw new Error(
          `Advance (₹${advance.toFixed(2)}) cannot exceed gross total (₹${gross.toFixed(2)})`,
        );
      }

      const discountAmount = (gross * discount) / 100;
      const taxAmount = (gross * tax_percent) / 100;
      const finalAmount = gross - discountAmount - advance + taxAmount;

      if (finalAmount < 0) {
        console.warn(
          "⚠️ Final amount is negative. This may indicate an issue with discount/advance.",
        );
      }

      console.log("[submitEstimate] Calling API with validated data");

      // Submit to backend
      const payload = {
        party_name,
        contractor_name,
        mobile_number: mobile_number || null,
        location,
        date,
        notes,
        discount,
        tax_percent,
        advance,
        currency_code,
        exchange_rate,
        items,
      };

      const editingId = parseInt(window.editingEstimateId || "", 10);
      const isEdit = Number.isFinite(editingId) && editingId > 0;
      const result = isEdit
        ? await updateEstimate(editingId, payload)
        : await createEstimate(payload);

      console.log("[submitEstimate] API Response:", result);

      alert(
        isEdit
          ? `Estimate updated successfully!\\n📋 Estimate ID: ${result.id}`
          : `Estimate created successfully!\\n📋 Estimate ID: ${result.id}\\n💾 Saved to database`,
      );

      // Reset form
      if (typeof exitEditMode === "function") {
        exitEditMode();
      } else {
        window.editingEstimateId = null;
      }
      if (typeof clearDraft === "function") {
        clearDraft();
      }
      document.getElementById("estimateForm").reset();
      const tbody = document.querySelector("#items tbody");
      if (tbody) {
        tbody.innerHTML = "";
      }

      // Re-initialize table with one empty row
      if (typeof addRow === "function") {
        addRow();
        if (typeof calculateTotals === "function") {
          calculateTotals();
        }
      }

      return result;
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = window.editingEstimateId
          ? "Update Estimate"
          : "💾 Save & Generate PDF";
      }
      isSubmitting = false;
    }
  } catch (error) {
    console.error("[submitEstimate] Error:", error);
    const errorMessage = extractErrorMessageFromUnknown(
      error,
      "Failed to submit estimate. Please check the form and try again.",
    );
    alert(`Error submitting estimate: ${errorMessage}`);
    isSubmitting = false;
  }
}
