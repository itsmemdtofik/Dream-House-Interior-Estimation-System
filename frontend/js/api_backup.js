const API_URL = "http://localhost:8000/api";

// ============== ESTIMATE API CALLS ==============

async function createEstimate(estimateData) {
  try {
    const response = await fetch(`${API_URL}/estimates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estimateData),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error creating estimate:", error);
    throw error;
  }
}

async function getEstimate(estimateId) {
  try {
    const response = await fetch(`${API_URL}/estimates/${estimateId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching estimate:", error);
    throw error;
  }
}

async function getAllEstimates(skip = 0, limit = 100) {
  try {
    const response = await fetch(
      `${API_URL}/estimates?skip=${skip}&limit=${limit}`,
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching estimates:", error);
    throw error;
  }
}

async function updateEstimate(estimateId, estimateData) {
  try {
    const response = await fetch(`${API_URL}/estimates/${estimateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(estimateData),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error updating estimate:", error);
    throw error;
  }
}

async function deleteEstimate(estimateId) {
  try {
    const response = await fetch(`${API_URL}/estimates/${estimateId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error deleting estimate:", error);
    throw error;
  }
}

async function getEstimatePDF(estimateId) {
  try {
    const response = await fetch(`${API_URL}/estimates/${estimateId}/pdf`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error getting PDF URL:", error);
    throw error;
  }
}

// ============== FORM SUBMISSION ==============

async function submitEstimate() {
  try {
    console.log("Starting estimate submission...");

    // Validate at least one item
    const rows = document.querySelectorAll("#items tbody tr");
    if (rows.length === 0) {
      alert("Please add at least one line item");
      return;
    }

    // Collect header info
    const estimateData = {
      party_name: document.getElementById("party_name")?.value || "",
      contractor_name: document.getElementById("contractor_name")?.value || "",
      mobile_number: document.getElementById("mobile_number")?.value || "",
      location: document.getElementById("location")?.value || "",
      date: document.getElementById("date")?.value
        ? new Date(document.getElementById("date").value).toISOString()
        : new Date().toISOString(),
      discount: parseFloat(document.getElementById("discount")?.value || 0),
      advance: parseFloat(document.getElementById("advance")?.value || 0),
      notes: document.getElementById("notes")?.value || "",
      items: [],
    };

    // Collect line items from table
    const itemsTable = document.getElementById("items");
    if (itemsTable) {
      itemsTable.querySelectorAll("tbody tr").forEach((row, index) => {
        const item = {
          serial_number: index + 1,
          description:
            row.querySelector(".description")?.value ||
            row.querySelector("td:nth-child(2)")?.innerText ||
            "",
          size:
            row.querySelector(".size")?.value ||
            row.querySelector("td:nth-child(3)")?.innerText ||
            "",
          sft: parseFloat(
            row.querySelector(".sft")?.value ||
              row.querySelector(".sft")?.innerText ||
              0,
          ),
          rate: parseFloat(
            row.querySelector(".rate")?.value ||
              row.querySelector("td:nth-child(5)")?.innerText ||
              0,
          ),
          amount: parseFloat(
            row.querySelector(".amount")?.value ||
              row.querySelector(".amount")?.innerText ||
              0,
          ),
          total:
            parseFloat(
              row.querySelector(".total")?.value ||
                row.querySelector(".total")?.innerText ||
                0,
            ) || null,
        };
        estimateData.items.push(item);
      });
    }

    console.log("Estimate data to submit:", estimateData);

    // Submit to backend
    const result = await createEstimate(estimateData);
    console.log("Estimate created:", result);

    // Show success message
    alert(`Estimate created successfully! ID: ${result.id}`);

    // Download PDF if available
    if (result.pdf_url) {
      window.open(result.pdf_url, "_blank");
    }

    // Reset form
    document.getElementById("estimateForm").reset();
    document.querySelector("#items tbody").innerHTML = "";
    addRow();
    calculateTotals();

    return result;
  } catch (error) {
    console.error("Error submitting estimate:", error);
    alert(`Error: ${error.message}`);
  }
}

// ============== UTILITY FUNCTIONS ==============

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-IN", options);
}
