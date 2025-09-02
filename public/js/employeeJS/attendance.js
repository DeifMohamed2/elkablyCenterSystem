
const attendStudentForm = document.getElementById('attendStudentForm');
const searchStudent = document.getElementById('searchStudent');
const spinner = document.getElementById('spinner');
const studentTable = document.getElementById('studentTable');
const courseSelction = document.getElementById('courseSelction');
const reloadButton = document.getElementById('reloadButton');
const tBody = document.querySelector('#studentTable tbody');
const message = document.getElementById('message');
const totalAmount = document.getElementById('totalAmount');
const totalFees = document.getElementById('totalFees');
const totalStudents = document.getElementById('totalStudents');
const totalInvoices = document.getElementById('totalInvoices');
const netProfitToTeacher = document.getElementById('netProfit');
const invoiceForm = document.getElementById('invoiceForm');
const invoiceTBody = document.querySelector('#invoiceTable tbody');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const mockCheck = document.getElementById('mockCheck');

const deviceSelect = document.getElementById('deviceSelect');
let temp3Student = 0;
async function attendStudent(event) {
    event.preventDefault();
    
    // Show spinner and hide messages
    spinner.classList.remove('d-none');
    
    const formData = new FormData(attendStudentForm);
    
    const data = Object.fromEntries(formData);
    
    const courseSelection = courseSelction.value.split('_');
    data.teacherId = courseSelection[0];
    data.courseName = courseSelection[1];
    data.mockCheck = mockCheck.checked ? true : false;
    
    // Add fixed amount data if checkbox is checked
    const fixedAmountCheck = document.getElementById('fixedAmountCheck');
    const fixedAmount = document.getElementById('fixedAmount');
    
    if (fixedAmountCheck.checked && fixedAmount.value) {
      data.fixedAmountCheck = true;
      data.fixedAmount = parseFloat(fixedAmount.value);
      console.log('Fixed amount enabled:', {
        fixedAmountCheck: data.fixedAmountCheck,
        fixedAmount: data.fixedAmount,
        fixedAmountType: typeof data.fixedAmount
      });
    }
    try {
        const response = await fetch('/employee/attend-student', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        });
        const responseData = await response.json();
        console.log(responseData);
        if (response.ok) {
        addStudentsToTable(responseData.students , data.teacherId , data.courseName);    
        spinner.classList.add('d-none');
        attendStudentForm.reset();
      
        message.textContent = responseData.message;
        printReceipt(responseData.studentData);
          searchStudent.focus();
          if (responseData.studentData.amountRemaining > 0) {
            Swal.fire({
              icon: 'warning',
              title: 'مبلغ متبقي  ',
              html: `يوجد مبلغ متبقي علي الطالب <b>${responseData.studentData.studentName}</b> بقيمة <b>${responseData.studentData.amountRemaining}</b> جنيه`,
            });
          }
           temp3Student++;
          if(temp3Student == 5){
            getStudents();
            temp3Student = 0;
          }
    
        } else {
        spinner.classList.add('d-none');
        attendStudentForm.reset();
        
        // Check if student is blocked
        if (response.status === 403 && responseData.message === 'هذا الطالب محظور من المركز') {
          Swal.fire({
            icon: 'error',
            title: 'طالب محظور',
            html: `
              <p><strong>${responseData.message}</strong></p>
              <p><strong>سبب الحظر:</strong> ${responseData.blockReason || 'غير محدد'}</p>
              <p><strong>تاريخ الحظر:</strong> ${responseData.blockedAt ? new Date(responseData.blockedAt).toLocaleDateString() : 'غير محدد'}</p>
            `,
            confirmButtonText: 'حسناً'
          });
        } else {
          message.textContent = responseData.message;
        }
        
        searchStudent.focus();
         
        }
    } catch (error) {
        attendStudentForm.reset();
        searchStudent.focus();
        spinner.classList.add('d-none');
        console.error('Error attending student:', error);
    }
}

attendStudentForm.addEventListener('submit', attendStudent);

// Manage QZ Tray connection globally
let isQzConnected = false;

