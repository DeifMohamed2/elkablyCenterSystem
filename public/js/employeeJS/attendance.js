
const attendStudentForm = document.getElementById('attendStudentForm');
const searchStudent = document.getElementById('searchStudent');
const spinner = document.getElementById('spinner');
const studentTable = document.getElementById('studentTable');
const reloadButton = document.getElementById('reloadButton');
const tBody = document.querySelector('#studentTable tbody');
const message = document.getElementById('message');
const totalAmount = document.getElementById('totalAmount');
const totalFees = document.getElementById('totalFees');
const totalStudents = document.getElementById('totalStudents');
const teachersSummaryRow = document.getElementById('teachersSummaryRow');
const employeesSummaryRow = document.getElementById('employeesSummaryRow');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');

const deviceSelect = document.getElementById('deviceSelect');

async function attendStudent(event) {
    event.preventDefault();
    
    // Show spinner and hide messages
    spinner.classList.remove('d-none');
    
    const formData = new FormData(attendStudentForm);
    
    const data = Object.fromEntries(formData);
    console.log(data);
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
        addStudentsToTable(responseData.students);    
        spinner.classList.add('d-none');
        attendStudentForm.reset();
      
        message.textContent = responseData.message;
        console.log(responseData.studentData);
        printReceipt(responseData.studentData);
          searchStudent.focus();
        } else {
        spinner.classList.add('d-none');
      attendStudentForm.reset();
        message.textContent = responseData.message;
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
    studentName = 'N/A',
    studentAmount = 0,
    date = new Date().toLocaleDateString() +
      ' ' +
      new Date().toLocaleTimeString(),
  } = data;

  // English labels for the receipt
  const englishLabels = {
    title: 'GTA CENTER',
    phone: ' +201234567890', // Example phone number
    date: 'Date',
    teacherName: 'Teacher Name',
    subject: 'Subject',
    studentName: 'Student Name',
    payment: 'Amount Paid',
    thankYou: 'Thank you for choosing our center!',
  };

  // ESC/POS Printer Commands
  const ESC_ALIGN_CENTER = '\x1B\x61\x01'; // Center align
  const ESC_DOUBLE_SIZE = '\x1B\x21\x30'; // Double font size
  const ESC_DOUBLE2_SIZE = '\x1B\x21\x20'; // Double font size
  const ESC_BOLD = '\x1B\x45\x01'; // Bold text
  const ESC_NORMAL_SIZE = '\x1B\x21\x00'; // Normal font size
  const ESC_CUT = '\x1D\x56\x42\x00'; // Full paper cut
  const ESC_FEED_LINE = '\x0A'; // Line feed
  const ESC_RESET = '\x1B\x40'; // Reset printer

  const lineSeparator = '-'.repeat(48); // Table line separator

  function formatTableRow(field, value) {
    const totalWidth = 48;
    const left = field.padEnd(20, ' ');
    const right = value.toString().padStart(20, ' ');
    return `| ${left} | ${right} |`;
  }

  // Build receipt content
  const receiptContent =
    
    ESC_RESET +
    ESC_ALIGN_CENTER +
    ESC_BOLD +
    ESC_DOUBLE_SIZE +
    englishLabels.title +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
 

    ESC_NORMAL_SIZE +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
    englishLabels.phone +
    ESC_FEED_LINE +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.date, date) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(
      englishLabels.teacherName,
      data['studentTeacher']?.teacherName || 'N/A'
    ) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(
      englishLabels.subject,
      data['studentTeacher']?.subjectName || 'N/A'
    ) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.studentName, studentName) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    formatTableRow(englishLabels.payment, `${studentAmount} EGP`) +
    ESC_FEED_LINE +
    lineSeparator +
    ESC_FEED_LINE +
    ESC_ALIGN_CENTER +
    ESC_BOLD +
    ESC_NORMAL_SIZE +
    englishLabels.thankYou +
    ESC_FEED_LINE +
    ESC_FEED_LINE;

  // Print receipt
  if (!isQzConnected) {
    message.textContent =
      'QZ Tray is not connected. Please connect and try again.';
    return;
  }

  const config = qz.configs.create('XP-80C (copy 1)'); // Replace with your printer name

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
    spinner.classList.remove('d-none');
    const response = await fetch('/employee/get-attended-students');
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(responseData.students);
    // Populate table
    addStudentsToTable(responseData.students);
    spinner.classList.add('d-none');
    searchStudent.focus();
    message.textContent = responseData.message;
    totalAmount.textContent = responseData.totalAmount +' EGP';
    totalFees.textContent = responseData.totalFees+' EGP';
    totalStudents.textContent = responseData.students.length;
    // pouplate Teachers Summary
    teachersSummary(responseData.teachersSummary);
    employeesSummary(responseData.employeesSummary);
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


