const filterForm = document.getElementById('filterForm');
const spinner = document.getElementById('spinner');
const spinner2 = document.getElementById('spinner2');
const attendanceRecords = document.getElementById('attendanceRecords');
const collectSelectedBtn = document.getElementById('collectSelectedBtn');
const collectAllBtn = document.getElementById('collectAllBtn');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');

let selectedRecords = new Set();

// Format currency
function formatCurrency(val) {
  return `${(val || 0).toLocaleString('en-US')} EGP`;
}

// Format date
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Update summary cards
function updateSummary(summary) {
  document.getElementById('totalSessions').textContent = summary.totalSessions || '--';
  document.getElementById('totalCenterFees').textContent = formatCurrency(summary.totalCenterFees);
  document.getElementById('totalCollected').textContent = formatCurrency(summary.totalCollected);
  document.getElementById('totalPending').textContent = formatCurrency(summary.totalPending);
  if (document.getElementById('totalExpenses')) document.getElementById('totalExpenses').textContent = formatCurrency(summary.totalExpenses);
  if (document.getElementById('totalCanteenIn')) document.getElementById('totalCanteenIn').textContent = formatCurrency(summary.totalCanteenIn);
  if (document.getElementById('totalCenterRevenue')) document.getElementById('totalCenterRevenue').textContent = formatCurrency(summary.totalCenterRevenue);
  if (document.getElementById('totalEmployeeKPIs')) document.getElementById('totalEmployeeKPIs').textContent = formatCurrency(summary.totalEmployeeKPIs);
  if (document.getElementById('totalTeacherInvoices')) document.getElementById('totalTeacherInvoices').textContent = formatCurrency(summary.totalTeacherInvoices);
  if (document.getElementById('netProfit')) document.getElementById('netProfit').textContent = formatCurrency(summary.netProfit);
}

// Populate attendance records
function populateRecords(records) {
  attendanceRecords.innerHTML = '';
  selectedRecords.clear();
  
  if (records.length === 0) {
    attendanceRecords.innerHTML = `
      <div class="col-12 text-center">
        <h6 class="text-muted">No attendance records found</h6>
      </div>
    `;
    return;
  }

  records.forEach(record => {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4 mb-4';
    
    const isCollected = record.centerFeesCollected;
    const cardBorderClass = isCollected ? 'border-success' : 'border-warning';
    const cardBgClass = isCollected ? 'bg-light' : 'bg-white';
    
    card.innerHTML = `
      <div class="card attendance-card ${cardBorderClass} ${cardBgClass}" style="border-width: 2px;">
        <div class="card-body">
          ${isCollected ? '<span class="badge bg-success collected-badge">Collected</span>' : ''}
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="card-title mb-0">${record.teacherName}</h6>
            <small class="text-muted">${formatDate(record.date)}</small>
          </div>
          
          <div class="mb-3">
            <div class="row">
              <div class="col-6">
                <small class="text-muted">Students:</small><br>
                <strong>${record.studentCount}</strong>
              </div>
              <div class="col-6">
                <small class="text-muted">Employees (${record.employeeCount || 1}):</small><br>
                <strong title="${record.employeeName}">${record.employeeName.length > 20 ? record.employeeName.substring(0, 20) + '...' : record.employeeName}</strong>
              </div>
            </div>
          </div>
          
          <div class="mb-3">
            <div class="row">
              <div class="col-6">
                <small class="text-muted">Total Amount:</small><br>
                <strong class="text-primary">${formatCurrency(record.totalAmount)}</strong>
              </div>
              <div class="col-6">
                <small class="text-muted">Center Fees:</small><br>
                <strong class="text-info">${formatCurrency(record.centerFees)}</strong>
              </div>
            </div>
          </div>
          
          <div class="d-flex justify-content-between align-items-center">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="record-${record._id}" 
                     ${isCollected ? 'disabled' : ''} 
                     onchange="toggleRecordSelection('${record._id}', this.checked)">
              <label class="form-check-label" for="record-${record._id}">
                ${isCollected ? 'Already Collected' : 'Select for Collection'}
              </label>
            </div>
            
            <div class="d-flex gap-2">
              <button class="btn btn-sm details-btn" onclick="viewDetails('${record._id}')">
                <i class="material-symbols-rounded text-sm">visibility</i> Details
              </button>
              
              ${!isCollected ? `
                <button class="btn btn-sm collect-btn" onclick="collectSingleRecord('${record._id}')">
                  <i class="material-symbols-rounded text-sm">payments</i> Collect
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    attendanceRecords.appendChild(card);
  });
  
  updateCollectButton();
}

// Toggle record selection
function toggleRecordSelection(recordId, isSelected) {
  if (isSelected) {
    selectedRecords.add(recordId);
  } else {
    selectedRecords.delete(recordId);
  }
  updateCollectButton();
}

