const spinner = document.getElementById('spinner');
const tBody = document.getElementById('tBody');
const invoiceTBody = document.getElementById('invoiceTBody');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const filterSection = document.getElementById('filterSection');
const sessionsListSection = document.getElementById('sessionsListSection');
const sessionDetailsSection = document.getElementById('sessionDetailsSection');
const searchBtn = document.getElementById('searchBtn');

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

// Load teachers for filter dropdown
async function loadTeachers() {
  try {
    const response = await fetch('/admin/teachers');
    if (response.ok) {
      const teachers = await response.json();
      const teacherSelect = document.getElementById('filterTeacher');
      
      teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher._id;
        option.textContent = teacher.teacherName;
        teacherSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading teachers:', error);
  }
}

// Show filter mode
function showFilterMode() {
  filterSection.style.display = 'block';
  sessionsListSection.style.display = 'block';
  sessionDetailsSection.style.display = 'none';
  loadTeachers();
}

// Show details mode
function showDetailsMode() {
  filterSection.style.display = 'none';
  sessionsListSection.style.display = 'none';
  sessionDetailsSection.style.display = 'block';
}

// Search sessions
async function searchSessions() {
  try {
    spinner.classList.remove('d-none');
    
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const teacher = document.getElementById('filterTeacher').value;
    const status = document.getElementById('filterStatus').value;
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (teacher) params.append('teacher', teacher);
    if (status) params.append('collected', status);
    
    const response = await fetch(`/admin/center-fees-data?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    populateSessionsList(data.records);
    
  } catch (error) {
    console.error('Error searching sessions:', error);
    showToast('error', 'Error searching sessions');
  } finally {
    spinner.classList.add('d-none');
  }
}

// Populate sessions list
function populateSessionsList(records) {
  const sessionsList = document.getElementById('sessionsList');
  sessionsList.innerHTML = '';
  
  if (!records || records.length === 0) {
    sessionsList.innerHTML = `
      <div class="col-12 text-center">
        <h6 class="text-muted">No attendance sessions found</h6>
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
                <strong title="${record.employeeName}">${record.employeeName.length > 15 ? record.employeeName.substring(0, 15) + '...' : record.employeeName}</strong>
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
          
          <div class="text-center">
            <button class="btn btn-sm details-btn" onclick="viewDetails('${record._id}')">
              <i class="material-symbols-rounded text-sm">visibility</i> View Details
            </button>
          </div>
        </div>
      </div>
    `;
    
    sessionsList.appendChild(card);
  });
}

// Load attendance details
async function loadAttendanceDetails() {
  try {
    spinner.classList.remove('d-none');
    
    // Get attendance ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const attendanceId = urlParams.get('id');
    
    if (!attendanceId) {
      // Show filter mode if no specific attendance ID
      showFilterMode();
      return;
    }
    
    // Show details mode for specific attendance
    showDetailsMode();
    
    const response = await fetch(`/admin/attendance-details/${attendanceId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update session information
    updateSessionInfo(data);
    
    // Populate students table
    populateStudentsTable(data.studentsPresent);
    
    // Populate invoices table
    populateInvoicesTable(data.invoices);
    
  } catch (error) {
    console.error('Error loading attendance details:', error);
    showToast('error', 'Error loading attendance details');
  } finally {
    spinner.classList.add('d-none');
  }
}

// Update session information card
function updateSessionInfo(data) {
  document.getElementById('teacherName').textContent = data.teacher?.teacherName || 'Unknown';
  document.getElementById('courseName').textContent = data.course || 'Unknown';
  document.getElementById('sessionDate').textContent = formatDate(data.createdAt);
  document.getElementById('totalStudents').textContent = data.studentsPresent?.length || 0;
  document.getElementById('totalAmount').textContent = formatCurrency(data.totalAmount);
  
  // Calculate center fees
  const centerFees = data.studentsPresent?.reduce((sum, student) => {
    return sum + (student.feesApplied || 0);
  }, 0) || 0;
  document.getElementById('centerFees').textContent = formatCurrency(centerFees);
  
  // Get employee name
  // Collect all unique employees who participated
  const employeeIds = new Set();
  const employeeNames = [];
  
  // Add finalizedBy employee if exists
  if (data.finalizedBy?._id) {
    employeeIds.add(data.finalizedBy._id.toString());
    employeeNames.push(data.finalizedBy.employeeName);
  }
  
  // Add all employees who added students
  data.studentsPresent?.forEach(student => {
    if (student.addedBy?._id) {
      const employeeId = student.addedBy._id.toString();
      if (!employeeIds.has(employeeId)) {
        employeeIds.add(employeeId);
        employeeNames.push(student.addedBy.employeeName);
      }
    }
  });
  
  // Add all employees who created invoices
  data.invoices?.forEach(invoice => {
    if (invoice.addedBy?._id) {
      const employeeId = invoice.addedBy._id.toString();
      if (!employeeIds.has(employeeId)) {
        employeeIds.add(employeeId);
        employeeNames.push(invoice.addedBy.employeeName);
      }
    }
  });
  
  const employeeName = employeeNames.length > 0 ? employeeNames.join(', ') : 'Unknown';
  document.getElementById('employeeName').textContent = employeeName;
  
  // Collection status
  const status = data.centerFeesCollected ? 'Collected' : 'Pending';
  const statusElement = document.getElementById('collectionStatus');
  statusElement.textContent = status;
  if (data.centerFeesCollected) {
    statusElement.className = 'info-value';
    statusElement.style.color = '#000000';
    statusElement.style.fontWeight = 'bold';
  } else {
    statusElement.className = 'info-value';
    statusElement.style.color = '#666666';
    statusElement.style.fontStyle = 'italic';
  }
}

// Populate students table
function populateStudentsTable(students) {
  tBody.innerHTML = '';
  
  if (!students || students.length === 0) {
    tBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">No students found</td>
      </tr>
    `;
    return;
  }
  
  students.forEach((student, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">${index + 1}</td>
      <td class="text-center">${student.student?.studentName || 'Unknown'}</td>
      <td class="text-center">${student.student?.studentCode || 'N/A'}</td>
      <td class="text-center">${student.student?.studentPhoneNumber || 'N/A'}</td>
      <td class="text-center">${student.student?.studentParentPhone || 'N/A'}</td>
      <td class="text-center" dir="ltr">${formatCurrency(student.amountPaid)}</td>
      <td class="text-center" dir="ltr">${formatCurrency(student.feesApplied)}</td>
      <td class="text-center">${student.addedBy?.employeeName || 'Unknown'}</td>
    `;
    tBody.appendChild(row);
  });
}

// Populate invoices table
function populateInvoicesTable(invoices) {
  invoiceTBody.innerHTML = '';
  
  if (!invoices || invoices.length === 0) {
    invoiceTBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">No invoices found</td>
      </tr>
    `;
    return;
  }
  
  invoices.forEach((invoice, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-center">${invoice.invoiceDetails}</td>
      <td class="text-center" dir="ltr">${formatCurrency(invoice.invoiceAmount)}</td>
      <td class="text-center">${invoice.time}</td>
      <td class="text-center">${invoice.addedBy?.employeeName || 'Unknown'}</td>
    `;
    invoiceTBody.appendChild(row);
  });
}

// Download Excel
async function downloadExcel() {
  try {
    spinner.classList.remove('d-none');
    downloadExcelBtn.innerHTML = 'Downloading...';
    
    const urlParams = new URLSearchParams(window.location.search);
    const attendanceId = urlParams.get('id');
    
    const response = await fetch(`/admin/download-attendance-excel/${attendanceId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    a.download = `attendance-details-${date}.xlsx`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showToast('success', 'Excel file downloaded successfully');
    
  } catch (error) {
    console.error('Error downloading Excel:', error);
    showToast('error', 'Error downloading Excel file');
  } finally {
    spinner.classList.add('d-none');
    downloadExcelBtn.innerHTML = '<i class="material-symbols-rounded text-sm">download</i>&nbsp;&nbsp;Download Excel';
  }
}

// Show toast notification
function showToast(type, message) {
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
  
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container position-fixed bottom-0 start-0 p-3';
  toastContainer.appendChild(toast);
  document.body.appendChild(toastContainer);
  
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  toast.addEventListener('hidden.bs.toast', () => {
    document.body.removeChild(toastContainer);
  });
}

// View attendance details
function viewDetails(recordId) {
  window.location.href = `/admin/attendance-details?id=${recordId}`;
}

// Event listeners
downloadExcelBtn.addEventListener('click', downloadExcel);
searchBtn.addEventListener('click', searchSessions);

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', loadAttendanceDetails);