document.addEventListener('DOMContentLoaded', getStudents);
// Reload button
reloadButton.addEventListener('click', getStudents);


// Function to add students to the tbody

const addStudentsToTable = (students) => {
    tBody.innerHTML = ''; // Clear existing rows
    students.forEach((student,addedBy) => {

        const tr = document.createElement('tr');
        tr.innerHTML = `
                        <td class="text-center">${student['student'].studentName}</td>
                        <td class="text-center">${student['student'].studentCode}</td>
                        <td class="text-center">${student['student'].studentPhoneNumber}</td>
                        <td class="text-center">${student['student'].studentParentPhone}</td>
                        <td class="text-center"> ${student.amountPaid} </td>
                        <td class="text-center">${student['student']['studentTeacher']['subjectName']}</td>
                        <td class="text-center">${student['student']['studentTeacher']['teacherName']}</td>
                          <td class="text-center">
                            <input type="text" class="amountRemaining"  value=${student['student'].amountRemainingSessions} data-student-id="${student['student']._id}">
                          </td>
                          <td class="text-center">
                            <button class="btn btn-primary btn-sm edit-amount">Edit</button>
                          </td>
                        <td class="text-center">
                                <button class="btn btn-danger btn-sm delete">Delete</button>
                        </td>
                        <td class="text-center">${student['addedBy']['employeeName']}</td>

                `;

        // Append the row to the tbody
        tBody.appendChild(tr);

        // Attach the event listener for the delete button
        tr.querySelector('.delete').addEventListener('click', () => {
            const studentId = student._id;
            deleteStudent(studentId);
        });

        // Attach the event listener for the edit button

        tr.querySelector('.edit-amount').addEventListener('click', () => {
            const amountRemaining = tr.querySelector('.amountRemaining').value;
            const studentId = tr.querySelector('.amountRemaining').getAttribute('data-student-id');
            console.log(amountRemaining, studentId);
            editStudentAmountRemaining(studentId, amountRemaining );
        });
      

    });

    searchStudent.focus();
};


const teachersSummary = (teachers) => {
  teachersSummaryRow.innerHTML = ''; // Clear existing rows
  teachers.forEach((teacher, index) => {
    let innerHTMLs= '';
    if(teacher.paymentType == 'perSession'){
      innerHTMLs = `
        <p class="text-sm mb-0 text-capitalize">المبلغ الكلي</p>
        <h4 class="mb-0" dir="ltr">${teacher.totalAmount} EGP</h4>
        <p class="text-sm mb-0 text-capitalize mt-3">نسبة السنتر</p>
        <h4 class="mb-0" dir="ltr">${teacher.totalFees} EGP</h4>
        <p class="text-sm mb-0 text-capitalize mt-3">المبلغ بعد خصم النسبة</p>
        <h4 class="mb-0" dir="ltr">${teacher.netProfit} EGP</h4>
     
      `
    }
    // Add teacher cards
    teachersSummaryRow.innerHTML += `
             <div class="col-lg-3 col-sm-6 mb-lg-0 mb-4">
                  <div class="card">
                    <div class="card-header  p-3 pt-2 text-center">
                      <div class="text-center pt-1">
                        <h3 class="mb-0 text-capitalize">${
                          teacher.teacherName
                        }</h3>
                        <h4 class="mb-0 text-capitalize ">( ${
                          teacher.paymentType == 'perSession'
                            ? 'Per Session'
                            : 'Per Course'
                        } )</h4>  
                      </div>
                    </div>
                    <hr class="dark horizontal my-0">
                    <div class="card-body text-center">
                       <p class="text-sm mb-0 text-capitalize"> عدد الطلاب</p>
                      <h4 class="mb-0" dir="ltr">${teacher.totalStudents} </h4>
                        ${innerHTMLs}
                        <button type="button" class="btn bg-gradient-dark mt-3 sendExcelBtn" data-teacher-id="${
                             teacher.teacherId
                         }">
                        <i class="material-symbols-rounded text-sm">send</i>&nbsp;&nbsp;ارسال نسخة اكسل
                      </button>
                    </div>
                  </div>
                </div>
            `;
            const sendExcelBtns = document.querySelectorAll('.sendExcelBtn');
            sendExcelBtns.forEach((button) => {
                button.addEventListener('click', async (event) => {
                    const teacherId = event.target.getAttribute('data-teacher-id');
                    const originalText = event.target.innerHTML;
                    event.target.innerHTML = 'جاري التحميل...';
                    console.log(teacherId , teacher.teacherName , teacher.teacherPhoneNumber);
                    await downloadAndSendExcelForTeacher(teacherId, teacher.teacherName);
                    event.target.innerHTML = originalText;
                });
            });

  });


  searchStudent.focus();
};