// Disconnect QZ Tray on page unload
window.addEventListener('beforeunload', () => {
    if (isQzConnected) {
        qz.websocket.disconnect()
            .then(() => console.log('QZ Tray disconnected on page unload.'))
            .catch((error) => console.error('Error disconnecting from QZ Tray:', error));
    }
});

function printReceipt(data = {}) {
  const {
    attendanceCount = 0,
    studentName = 'N/A',
    studentTeacher = {},
    amountPaid = 0,
    studentCode = 'N/A',
    date = new Date().toLocaleDateString() +
      ' ' +
      new Date().toLocaleTimeString(),
  } = data;

  // English labels for the receipt
  const englishLabels = {
    title: 'GTA CENTER',
    phone: '01092257120', // Example phone number
    date: 'Date',
    teacherName: 'Teacher Name',
    courseName: 'Course Name',
    studentName: 'Student Name',
    studentCode: 'Student Code',
    amountPaid: 'Amount Paid',
    thankYou: 'Thank you for choosing our GTA Center!',
  };

  // ESC/POS Printer Commands
  const ESC_ALIGN_CENTER = '\x1B\x61\x01'; // Center align
  const ESC_BOLD = '\x1B\x45\x01'; // Bold text
  const ESC_DOUBLE_SIZE = '\x1B\x21\x30'; // Double font size
  const ESC_NORMAL_SIZE = '\x1B\x21\x00'; // Normal font size
  const ESC_CUT = '\x1D\x56\x42\x00'; // Full paper cut
  const ESC_FEED_LINE = '\x0A'; // Line feed
  const ESC_RESET = '\x1B\x40'; // Reset printer

  const lineSeparator = '-'.repeat(49); // Table line separator
  const headerSeparator = '='.repeat(49); // Bold section separator

  function formatTableRow(field, value) {
    const totalWidth = 48;
    const left = field.padEnd(22, ' ');
    const right = value.toString().padStart(22, ' ');
    return `| ${left}|${right} |`;
  }

  // Build receipt content
  const receiptContent =
    ESC_RESET +
    ESC_ALIGN_CENTER +
    ESC_BOLD +
    ESC_DOUBLE_SIZE +
    englishLabels.title +
    ESC_FEED_LINE +
    ESC_NORMAL_SIZE +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
    englishLabels.phone +
    ESC_FEED_LINE +
    ESC_FEED_LINE +
    headerSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.date, date) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(
      englishLabels.teacherName,
      studentTeacher?.teacherName || 'N/A'
    ) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(
      englishLabels.courseName,
      studentTeacher?.subjectName || 'N/A'
    ) +
    ESC_FEED_LINE +
    headerSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.studentName, studentName) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.studentCode, studentCode) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.amountPaid, `${amountPaid} EGP`) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow('Sessions Count', attendanceCount) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
    ESC_BOLD +
    ESC_NORMAL_SIZE +
    englishLabels.thankYou +
    ESC_FEED_LINE +
    ESC_FEED_LINE;

  console.log('Printing receipt:', receiptContent);

  // Print receipt
  if (!isQzConnected) {
    message.textContent =
      'QZ Tray is not connected. Please connect and try again.';
    return;
  }

  const config = qz.configs.create('XP-80C'); // Replace with your printer name
  const printData = [
    { type: 'raw', format: 'command', data: receiptContent },
    { type: 'raw', format: 'command', data: ESC_CUT }, // Cut paper
  ];

  qz.print(config, printData)
    .then(() => console.log('Receipt printed successfully.'))
    .catch((error) => console.error('Print error:', error));
}