// Update collect button visibility
function updateCollectButton() {
  if (selectedRecords.size > 0) {
    collectSelectedBtn.style.display = 'block';
    collectSelectedBtn.textContent = `Collect Selected (${selectedRecords.size})`;
  } else {
    collectSelectedBtn.style.display = 'none';
  }
}

// Collect single record
async function collectSingleRecord(recordId) {
  try {
    const response = await fetch('/admin/collect-center-fees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendanceIds: [recordId] }),
    });

    const result = await response.json();
    
    if (response.ok) {
      showToast('success', result.message);
      loadData(); // Reload data
    } else {
      showToast('error', result.error || 'Error collecting fees');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('error', 'Error collecting fees');
  }
}

// View attendance details
function viewDetails(recordId) {
  window.location.href = `/admin/attendance-details?id=${recordId}`;
}

// Collect selected records
async function collectSelectedRecords() {
  if (selectedRecords.size === 0) {
    showToast('error', 'No records selected');
    return;
  }

  try {
    const response = await fetch('/admin/collect-center-fees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendanceIds: Array.from(selectedRecords) }),
    });

    const result = await response.json();
    
    if (response.ok) {
      showToast('success', result.message);
      loadData(); // Reload data
    } else {
      showToast('error', result.error || 'Error collecting fees');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('error', 'Error collecting fees');
  }
}

// Show toast notification
function showToast(type, message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add to page
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container position-fixed bottom-0 start-0 p-3';
  toastContainer.appendChild(toast);
  document.body.appendChild(toastContainer);
  
  // Show toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  // Remove after hidden
  toast.addEventListener('hidden.bs.toast', () => {
    document.body.removeChild(toastContainer);
  });
}

// Load data
async function loadData() {
  try {
    spinner2.classList.remove('d-none');
    
    const formData = new FormData(filterForm);
    const params = new URLSearchParams();
    
    const period = formData.get('period');
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    const collected = formData.get('collected');

    // if period selected and not custom, ignore manual dates
    if (period && period !== 'custom') {
      params.set('period', period);
    } else {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    if (collected !== null && collected !== undefined && collected !== '') {
      params.set('collected', collected);
    }
    
    const response = await fetch(`/admin/center-fees-data?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    updateSummary(data.summary);
    populateRecords(data.records);
    
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('error', 'Error loading data');
  } finally {
    spinner2.classList.add('d-none');
  }
}

// Handle filter form submission
filterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  spinner.classList.remove('d-none');
  
  try {
    await loadData();
  } finally {
    spinner.classList.add('d-none');
  }
});

// Handle collect selected button
collectSelectedBtn.addEventListener('click', collectSelectedRecords);

// Collect all in period
async function collectAllInPeriod() {
  const formData = new FormData(filterForm);
  const body = {};
  const period = formData.get('period');
  const startDate = formData.get('startDate');
  const endDate = formData.get('endDate');
  if (period && period !== 'custom') body.period = period; // server uses dates, but we still send for potential server logic later
  if (startDate) body.startDate = startDate;
  if (endDate) body.endDate = endDate;

  try {
    collectAllBtn.disabled = true;
    const res = await fetch('/admin/collect-center-fees/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to collect all');
    showToast('success', data.message || 'Collected');
    await loadData();
    await loadLogs();
  } catch (e) {
    console.error(e);
    showToast('error', e.message);
  } finally {
    collectAllBtn.disabled = false;
  }
}

if (collectAllBtn) collectAllBtn.addEventListener('click', collectAllInPeriod);

// Logs loading
function renderLogs(logs) {
  const tbody = document.getElementById('collectionLogsBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!logs || !logs.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="text-center text-muted">No logs</td>`;
    tbody.appendChild(tr);
    return;
  }
  logs.forEach(log => {
    const tr = document.createElement('tr');
    const period = `${formatDate(log.periodStart)} - ${formatDate(log.periodEnd)}`;
    tr.innerHTML = `
      <td>${formatDate(log.createdAt)}</td>
      <td>${period}</td>
      <td>${log.teacher?.teacherName || '-'}</td>
      <td>${log.totalSessions}</td>
      <td>${formatCurrency(log.totalCenterFees)}</td>
      <td>${log.collectedBy?.name || log.collectedBy?.phoneNumber || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadLogs() {
  try {
    const formData = new FormData(filterForm);
    const params = new URLSearchParams();
    const period = formData.get('period');
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    if (period && period !== 'custom') {
      // For logs, approximate by leaving to server without dates
      params.set('period', period);
    } else {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    const res = await fetch(`/admin/center-fees/logs?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load logs');
    renderLogs(data.logs || []);
  } catch (e) {
    console.error('Error loading logs', e);
  }
}

if (refreshLogsBtn) refreshLogsBtn.addEventListener('click', loadLogs);

// Load initial data
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await loadLogs();
});