const employeesSummary= (employees) => {
  employeesSummaryRow.innerHTML = ''; // Clear existing rows
  employees.forEach((employee, index) => {
    let innerHTMLs= '';
    // Add teacher cards

    employeesSummaryRow.innerHTML += `
              <div class="col-lg-3 col-sm-6 mb-lg-0 mb-4">
                  <div class="card">
                    <div class="card-header  p-3 pt-2 text-center">
                      <div class="text-center pt-1">
                        <h3 class="mb-0 text-capitalize">${employee.employeeName}</h3>
                      </div>
                    </div>
                    <hr class="dark horizontal my-0">
                    <div class="card-body text-center">
                       <p class="text-sm mb-0 text-capitalize"> عدد الطلاب الي تم تحضيرهم</p>
                       <h4 class="mb-0" dir="ltr">${employee.count} </h4>
                       <p class="text-sm mb-0 text-capitalize"> المبلغ المجمع</p>
                      <h4 class="mb-0" dir="ltr">${employee.totalAmount} EGP</h4>
                          
                       <p class="text-sm mb-0 text-capitalize">النسبه</p>
                      <h4 class="mb-0" dir="ltr">${employee.percentage} %</h4>
                          

                        <button type="button" class="btn bg-gradient-dark mt-3 sendExcelBtn" data-employee-id="${employee.employeeId}">
                        <i class="material-symbols-rounded text-sm">send</i>&nbsp;&nbsp;ارسال نسخة اكسل 
                      </button>

                    </div>
                  </div>
                </div>
            `;
            const sendExcelBtns = document.querySelectorAll('.sendExcelBtn');
            sendExcelBtns.forEach((button) => {
                button.addEventListener('click', async (event) => {
                    const employeeId = event.target.getAttribute('data-employee-id');
                    const originalText = event.target.innerHTML;
                    event.target.innerHTML = 'جاري التحميل...';
                    console.log(employeeId , employee.employeeName , employee.employeePhoneNumber);
                    await downloadAndSendExcelForEmployee(employeeId, employee.employeeName);
                    event.target.innerHTML = originalText;
                });
            });

  });
};

// Function to delete student

async function deleteStudent(studentId) {
    try {
        console.log(studentId);
        spinner.classList.remove('d-none');
        const response = await fetch(`/employee/delete-attend-student/${studentId}`, {
        method: 'DELETE',
        });
        const responseData = await response.json();
        if (response.ok) {
        console.log(responseData.students);
        addStudentsToTable(responseData.students);
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

async function editStudentAmountRemaining(studentId,amount){
    try {
      console.log(studentId,amount);
        spinner.classList.remove('d-none');
        const response = await fetch(`/employee/edit-student-amount-remaining/${studentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amountRemainingSessions: amount }),
        });
        const responseData = await response.json();
        if (response.ok) {
        console.log(responseData.students);
        // addStudentsToTable(responseData.students);
        window.location.reload();
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
        const response = await fetch('/employee/download-attendance-excel');
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
        downloadExcelBtn.innerHTML = '<i class="material-symbols-rounded text-sm">download</i>&nbsp;&nbsp;Download Excel';
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading excel file:', error);
    }
});

// Function to download Excel for a specific teacher

async function downloadAndSendExcelForTeacher(teacherId, teacherName) {
    try {
        
        const response = await fetch(`/employee/download-send-excel-for-teacher/${teacherId}`);
        if (!response.ok) {
          const data = await response.json();
          console.log(data);
            throw new Error('Failed to download excel file');
        }
   
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toLocaleDateString().replace(/\//g, '-');
        a.download = `كشف حضور الطلاب __ ${teacherName} __ ${date}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading excel file:', error);
    }
}



// Function to download Excel for a specific employee

async function downloadAndSendExcelForEmployee(employeeId, employeeName) {
    try {
        
        const response = await fetch(`/employee/download-send-excel-for-employee/${employeeId}`);
        if (!response.ok) {
          const data = await response.json();
          console.log(data);
            throw new Error('Failed to download excel file');
        }
   
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toLocaleDateString().replace(/\//g, '-');
        a.download = `كشف حضور الطلاب __ ${employeeName} __ ${date}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading excel file:', error);
    }
}



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