const getStudents = async () => {
    try {
    tBody.innerHTML = '';
    totalAmount.textContent = '0 EGP';
    totalFees.textContent = '0 EGP';
    totalStudents.textContent = '0';
    spinner.classList.remove('d-none');
    const courseSelection = courseSelction.value.split('_');
    teacherId = courseSelection[0];
    courseName = courseSelection[1];
    const response = await fetch(`/employee/get-attended-students?teacherId=${teacherId}&courseName=${courseName}`);
    const responseData = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // const responseData = await response.json();

    // Populate table
    addStudentsToTable(responseData.students , teacherId , courseName);
    addInvoicesToTable(responseData.invoices);
    spinner.classList.add('d-none');
    searchStudent.focus();
    message.textContent = responseData.message;
    totalAmount.textContent = responseData.totalAmount +' EGP';
    totalFees.textContent = responseData.totalFees+' EGP';
    totalStudents.textContent = responseData.students.length;
    totalInvoices.textContent = responseData.totalInvoiceAmount;
    netProfitToTeacher.textContent = responseData.netProfitToTeacher.amount+ ' EGP';

    setTimeout(() => {
        message.textContent = '';
    },3000)
    } catch (error) {
    console.error('Error fetching students:', error);
    spinner.classList.add('d-none');
    searchStudent.focus();
    message.textContent = 'لم يتم تسجيل اي طلاب اليوم';
    }


    qz.websocket
      .connect()
      .then(() => {
        console.log('QZ Tray connected on page load.');
        isQzConnected = true;
      })
      .catch((error) => console.error('Error connecting to QZ Tray:', error));
}

// Reload button
reloadButton.addEventListener('click', getStudents);
courseSelction.addEventListener('change', getStudents);


// Function to add students to the tbody

const addStudentsToTable = (students, teacherId, courseName) => {
    tBody.innerHTML = '';
     students.forEach((student) => {
       // Find the specific course data
       const courseData = student.student.selectedTeachers
         .find((t) => t.teacherId.toString() === teacherId)
         ?.courses.find((c) => c.courseName === courseName);

       const tr = document.createElement('tr');
      // Add payment type indicator
      const paymentType = student.student.paymentType;
      const paymentTypeBadge = paymentType === 'perCourse' ? 
        '<span class="badge bg-warning text-dark">Per Course</span>' : 
        '<span class="badge bg-info text-white">Per Session</span>';
      
      tr.innerHTML = `
            <td class="text-center">${student.student.studentName}</td>
            <td class="text-center">${student.student.studentCode}</td>
            <td class="text-center">${student.student.studentPhoneNumber}</td>
            <td class="text-center">${student.student.studentParentPhone}</td>
            <td class="text-center">
              <div class="d-flex flex-column align-items-center">
                ${paymentType === 'perCourse' ? `${paymentTypeBadge}<br>` : ''}
              <input type="text" class="amountPaid" 
                   value="${student.amountPaid}"
                   data-student-id="${student.student._id}"
                   data-teacher-id="${teacherId}"
                   data-course-name="${courseName}">
              </div>
            </td>
            <td class="text-center">
              <input type="text" class="amountRemaining" 
                   value="${courseData?.amountRemaining || 0}"
                   data-student-id="${student.student._id}"
                   data-teacher-id="${teacherId}"
                   data-course-name="${courseName}">
            </td>
            <td class="text-center">${
              student.attendanceCount || 'Waiting for refresh'
            }</td>
            <td class="text-center">
              <button class="btn btn-primary btn-sm edit-amount">Edit</button>
            </td>
            <td class="text-center">
              <button class="btn btn-danger btn-sm delete">Delete</button>
            </td>
            <td class="text-center">${student.addedBy.employeeName}</td>
          `;

       // Event listeners
       tr.querySelector('.edit-amount').addEventListener('click', (event) => {
         // Get tr reference from event target
         const row = event.target.closest('tr');
         const input = row.querySelector('.amountRemaining');
          const amountPaidInput = row.querySelector('.amountPaid');
         const studentId = input.dataset.studentId;
         const teacherId = input.dataset.teacherId;
         const courseName = input.dataset.courseName;
         const amount = input.value;
          const amountPaid = amountPaidInput.value;

         editStudentAmountRemainingAndAmountPaid(studentId, amount,amountPaid, teacherId, courseName);
       });

       tr.querySelector('.delete').addEventListener('click', (event) => {
         const row = event.target.closest('tr');
         const studentId =
           row.querySelector('.amountRemaining').dataset.studentId;
         deleteStudent(studentId , teacherId , courseName);
       });

       // Event listeners remain the same
       tBody.appendChild(tr);
     });
};

// Function to delete student

