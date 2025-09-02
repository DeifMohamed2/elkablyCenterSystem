// DOM Elements
const teacherSelect = document.getElementById('teacherSelect');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const generateReportBtn = document.getElementById('generateReportBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const spinner = document.getElementById('spinner');

// Sections
const teacherInfoSection = document.getElementById('teacherInfoSection');
const statsSection = document.getElementById('statsSection');
const avgStatsSection = document.getElementById('avgStatsSection');
const sessionsSection = document.getElementById('sessionsSection');
const studentsSection = document.getElementById('studentsSection');
const invoicesSection = document.getElementById('invoicesSection');
const separator1 = document.getElementById('separator1');
const separator2 = document.getElementById('separator2');

// Pagination settings
const PAGINATION_CONFIG = {
  pageSize: 10,
  pageSizeOptions: [5, 10, 20, 50]
};

// Pagination state
let paginationState = {
  sessions: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: PAGINATION_CONFIG.pageSize },
  students: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: PAGINATION_CONFIG.pageSize },
  invoices: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: PAGINATION_CONFIG.pageSize }
};

// Data storage
let currentData = {
  sessions: [],
  students: [],
  invoices: []
};

// Format currency
function formatCurrency(amount) {
  return `${(amount || 0).toLocaleString('en-US')} EGP`;
}

// Format date
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Show/hide spinner
function showSpinner() {
  spinner.classList.remove('d-none');
}

