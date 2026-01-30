function addRow() {
  const tbody = document.querySelector("#items tbody");
  const rowCount = tbody.children.length + 1;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="serial">${rowCount}</td>
    <td>
      <input 
        class="description" 
        type="text" 
        placeholder="e.g., Master Bedroom - Wardrobe"
        required
      />
    </td>
    <td>
      <input 
        class="size" 
        type="text" 
        placeholder="e.g., 9'-0\" x 7'-0\""
      />
    </td>
    <td>
      <input 
        class="sft" 
        type="number" 
        placeholder="0.0" 
        step="0.1"
        oninput="calcRow(this)"
      />
    </td>
    <td>
      <input 
        class="rate" 
        type="number" 
        placeholder="0" 
        step="1"
        oninput="calcRow(this)"
      />
    </td>
    <td>
      <input 
        class="amount" 
        type="number" 
        placeholder="0" 
        step="1"
        readonly
      />
    </td>
    <td>
      <input 
        class="total" 
        type="number" 
        placeholder="0" 
        step="1"
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
  tbody.querySelectorAll("tr").forEach((row, index) => {
    row.querySelector(".serial").innerText = index + 1;
  });
}

function calcRow(el) {
  const row = el.closest("tr");
  const sft = parseFloat(row.querySelector(".sft")?.value || 0);
  const rate = parseFloat(row.querySelector(".rate")?.value || 0);

  const amount = sft * rate;

  const amountInput = row.querySelector(".amount");
  amountInput.value = amount.toFixed(2);

  // Set total to amount if not already set
  const totalInput = row.querySelector(".total");
  if (!totalInput.value) {
    totalInput.value = amount.toFixed(2);
  }

  calculateTotals();
}

function calculateTotals() {
  let gross = 0;

  document.querySelectorAll("#items tbody tr").forEach((row) => {
    const amount = parseFloat(row.querySelector(".amount")?.value || 0);
    gross += amount;
  });

  const discount = parseFloat(document.getElementById("discount")?.value || 0);
  const advance = parseFloat(document.getElementById("advance")?.value || 0);

  const discountAmount = (gross * discount) / 100;
  const final = gross - discountAmount - advance;

  // Format currency display
  document.getElementById("gross").innerText = formatCurrency(gross);
  document.getElementById("final").innerText = formatCurrency(final);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Tab switching
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
    document.getElementById(tabName).classList.add("active");

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

// Load and display estimates
async function loadEstimates() {
  try {
    console.log("Loading estimates...");
    const estimates = await getAllEstimates();
    console.log("Estimates loaded:", estimates);

    const tbody = document.getElementById("estimatesList");
    if (!tbody) {
      console.error("estimatesList not found");
      return;
    }

    tbody.innerHTML = "";

    if (!estimates || estimates.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center; padding: 20px;">No estimates found</td></tr>';
      return;
    }

    estimates.forEach((est) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${est.id}</td>
        <td>${est.party_name}</td>
        <td>${est.contractor_name}</td>
        <td>${formatDate(est.date)}</td>
        <td>${formatCurrency(est.gross)}</td>
        <td>${formatCurrency(est.final)}</td>
        <td>
          <button class="btn-small" onclick="viewEstimate(${est.id})">View</button>
          <button class="btn-small" onclick="downloadPDF(${est.id})">PDF</button>
          <button class="btn-small" onclick="deleteEstimateRecord(${est.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading estimates:", error);
    alert("Error loading estimates: " + error.message);
  }
}

function viewEstimate(estimateId) {
  // TODO: Implement view/edit functionality
  alert(`View estimate ${estimateId}`);
}

async function downloadPDF(estimateId) {
  try {
    console.log("Downloading PDF for estimate:", estimateId);
    const pdfData = await getEstimatePDF(estimateId);
    console.log("PDF data:", pdfData);

    if (pdfData && pdfData.pdf_url) {
      window.open(pdfData.pdf_url, "_blank");
    } else {
      alert("PDF URL not available");
    }
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert("Error downloading PDF: " + error.message);
  }
}

async function deleteEstimateRecord(estimateId) {
  if (confirm("Are you sure you want to delete this estimate?")) {
    try {
      await deleteEstimate(estimateId);
      alert("Estimate deleted successfully");
      loadEstimates();
    } catch (error) {
      alert("Error deleting estimate");
    }
  }
}