async function deleteStudent(studentId , teacherId , courseName) {
    try {
        
        spinner.classList.remove('d-none');
        const response = await fetch(`/employee/delete-attend-student/${studentId}?teacherId=${teacherId}&courseName=${courseName}`, {
          method: 'DELETE',
        });
        const responseData = await response.json();
        if (response.ok) {
        console.log(responseData.students);
        getStudents();
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = responseData.message
        } else {
        alert(responseData.message);
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = responseData.message
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = 'An error occurred. Please try again later.';
    }
}

async function editStudentAmountRemainingAndAmountPaid(studentId, amount,amountPaid, teacherId, courseName) {
    try {
        const response = await fetch(`/employee/edit-student-amount-remaining-and-paid/${studentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amountRemaining: amount,
                amountPaid,
                teacherId,
                courseName
            }),
        });
        const responseData = await response.json();
        if (response.ok) {
        console.log(responseData.students);
        // addStudentsToTable(responseData.students);
        getStudents();
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = responseData.message;
        } else {
        alert(responseData.message);
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = responseData.message;
        }
    } catch (error) {
        console.error('Error editing amount:', error);
        searchStudent.focus();
        spinner.classList.add('d-none');
        message.textContent = 'An error occurred. Please try again later.';
    }
}

// download Excel File

downloadExcelBtn.addEventListener('click', async () => {
    try {
        downloadExcelBtn.innerHTML = 'جاري التحميل...';
        const courseSelection = courseSelction.value.split('_');
        const teacherId = courseSelection[0];
        const courseName = courseSelection[1];
        const response = await fetch(`/employee/download-attendance-excel?teacherId=${teacherId}&courseName=${courseName}`);
        if (!response.ok) {
   
        throw new Error('Failed to download excel file');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toLocaleDateString().replace(/\//g, '-');
        a.download = `كشف حضور الطلاب - ${date}.xlsx`;
        a.click();
        downloadExcelBtn.innerHTML = '<i class="material-symbols-rounded text-sm">download</i>&nbsp;&nbsp;Download Excel And Send Copy';
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading excel file:', error);
    }
});

// Device Select

deviceSelect.addEventListener('change', async (event) => {
  const selectedDevice = event.target.value;
  try {
    const response = await fetch(`/employee/select-device/${selectedDevice}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error('Failed to select device');
    }
  
    window.location.reload();

  } catch (error) {
    console.error('Error selecting device:', error);
  }
});


// Add Invoice

invoiceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  spinner.classList.remove('d-none');
  const formData = new FormData(invoiceForm);
  const data = Object.fromEntries(formData);
  const courseSelection = courseSelction.value.split('_');
  data.teacherId = courseSelection[0];
  data.courseName = courseSelection[1];
  try {
    const response = await fetch('/employee/add-teacher-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (response.ok) {
      spinner.classList.add('d-none');
      invoiceForm.reset();
      message.textContent = responseData.message;
      searchStudent.focus();
      getStudents();
    } else {
      spinner.classList.add('d-none');
      invoiceForm.reset();
      message.textContent = responseData.message;
      searchStudent.focus();
      getStudents();
    }
  } catch (error) {
    invoiceForm.reset();
    searchStudent.focus();
    spinner.classList.add('d-none');
    console.error('Error adding invoice:', error);
  }
});


// Function to add invoices to the table