function hideSpinner() {
  spinner.classList.add('d-none');
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
  toastContainer.style.zIndex = '9999';
  toastContainer.style.left = '20px';
  toastContainer.style.bottom = '20px';
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

// Load teachers for dropdown
async function loadTeachers() {
  try {
    const response = await fetch('/admin/teachers');
    if (!response.ok) {
      throw new Error('Failed to fetch teachers');
    }
    
    const teachers = await response.json();
    
    // Clear existing options
    teacherSelect.innerHTML = '<option value="">Choose a teacher...</option>';
    
    // Add teacher options
    teachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher._id;
      option.textContent = teacher.teacherName;
      teacherSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error loading teachers:', error);
    showToast('error', 'Error loading teachers');
  }
}

// Update teacher information
function updateTeacherInfo(teacher, startDate, endDate) {
  document.getElementById('teacherName').textContent = teacher?.teacherName || 'Unknown';
  
  let periodText = 'All Time';
  if (startDate && endDate) {
    periodText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  document.getElementById('reportPeriod').textContent = periodText;
  
  teacherInfoSection.style.display = 'block';
}

// Update statistics
function updateStatistics(summary) {
  document.getElementById('totalSessions').textContent = summary.totalSessions || '0';
  document.getElementById('totalStudents').textContent = summary.totalStudents || '0';
  document.getElementById('totalAmount').textContent = formatCurrency(summary.totalAmount);
  document.getElementById('totalCenterFees').textContent = formatCurrency(summary.totalCenterFees);
  document.getElementById('totalInvoices').textContent = formatCurrency(summary.totalInvoices);
  document.getElementById('totalNetProfit').textContent = formatCurrency(summary.totalNetProfit);
  
  document.getElementById('avgStudentsPerSession').textContent = summary.averageStudentsPerSession || '0';
  document.getElementById('avgAmountPerSession').textContent = formatCurrency(summary.averageAmountPerSession);
  document.getElementById('avgCenterFeesPerSession').textContent = formatCurrency(summary.averageCenterFeesPerSession);
  
  // Add performance indicators
  addPerformanceIndicators(summary);
  
  statsSection.style.display = 'block';
  avgStatsSection.style.display = 'block';
}

// Populate sessions table
function populateSessionsTable(sessionsData) {
  // Store the full data
  currentData.sessions = sessionsData;
  
  // Calculate pagination
  const pagination = calculatePagination(sessionsData.length, paginationState.sessions.pageSize);
  paginationState.sessions.totalPages = pagination.totalPages;
  paginationState.sessions.totalItems = pagination.totalItems;
  
  // Get paginated data
  const paginatedData = getPaginatedData(sessionsData, paginationState.sessions.currentPage, paginationState.sessions.pageSize);
  
  const tbody = document.getElementById('sessionsTBody');
  tbody.innerHTML = '';
  
  if (paginatedData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">No sessions found</td>
      </tr>
    `;
    // Show pagination controls even for empty data
    createPaginationControls('sessionsPagination', 'sessions', 1, 1, 0, paginationState.sessions.pageSize);
    return;
  }
  
  paginatedData.forEach(session => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">${formatDate(session.date)}</td>
      <td class="text-center">${session.course || 'N/A'}</td>
      <td class="text-center">${session.students}</td>
      <td class="text-center">${formatCurrency(session.amount)}</td>
      <td class="text-center">${formatCurrency(session.centerFees)}</td>
      <td class="text-center">${formatCurrency(session.invoices)}</td>
      <td class="text-center">${formatCurrency(session.netProfit)}</td>
      <td class="text-center">
        <span class="badge ${session.isFinalized ? 'bg-success' : 'bg-warning'}">
          ${session.isFinalized ? 'Finalized' : 'Pending'}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  sessionsSection.style.display = 'block';
  separator1.style.display = 'block';
  
  // Create pagination controls
  createPaginationControls('sessionsPagination', 'sessions', paginationState.sessions.currentPage, paginationState.sessions.totalPages, paginationState.sessions.totalItems, paginationState.sessions.pageSize);
 
  // Ensure pagination container is visible
  const paginationContainer = document.getElementById('sessionsPagination');
  if (paginationContainer) {
    paginationContainer.style.display = 'block';
  }
}

// Populate sessions cards
function populateSessionsCards(sessionsData) {
  // Get paginated data for cards (same as table)
  const paginatedData = getPaginatedData(sessionsData, paginationState.sessions.currentPage, paginationState.sessions.pageSize);
  
  const container = document.getElementById('sessionsCardsView');
  container.innerHTML = '';
  
  if (paginatedData.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <h6 class="text-muted">No sessions found</h6>
      </div>
    `;
    // Show pagination controls even for empty data
    createPaginationControls('sessionsCardsPagination', 'sessions', 1, 1, 0, paginationState.sessions.pageSize);
    return;
  }
  
  paginatedData.forEach(session => {
    const card = document.createElement('div');
    card.className = 'detail-card session-card';
    
    card.innerHTML = `
      <div class="detail-card-header">
        <h6 class="detail-card-title">${session.course || 'Session'}</h6>
        <span class="detail-card-status ${session.isFinalized ? 'finalized' : 'pending'}">
          ${session.isFinalized ? 'Finalized' : 'Pending'}
        </span>
      </div>
      
      <div class="detail-card-content">
        <div class="detail-card-item">
          <span class="detail-card-label">Date:</span>
          <span class="detail-card-value">${formatDate(session.date)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Students:</span>
          <span class="detail-card-value">${session.students}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Total Amount:</span>
          <span class="detail-card-value amount">${formatCurrency(session.amount)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Center Fees:</span>
          <span class="detail-card-value">${formatCurrency(session.centerFees)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Teacher Fees:</span>
          <span class="detail-card-value">${formatCurrency(session.teacherFees)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Invoices:</span>
          <span class="detail-card-value">${formatCurrency(session.invoices)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Net Profit:</span>
          <span class="detail-card-value ${session.netProfit >= 0 ? 'amount' : 'negative'}">${formatCurrency(session.netProfit)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Finalized By:</span>
          <span class="detail-card-value">${session.finalizedBy || 'N/A'}</span>
        </div>
      </div>
      
      <div class="detail-card-footer">
        <div class="detail-card-metrics">
          <span class="metric-badge efficiency">Efficiency: ${session.efficiency || '0'}%</span>
          <span class="metric-badge profit">Profit: ${session.profitMargin || '0'}%</span>
        </div>
        <button class="btn btn-sm btn-outline-dark" onclick="viewSessionDetails('${session._id}')">
          <i class="material-symbols-rounded text-sm">visibility</i> Details
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Create pagination controls for cards
  createPaginationControls('sessionsCardsPagination', 'sessions', paginationState.sessions.currentPage, paginationState.sessions.totalPages, paginationState.sessions.totalItems, paginationState.sessions.pageSize);
 
  // Ensure pagination container is visible
  const paginationContainer = document.getElementById('sessionsCardsPagination');
  if (paginationContainer) {
    paginationContainer.style.display = 'block';
  }
}

// Populate students table
function populateStudentsTable(studentsData) {
  // Store the full data
  currentData.students = studentsData;
  
  // Calculate pagination
  const pagination = calculatePagination(studentsData.length, paginationState.students.pageSize);
  paginationState.students.totalPages = pagination.totalPages;
  paginationState.students.totalItems = pagination.totalItems;
  
  // Get paginated data
  const paginatedData = getPaginatedData(studentsData, paginationState.students.currentPage, paginationState.students.pageSize);
  
  const tbody = document.getElementById('studentsTBody');
  tbody.innerHTML = '';
  
  if (paginatedData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">No students found</td>
      </tr>
    `;
    // Show pagination controls even for empty data
    createPaginationControls('studentsPagination', 'students', 1, 1, 0, paginationState.students.pageSize);
    return;
  }
  
  paginatedData.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">${formatDate(student.sessionDate)}</td>
      <td class="text-center">${student.studentName}</td>
      <td class="text-center">${student.studentCode}</td>
      <td class="text-center">${formatCurrency(student.amountPaid)}</td>
      <td class="text-center">${formatCurrency(student.centerFees)}</td>
      <td class="text-center">${student.addedBy}</td>
    `;
    tbody.appendChild(row);
  });
  
  studentsSection.style.display = 'block';
  separator2.style.display = 'block';
 
  // Create pagination controls
  createPaginationControls('studentsPagination', 'students', paginationState.students.currentPage, paginationState.students.totalPages, paginationState.students.totalItems, paginationState.students.pageSize);
 
  // Ensure pagination container is visible
  const paginationContainer = document.getElementById('studentsPagination');
  if (paginationContainer) {
    paginationContainer.style.display = 'block';
  }
}

// Populate students cards
function populateStudentsCards(studentsData) {
  // Get paginated data for cards (same as table)
  const paginatedData = getPaginatedData(studentsData, paginationState.students.currentPage, paginationState.students.pageSize);
  
  const container = document.getElementById('studentsCardsView');
  container.innerHTML = '';
  
  if (paginatedData.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <h6 class="text-muted">No students found</h6>
      </div>
    `;
    // Show pagination controls even for empty data
    createPaginationControls('studentsCardsPagination', 'students', 1, 1, 0, paginationState.students.pageSize);
    return;
  }
  
  paginatedData.forEach(student => {
    const card = document.createElement('div');
    card.className = 'detail-card student-card';
    
    card.innerHTML = `
      <div class="detail-card-header">
        <h6 class="detail-card-title">${student.studentName || 'Unknown Student'}</h6>
        <span class="metric-badge">${student.studentCode || 'N/A'}</span>
      </div>
      
      <div class="detail-card-content">
        <div class="detail-card-item">
          <span class="detail-card-label">Session Date:</span>
          <span class="detail-card-value">${formatDate(student.sessionDate)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Amount Paid:</span>
          <span class="detail-card-value amount">${formatCurrency(student.amountPaid)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Center Fees:</span>
          <span class="detail-card-value">${formatCurrency(student.centerFees)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Added By:</span>
          <span class="detail-card-value">${student.addedBy || 'N/A'}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Phone:</span>
          <span class="detail-card-value">${student.studentPhone || 'N/A'}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Parent Phone:</span>
          <span class="detail-card-value">${student.parentPhone || 'N/A'}</span>
        </div>
      </div>
      
      <div class="detail-card-footer">
        <div class="detail-card-metrics">
          <span class="metric-badge efficiency">Efficiency: ${student.efficiency || '0'}%</span>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
 
  // Create pagination controls for cards
  createPaginationControls('studentsCardsPagination', 'students', paginationState.students.currentPage, paginationState.students.totalPages, paginationState.students.totalItems, paginationState.students.pageSize);
 
  // Ensure pagination container is visible
  const paginationContainer = document.getElementById('studentsCardsPagination');
  if (paginationContainer) {
    paginationContainer.style.display = 'block';
  }
}

// Populate invoices table
function populateInvoicesTable(invoicesData) {
  // Store the full data
  currentData.invoices = invoicesData;
  
  // Calculate pagination
  const pagination = calculatePagination(invoicesData.length, paginationState.invoices.pageSize);
  paginationState.invoices.totalPages = pagination.totalPages;
  paginationState.invoices.totalItems = pagination.totalItems;
  
  // Get paginated data
  const paginatedData = getPaginatedData(invoicesData, paginationState.invoices.currentPage, paginationState.invoices.pageSize);
  
  const tbody = document.getElementById('invoicesTBody');
  tbody.innerHTML = '';
  
  if (paginatedData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">No invoices found</td>
      </tr>
    `;
    // Show pagination controls even for empty data
    createPaginationControls('invoicesPagination', 'invoices', 1, 1, 0, paginationState.invoices.pageSize);
    return;
  }
  
  paginatedData.forEach(invoice => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">${formatDate(invoice.sessionDate)}</td>
      <td class="text-center">${invoice.details}</td>
      <td class="text-center">${formatCurrency(invoice.amount)}</td>
      <td class="text-center">${invoice.time}</td>
      <td class="text-center">${invoice.addedBy}</td>
    `;
    tbody.appendChild(row);
  });
  
  invoicesSection.style.display = 'block';
 
  // Create pagination controls
  createPaginationControls('invoicesPagination', 'invoices', paginationState.invoices.currentPage, paginationState.invoices.totalPages, paginationState.invoices.totalItems, paginationState.invoices.pageSize);
 
  // Ensure pagination container is visible
  const paginationContainer = document.getElementById('invoicesPagination');
  if (paginationContainer) {
    paginationContainer.style.display = 'block';
  }
}

// Populate invoices cards
function populateInvoicesCards(invoicesData) {
  // Get paginated data for cards (same as table)
  const paginatedData = getPaginatedData(invoicesData, paginationState.invoices.currentPage, paginationState.invoices.pageSize);
  
  const container = document.getElementById('invoicesCardsView');
  container.innerHTML = '';
  
  if (paginatedData.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <h6 class="text-muted">No invoices found</h6>
      </div>
    `;
    // Show pagination controls even for empty data
    createPaginationControls('invoicesCardsPagination', 'invoices', 1, 1, 0, paginationState.invoices.pageSize);
    return;
  }
  
  paginatedData.forEach(invoice => {
    const card = document.createElement('div');
    card.className = 'detail-card invoice-card';
    
    card.innerHTML = `
      <div class="detail-card-header">
        <h6 class="detail-card-title">${invoice.details || 'Invoice'}</h6>
        <span class="category-badge ${(invoice.category || 'other').toLowerCase()}">${invoice.category || 'Other'}</span>
      </div>
      
      <div class="detail-card-content">
        <div class="detail-card-item">
          <span class="detail-card-label">Session Date:</span>
          <span class="detail-card-value">${formatDate(invoice.sessionDate)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Amount:</span>
          <span class="detail-card-value amount">${formatCurrency(invoice.amount)}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Time:</span>
          <span class="detail-card-value">${invoice.time || 'N/A'}</span>
        </div>
        <div class="detail-card-item">
          <span class="detail-card-label">Added By:</span>
          <span class="detail-card-value">${invoice.addedBy || 'N/A'}</span>
        </div>
      </div>
      
      <div class="detail-card-footer">
        <div class="detail-card-metrics">
          <span class="metric-badge">${invoice.percentage || '0'}% of session</span>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
 
  // Create pagination controls for cards
  createPaginationControls('invoicesCardsPagination', 'invoices', paginationState.invoices.currentPage, paginationState.invoices.totalPages, paginationState.invoices.totalItems, paginationState.invoices.pageSize);
 
  // Ensure pagination container is visible
  const paginationContainer = document.getElementById('invoicesCardsPagination');
  if (paginationContainer) {
    paginationContainer.style.display = 'block';
  }
}

// Generate report
async function generateReport() {
  const teacherId = teacherSelect.value;
  const start = startDate.value;
  const end = endDate.value;
  
  if (!teacherId) {
    showToast('error', 'Please select a teacher');
    return;
  }
  
  try {
    showSpinner();
    
    // Reset pagination state for new report
    paginationState.sessions.currentPage = 1;
    paginationState.students.currentPage = 1;
    paginationState.invoices.currentPage = 1;
    
    const params = new URLSearchParams({
      teacherId: teacherId
    });
    
    if (start) params.append('startDate', start);
    if (end) params.append('endDate', end);
    
    const response = await fetch(`/admin/teacher-report-data?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update UI with data
    updateTeacherInfo(data.teacher, start, end);
    updateStatistics(data.summary);
    populateSessionsCards(data.sessionsData);
    populateStudentsCards(data.studentsData);
    populateInvoicesCards(data.invoicesData);
    // Also populate tables for toggle functionality
    populateSessionsTable(data.sessionsData);
    populateStudentsTable(data.studentsData);
    populateInvoicesTable(data.invoicesData);
    
    // Initialize tooltips after content is loaded
    initializeTooltips();
    
    showToast('success', 'Report generated successfully');
    
  } catch (error) {
    console.error('Error generating report:', error);
    showToast('error', 'Error generating report');
  } finally {
    hideSpinner();
  }
}

// Download Excel
async function downloadExcel() {
  const teacherId = teacherSelect.value;
  const start = startDate.value;
  const end = endDate.value;
  
  if (!teacherId) {
    showToast('error', 'Please select a teacher first');
    return;
  }
  
  try {
    showSpinner();
    
    const params = new URLSearchParams({
      teacherId: teacherId
    });
    
    if (start) params.append('startDate', start);
    if (end) params.append('endDate', end);
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = `/admin/download-teacher-excel?${params.toString()}`;
    link.download = 'teacher-report.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('success', 'Excel file downloaded successfully');
    
  } catch (error) {
    console.error('Error downloading Excel:', error);
    showToast('error', 'Error downloading Excel file');
  } finally {
    hideSpinner();
  }
}

// Toggle view functions
function toggleSessionsView() {
  const cardsView = document.getElementById('sessionsCardsView');
  const tableView = document.getElementById('sessionsTableView');
  const cardsPagination = document.getElementById('sessionsCardsPagination');
  const tablePagination = document.getElementById('sessionsPagination');
  
  if (cardsView.style.display === 'none') {
    cardsView.style.display = 'grid';
    tableView.style.display = 'none';
    if (cardsPagination) cardsPagination.style.display = 'block';
    if (tablePagination) tablePagination.style.display = 'none';
  } else {
    cardsView.style.display = 'none';
    tableView.style.display = 'block';
    if (cardsPagination) cardsPagination.style.display = 'none';
    if (tablePagination) tablePagination.style.display = 'block';
  }
}
 
function toggleStudentsView() {
  const cardsView = document.getElementById('studentsCardsView');
  const tableView = document.getElementById('studentsTableView');
  const cardsPagination = document.getElementById('studentsCardsPagination');
  const tablePagination = document.getElementById('studentsPagination');
  
  if (cardsView.style.display === 'none') {
    cardsView.style.display = 'grid';
    tableView.style.display = 'none';
    if (cardsPagination) cardsPagination.style.display = 'block';
    if (tablePagination) tablePagination.style.display = 'none';
  } else {
    cardsView.style.display = 'none';
    tableView.style.display = 'block';
    if (cardsPagination) cardsPagination.style.display = 'none';
    if (tablePagination) tablePagination.style.display = 'block';
  }
}
 
function toggleInvoicesView() {
  const cardsView = document.getElementById('invoicesCardsView');
  const tableView = document.getElementById('invoicesTableView');
  const cardsPagination = document.getElementById('invoicesCardsPagination');
  const tablePagination = document.getElementById('invoicesPagination');
  
  if (cardsView.style.display === 'none') {
    cardsView.style.display = 'grid';
    tableView.style.display = 'none';
    if (cardsPagination) cardsPagination.style.display = 'block';
    if (tablePagination) tablePagination.style.display = 'none';
  } else {
    cardsView.style.display = 'none';
    tableView.style.display = 'block';
    if (cardsPagination) cardsPagination.style.display = 'none';
    if (tablePagination) tablePagination.style.display = 'block';
  }
}
 
// View session details function
function viewSessionDetails(sessionId) {
  // Navigate to attendance details page
  window.location.href = `/admin/attendance-details?id=${sessionId}`;
}

// Event listeners
generateReportBtn.addEventListener('click', generateReport);
downloadExcelBtn.addEventListener('click', downloadExcel);
document.getElementById('toggleSessionsView').addEventListener('click', toggleSessionsView);
document.getElementById('toggleStudentsView').addEventListener('click', toggleStudentsView);
document.getElementById('toggleInvoicesView').addEventListener('click', toggleInvoicesView);

// Load teachers on page load
document.addEventListener('DOMContentLoaded', loadTeachers);

// Add performance indicators to statistics cards
function addPerformanceIndicators(summary) {
  const totalSessionsCard = document.querySelector('#totalSessions').closest('.stats-card');
  const totalStudentsCard = document.querySelector('#totalStudents').closest('.stats-card');
  const totalAmountCard = document.querySelector('#totalAmount').closest('.stats-card');
  const totalCenterFeesCard = document.querySelector('#totalCenterFees').closest('.stats-card');
  const totalInvoicesCard = document.querySelector('#totalInvoices').closest('.stats-card');
  const totalNetProfitCard = document.querySelector('#totalNetProfit').closest('.stats-card');
  
  // Remove existing indicators
  document.querySelectorAll('.performance-indicator').forEach(indicator => indicator.remove());
  
  // Add performance indicators based on data
  if (summary.totalSessions > 0) {
    const sessionsIndicator = getPerformanceIndicator(summary.totalSessions, 50, 100, 150);
    totalSessionsCard.appendChild(sessionsIndicator);
  }
  
  if (summary.totalStudents > 0) {
    const studentsIndicator = getPerformanceIndicator(summary.totalStudents, 100, 500, 1000);
    totalStudentsCard.appendChild(studentsIndicator);
  }
  
  if (summary.totalAmount > 0) {
    const amountIndicator = getPerformanceIndicator(summary.totalAmount, 50000, 200000, 500000);
    totalAmountCard.appendChild(amountIndicator);
  }
  
  if (summary.totalCenterFees > 0) {
    const feesIndicator = getPerformanceIndicator(summary.totalCenterFees, 10000, 50000, 100000);
    totalCenterFeesCard.appendChild(feesIndicator);
  }
  
  if (summary.totalInvoices > 0) {
    const invoicesIndicator = getPerformanceIndicator(summary.totalInvoices, 5000, 25000, 50000);
    totalInvoicesCard.appendChild(invoicesIndicator);
  }
  
  if (summary.totalNetProfit > 0) {
    const profitIndicator = getPerformanceIndicator(summary.totalNetProfit, 25000, 100000, 250000);
    totalNetProfitCard.appendChild(profitIndicator);
  }
}

// Get performance indicator based on value and thresholds
function getPerformanceIndicator(value, poorThreshold, averageThreshold, goodThreshold) {
  const indicator = document.createElement('div');
  indicator.className = 'performance-indicator';
  
  if (value >= goodThreshold) {
    indicator.classList.add('excellent');
    indicator.innerHTML = '<i class="material-symbols-rounded me-1" style="font-size: 14px;">trending_up</i>Excellent';
  } else if (value >= averageThreshold) {
    indicator.classList.add('good');
    indicator.innerHTML = '<i class="material-symbols-rounded me-1" style="font-size: 14px;">trending_flat</i>Good';
  } else if (value >= poorThreshold) {
    indicator.classList.add('average');
    indicator.innerHTML = '<i class="material-symbols-rounded me-1" style="font-size: 14px;">trending_down</i>Average';
  } else {
    indicator.classList.add('poor');
    indicator.innerHTML = '<i class="material-symbols-rounded me-1" style="font-size: 14px;">warning</i>Poor';
  }
  
  return indicator;
}

// Initialize tooltips
function initializeTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

// Pagination helper functions
function getPaginatedData(data, page, pageSize) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return data.slice(startIndex, endIndex);
}

function calculatePagination(totalItems, pageSize) {
  return {
    totalPages: Math.ceil(totalItems / pageSize),
    totalItems: totalItems
  };
}

function createPaginationControls(containerId, type, currentPage, totalPages, totalItems, pageSize) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  // Always show pagination info, even if only one page
  if (totalPages <= 1) {
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="d-flex align-items-center">
          <span class="text-muted me-3">Showing ${totalItems} of ${totalItems} entries</span>
          <select class="form-select form-select-sm me-3" style="width: auto;" onchange="changePageSize('${type}', this.value)">
            ${PAGINATION_CONFIG.pageSizeOptions.map(size => 
              `<option value="${size}" ${size === pageSize ? 'selected' : ''}>${size} per page</option>`
            ).join('')}
          </select>
        </div>
        <div class="text-muted">Page 1 of 1</div>
      </div>
    `;
    return;
  }
  
  const paginationHtml = `
    <div class="d-flex justify-content-between align-items-center mt-3">
      <div class="d-flex align-items-center">
        <span class="text-muted me-3">Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} entries</span>
        <select class="form-select form-select-sm me-3" style="width: auto;" onchange="changePageSize('${type}', this.value)">
          ${PAGINATION_CONFIG.pageSizeOptions.map(size => 
            `<option value="${size}" ${size === pageSize ? 'selected' : ''}>${size} per page</option>`
          ).join('')}
        </select>
      </div>
      <nav aria-label="Pagination">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage('${type}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
              <i class="material-symbols-rounded" style="font-size: 16px;">chevron_left</i>
            </button>
          </li>
          
          ${generatePageNumbers(currentPage, totalPages)}
          
          <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage('${type}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
              <i class="material-symbols-rounded" style="font-size: 16px;">chevron_right</i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  `;
  
  container.innerHTML = paginationHtml;
 
  // Ensure the container is visible
  container.style.display = 'block';
}

function generatePageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show smart pagination
    if (currentPage <= 3) {
      // Near start
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Near end
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Middle
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }
  }
  
  return pages.map(page => {
    if (page === '...') {
      return '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    return `
      <li class="page-item ${page === currentPage ? 'active' : ''}">
        <button class="page-link" onclick="changePage('${getCurrentType()}', ${page})">${page}</button>
      </li>
    `;
  }).join('');
}

function getCurrentType() {
  // Determine which type is currently active based on visible sections
  if (sessionsSection.style.display !== 'none') return 'sessions';
  if (studentsSection.style.display !== 'none') return 'students';
  if (invoicesSection.style.display !== 'none') return 'invoices';
  return 'sessions';
}

function changePage(type, page) {
  if (page < 1 || page > paginationState[type].totalPages) return;
  
  paginationState[type].currentPage = page;
  
  switch (type) {
    case 'sessions':
      populateSessionsTable(currentData.sessions);
      populateSessionsCards(currentData.sessions);
      break;
    case 'students':
      populateStudentsTable(currentData.students);
      populateStudentsCards(currentData.students);
      break;
    case 'invoices':
      populateInvoicesTable(currentData.invoices);
      populateInvoicesCards(currentData.invoices);
      break;
  }
}

function changePageSize(type, newPageSize) {
  paginationState[type].pageSize = parseInt(newPageSize);
  paginationState[type].currentPage = 1; // Reset to first page
  
  const pagination = calculatePagination(currentData[type].length, paginationState[type].pageSize);
  paginationState[type].totalPages = pagination.totalPages;
  
  switch (type) {
    case 'sessions':
      populateSessionsTable(currentData.sessions);
      populateSessionsCards(currentData.sessions);
      break;
    case 'students':
      populateStudentsTable(currentData.students);
      populateStudentsCards(currentData.students);
      break;
    case 'invoices':
      populateInvoicesTable(currentData.invoices);
      populateInvoicesCards(currentData.invoices);
      break;
  }
}
