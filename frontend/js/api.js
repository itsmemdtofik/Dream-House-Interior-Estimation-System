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

// ============== ESTIMATE API CALLS ==============

async function createEstimate(estimateData) {
  try {
    console.log("[createEstimate] Sending request with data:", estimateData);

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
    if (typeof estimateData.advance !== "number" || estimateData.advance < 0) {
      throw new Error("Advance cannot be negative");
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.detail || `HTTP error! status: ${response.status}`;
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

async function updateEstimate(estimateId, estimateData) {
  try {
    const id = validateEstimateId(estimateId);
    console.log("[updateEstimate] Updating estimate:", id);

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
    if (estimateData.advance !== undefined) {
      if (
        typeof estimateData.advance !== "number" ||
        estimateData.advance < 0
      ) {
        throw new Error("Advance cannot be negative");
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

      rows.forEach((row, index) => {
        const description = row.querySelector(".description")?.value?.trim();
        const size = row.querySelector(".size")?.value?.trim() || "";
        const sft = parseFloat(row.querySelector(".sft")?.value || 0);
        const rate = parseFloat(row.querySelector(".rate")?.value || 0);
        const total = parseFloat(row.querySelector(".total")?.value || 0);

        // Only include rows with valid data
        if (description && sft > 0 && rate > 0) {
          if (sft < 0 || rate < 0 || total < 0) {
            throw new Error(`Item ${index + 1}: Negative values not allowed`);
          }
          items.push({ description, size, sft, rate, total });
        }
      });

      if (items.length === 0) {
        throw new Error("Please add at least one valid item before submitting");
      }

      console.log("[submitEstimate] Collected items:", items);

      // Collect form fields
      const party_name = document.getElementById("party_name")?.value?.trim();
      const contractor_name = document
        .getElementById("contractor_name")
        ?.value?.trim();
      let mobile_number =
        document.getElementById("mobile_number")?.value?.trim() || null;
      const location = document.getElementById("location")?.value?.trim();
      const date = document.getElementById("date")?.value;
      const notes = document.getElementById("notes")?.value?.trim() || "";
      let discount = parseFloat(
        document.getElementById("discount")?.value || 0,
      );
      let advance = parseFloat(document.getElementById("advance")?.value || 0);

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
      if (!date) {
        throw new Error("Date is required");
      }

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

      // Validate discount and advance
      if (discount < 0 || discount > 100) {
        throw new Error("Discount must be between 0 and 100%");
      }
      if (advance < 0) {
        throw new Error("Advance cannot be negative");
      }

      // Calculate totals for validation
      const gross = items.reduce((sum, item) => sum + (item.total || 0), 0);
      if (advance > gross) {
        throw new Error(
          `Advance (₹${advance.toFixed(2)}) cannot exceed gross total (₹${gross.toFixed(2)})`,
        );
      }

      const discountAmount = (gross * discount) / 100;
      const finalAmount = gross - discountAmount - advance;

      if (finalAmount < 0) {
        console.warn(
          "⚠️ Final amount is negative. This may indicate an issue with discount/advance.",
        );
      }

      console.log("[submitEstimate] Calling API with validated data");

      // Submit to backend
      const result = await createEstimate({
        party_name,
        contractor_name,
        mobile_number: mobile_number || null,
        location,
        date,
        notes,
        discount,
        advance,
        items,
      });

      console.log("[submitEstimate] API Response:", result);

      alert(
        `Estimate created successfully!\\n📋 Estimate ID: ${result.id}\\n💾 Saved to database`,
      );

      // Reset form
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
        submitBtn.innerText = "💾 Save & Generate PDF";
      }
      isSubmitting = false;
    }
  } catch (error) {
    console.error("[submitEstimate] Error:", error);
    alert(`Error submitting estimate: ${error.message}`);
    isSubmitting = false;
  }
}