const addInvoicesToTable = (invoices) => {
  invoiceTBody.innerHTML = '';
  invoices.forEach((invoice) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center invoice-details">${invoice.invoiceDetails}</td>
      <td class="text-center invoice-amount">${invoice.invoiceAmount}</td>
      <td class="text-center">${invoice.time}</td>
      <td class="text-center">${invoice.addedBy.employeeName}</td>
      <td class="text-center">
        <button class="btn btn-primary btn-sm edit-invoice">Edit</button>
        <button class="btn btn-danger btn-sm delete-invoice">Delete</button>
      </td>
    `;

    const deleteButton = tr.querySelector('.delete-invoice');
    deleteButton.addEventListener('click', async () => {
      deleteButton.textContent = '...Deleting';
      await deleteInvoice(invoice._id);
      deleteButton.textContent = 'Delete';
    });

    const editButton = tr.querySelector('.edit-invoice');
    editButton.addEventListener('click', () => handleEdit(invoice, tr));

    invoiceTBody.appendChild(tr);
  });
};

const handleEdit = (invoice, tr) => {
  const detailsCell = tr.querySelector('.invoice-details');
  const amountCell = tr.querySelector('.invoice-amount');
  const editButton = tr.querySelector('.edit-invoice');

  // Replace text with input fields
  detailsCell.innerHTML = `<input type="text" class="form-control text-center" style="border:1px solid #000;" value="${invoice.invoiceDetails}" />`;
  amountCell.innerHTML = `<input type="number" class="form-control text-center w-25" style="border:1px solid #000;" value="${invoice.invoiceAmount}" />`;

  editButton.textContent = 'Update';
  editButton.classList.remove('edit-invoice');
  editButton.classList.add('update-invoice');

  // Remove previous event listeners to prevent multiple bindings
  editButton.replaceWith(editButton.cloneNode(true));
  const newUpdateButton = tr.querySelector('.update-invoice');

  newUpdateButton.addEventListener('click', async () => {
    const updatedDetails = detailsCell.querySelector('input').value;
    const updatedAmount = amountCell.querySelector('input').value;

    await updateInvoice(invoice._id, updatedDetails, updatedAmount);

    detailsCell.textContent = updatedDetails;
    amountCell.textContent = updatedAmount;

    newUpdateButton.textContent = 'Edit';
    newUpdateButton.classList.remove('update-invoice');
    newUpdateButton.classList.add('edit-invoice');

    // Reattach edit event listener
    newUpdateButton.addEventListener('click', () => handleEdit(invoice, tr));
  });
};

async function updateInvoice(invoiceId, invoiceDetails, invoiceAmount) {
  try {
    console.log(invoiceId, invoiceDetails, invoiceAmount);
    spinner.classList.remove('d-none');
    const response = await fetch(`/employee/update-invoice/${invoiceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invoiceDetails, invoiceAmount }),
    });
    const responseData = await response.json();
    if (response.ok) {
      spinner.classList.add('d-none');
      message.textContent = responseData.message;
      getStudents();
    } else {
      alert(responseData.message);
      spinner.classList.add('d-none');
      message.textContent = responseData.message;
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    spinner.classList.add('d-none');
    message.textContent = 'An error occurred. Please try again later.';
  }
}


async function deleteInvoice(invoiceId) {
  try {
    spinner.classList.remove('d-none');
    const response = await fetch(`/employee/delete-invoice/${invoiceId}`, {
      method: 'DELETE',
    });
    const responseData = await response.json();
    if (response.ok) {
      spinner.classList.add('d-none');
      message.textContent = responseData.message;
      getStudents();
    } else {
      alert(responseData.message);
      spinner.classList.add('d-none');
      message.textContent = responseData.message;
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    spinner.classList.add('d-none');
    message.textContent = 'An error occurred. Please try again later.';
  }
}


// Function to convert table to Excel sheet
function tableToExcel() {
  const table = document.getElementById('studentTable');
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const headers = ['#', 'Student Name', 'Parent Phone', 'Student Code'];

  const data = rows.map((row, index) => {
    const cells = row.querySelectorAll('td');
    return [
      index + 1,
      cells[0].textContent,
      cells[3].textContent,
      cells[1].textContent,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Style headers
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
    cell.s = {
      fill: {
        fgColor: { rgb: 'FFFF00' },
      },
      font: {
        bold: true,
      },
    };
  }

  XLSX.writeFile(workbook, 'Student_Attendance.xlsx');
}

// Add event listener to download Excel button
document.getElementById('AssistantExcelBtn').addEventListener('click', tableToExcel);

// Quick Notifications Functionality
document.addEventListener('DOMContentLoaded', function() {
  const quickNotificationType = document.getElementById('quickNotificationType');
  const quickNotificationFilter = document.getElementById('quickNotificationFilter');
  const quickNotificationMessage = document.getElementById('quickNotificationMessage');
  const sendQuickNotificationsBtn = document.getElementById('sendQuickNotificationsBtn');
  const quickNotificationStatus = document.getElementById('quickNotificationStatus');

  // Update message when type changes
  quickNotificationType?.addEventListener('change', function() {
    updateQuickNotificationMessage();
  });

  // Update message when filter changes
  quickNotificationFilter?.addEventListener('change', function() {
    updateQuickNotificationMessage();
  });

  // Send quick notifications
  sendQuickNotificationsBtn?.addEventListener('click', function() {
    sendQuickNotifications();
  });

  function updateQuickNotificationMessage() {
    const type = quickNotificationType?.value;
    const filter = quickNotificationFilter?.value;
    
    let defaultMessage = '';
    
    if (type === 'balance') {
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م في كورس {courseName} مع الأستاذ {teacherName}. يرجى التواصل معنا لتسديد المبلغ المتبقي.';
    } else if (type === 'installment') {
      defaultMessage = 'مرحباً {studentName}، يتبقى مبلغ {amountRemaining} ج.م من إجمالي {totalCourseCost} ج.م في كورس {courseName}. يرجى التواصل معنا لدفع القسط التالي.';
    }
    
    if (defaultMessage && quickNotificationMessage) {
      quickNotificationMessage.value = defaultMessage;
    }
  }

  async function sendQuickNotifications() {
    const type = quickNotificationType?.value;
    const filter = quickNotificationFilter?.value;
    const message = quickNotificationMessage?.value;

    if (!message || !message.trim()) {
      showQuickNotificationToast('يرجى كتابة الرسالة', 'error');
      return;
    }

    // Get students based on filter
    let students = [];
    
    try {
      let endpoint = '';
      switch (filter) {
        case 'withBalances':
          endpoint = '/employee/api/students-with-balances';
          break;
        case 'perCourse':
          endpoint = '/employee/api/students-with-balances?paymentType=perCourse';
          break;
        case 'perSession':
          endpoint = '/employee/api/students-with-balances?paymentType=perSession';
          break;
        case 'all':
        default:
          endpoint = '/employee/api/students-with-balances';
          break;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        students = data.students;
      } else {
        throw new Error(data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showQuickNotificationToast('فشل في جلب بيانات الطلاب', 'error');
      return;
    }

    if (students.length === 0) {
      showQuickNotificationToast('لا يوجد طلاب للرسالة المحددة', 'warning');
      return;
    }

    // Confirm sending
    const confirmed = await showQuickNotificationConfirmation(
      `هل أنت متأكد من إرسال ${students.length} إشعار؟`,
      'إرسال الإشعارات السريعة'
    );

    if (!confirmed) return;

    // Show loading
    sendQuickNotificationsBtn.disabled = true;
    sendQuickNotificationsBtn.innerHTML = '<i class="material-symbols-rounded text-sm me-1">hourglass_empty</i>جاري الإرسال...';
    quickNotificationStatus.textContent = 'جاري الإرسال...';

    try {
      const response = await fetch('/employee/send-bulk-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: students,
          message: message,
          notificationType: type
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showQuickNotificationToast(data.message, 'success');
        quickNotificationStatus.textContent = data.message;
        quickNotificationMessage.value = '';
      } else {
        throw new Error(data.message || 'Failed to send notifications');
      }
    } catch (error) {
      console.error('Error sending quick notifications:', error);
      showQuickNotificationToast('فشل في إرسال الإشعارات', 'error');
      quickNotificationStatus.textContent = 'فشل في الإرسال';
    } finally {
      // Reset button
      sendQuickNotificationsBtn.disabled = false;
      sendQuickNotificationsBtn.innerHTML = '<i class="material-symbols-rounded text-sm me-1">send</i>إرسال إشعارات سريعة';
    }
  }

  function showQuickNotificationToast(message, type = 'info') {
    if (type === 'success') {
      Swal.fire({
        icon: 'success',
        title: 'نجح',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    } else if (type === 'error') {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    } else if (type === 'warning') {
      Swal.fire({
        icon: 'warning',
        title: 'تحذير',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'معلومات',
        text: message,
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  async function showQuickNotificationConfirmation(message, title = 'تأكيد') {
    const result = await Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء'
    });
    
    return result.isConfirmed;
  }

  // Initialize default message
  updateQuickNotificationMessage();
});