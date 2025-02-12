const attendanceByDateForm = document.getElementById('attendanceByDateForm');
const studentTable = document.getElementById('studentTable');
const reloadButton = document.getElementById('reloadButton');
const spinner = document.getElementById('spinner');
const tBody = document.querySelector('#studentTable tbody');
const message = document.getElementById('message');
// const totalAmount = document.getElementById('totalAmount');
// const totalFees = document.getElementById('totalFees');
// const totalStudents = document.getElementById('totalStudents');
const teachersSummaryRow = document.getElementById('teachersSummaryRow');
const employeesSummaryRow = document.getElementById('employeesSummaryRow');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const attendanceDate = document.getElementById('date');
const invoiceTable = document.getElementById('invoiceTable');

// Function to add addStudentsToTable to the tbody

const addStudentsToTable = (attendanceRecords) => {
  tBody.innerHTML = ''; // Clear existing data

  // Group attendances by date
  const dateGroups = {};
  attendanceRecords.forEach((attendance) => {
    if (!dateGroups[attendance.date]) {
      dateGroups[attendance.date] = [];
    }
    dateGroups[attendance.date].push(attendance);
  });

  Object.keys(dateGroups).forEach((date) => {
    // Create a merged row for the date (only once per date)
    const dateRow = document.createElement('tr');
    const dateCell = document.createElement('td');
    dateCell.colSpan = 8;
    dateCell.classList.add('text-center', 'font-weight-bold', 'bg-gray');
    dateCell.style.backgroundColor = '#e3e3e3';
    dateCell.style.borderRadius = '15px';
    dateCell.textContent = `Date: ${date}`;
    dateRow.appendChild(dateCell);
    tBody.appendChild(dateRow);

    // Now iterate over all attendances for this date
    dateGroups[date].forEach((attendance) => {
      const teacherName = attendance.teacher?.teacherName || 'Unknown Teacher';
      const courseName = attendance.course || 'Unknown Course';

      // Create a row for the teacher + course
      const teacherRow = document.createElement('tr');
      const teacherCell = document.createElement('td');
      teacherCell.colSpan = 8;
      teacherCell.classList.add('text-center', 'font-weight-bold');
      teacherCell.style.backgroundColor = '#d1e7fd';
      teacherCell.style.borderRadius = '10px';
      teacherCell.textContent = `Teacher: ${teacherName} - Course: ${courseName}`;
      teacherRow.appendChild(teacherCell);
      tBody.appendChild(teacherRow);

      // Add students for this teacher & course
      attendance.studentsPresent.forEach((student) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="text-center">${student.student.studentName}</td>
          <td class="text-center">${student.student.studentCode}</td>
          <td class="text-center">${student.student.studentPhoneNumber}</td>
          <td class="text-center">${student.student.studentParentPhone}</td>
          <td class="text-center">${student.amountPaid}</td>
          <td class="text-center">${student.addedBy.employeeName}</td>
        `;
        tBody.appendChild(tr);
      });
    });
  });
};

// Function to populate the teachers summary
const teachersSummary = (teachers, totalInvoiceAmount, invoicesByTeacher) => {
  teachersSummaryRow.innerHTML = ''; // Clear existing rows

  let totalStudents = 0;
  let totalAmount = 0;
  let totalFees = 0;
  let finalNetProfit = 0;

  teachers.forEach((teacher) => {
    totalStudents += teacher.totalStudents;
    totalAmount += teacher.totalAmount;
    totalFees += teacher.totalFees;
  });

  teachers.forEach((teacher) => {
    // Get the invoice total for this teacher
    const teacherInvoiceTotal = invoicesByTeacher[teacher.teacherId] || 0;
    const teacherFinalNetProfit = teacher.totalAmount - teacher.totalFees - teacherInvoiceTotal;
    finalNetProfit += teacherFinalNetProfit;

    // 🔹 Fix: Calculate percentage based on net profit (like Excel)
    const teacherProfitPercentage = ((teacherFinalNetProfit / (totalAmount - totalFees - totalInvoiceAmount)) * 100).toFixed(2);

    let innerHTMLs = `
      <p class="text-sm mb-0 text-capitalize">المبلغ الكلي</p>
      <h4 class="mb-0" dir="ltr">${teacher.totalAmount} EGP</h4>
      <p class="text-sm mb-0 text-capitalize mt-3">نسبة السنتر</p>
      <h4 class="mb-0" dir="ltr">${teacher.totalFees} EGP</h4>
      <p class="text-sm mb-0 text-capitalize mt-3">إجمالي الفواتير</p>
      <h4 class="mb-0" dir="ltr">${teacherInvoiceTotal} EGP</h4>
      <p class="text-sm mb-0 text-capitalize mt-3">الربح النهائي بعد الفواتير</p>
      <h4 class="mb-0 text-warning" dir="ltr">${teacherFinalNetProfit} EGP</h4>
      <p class="text-sm mb-0 text-capitalize mt-3">النسبة من الربح النهائي</p>
      <h4 class="mb-0 text-primary" dir="ltr">${teacherProfitPercentage} %</h4>
    `;

    teachersSummaryRow.innerHTML += `
      <div class="col-lg-3 col-sm-6 mb-lg-0 mb-4">
        <div class="card">
          <div class="card-header p-3 pt-2 text-center">
            <h3 class="mb-0 text-capitalize">${teacher.teacherName}</h3>
            <h4 class="mb-0 text-capitalize">(${
              teacher.paymentType === 'perSession' ? 'Per Session' : 'Per Course'
            })</h4>
          </div>
          <hr class="dark horizontal my-0">
          <div class="card-body text-center">
            <p class="text-sm mb-0 text-capitalize">عدد الطلاب</p>
            <h4 class="mb-0" dir="ltr">${teacher.totalStudents}</h4>
            ${innerHTMLs}
            <button type="button" class="btn bg-gradient-dark mt-3 sendExcelBtn" data-teacher-id="${teacher.teacherId}">
              <i class="material-symbols-rounded text-sm">send</i>&nbsp;&nbsp;ارسال نسخة اكسل
            </button>
          </div>
        </div>
      </div>
    `;
  });

  // Add final total summary
  teachersSummaryRow.innerHTML += `
    <div class="col-lg-3 col-sm-6 mb-lg-0 mb-4">
      <div class="card">
        <div class="card-header p-3 pt-2 text-center bg-gradient-primary text-white">
          <h3 class="mb-0 text-capitalize">إجمالي الحساب</h3>
        </div>
        <hr class="dark horizontal my-0">
        <div class="card-body text-center">
          <p class="text-sm mb-0 text-capitalize">إجمالي عدد الطلاب</p>
          <h4 class="mb-0" dir="ltr">${totalStudents}</h4>
          <p class="text-sm mb-0 text-capitalize mt-3">إجمالي المبلغ المدفوع</p>
          <h4 class="mb-0 text-warning" dir="ltr">${totalAmount} EGP</h4>
          <p class="text-sm mb-0 text-capitalize mt-3">إجمالي نسبة السنتر</p>
          <h4 class="mb-0" dir="ltr">${totalFees} EGP</h4>
          <p class="text-sm mb-0 text-capitalize mt-3">إجمالي الفواتير لكل المدرسين</p>
          <h4 class="mb-0 text-danger" dir="ltr">${totalInvoiceAmount} EGP</h4>
          <p class="text-sm mb-0 text-capitalize mt-3">الربح النهائي بعد الفواتير</p>
          <h4 class="mb-0 text-success" dir="ltr">${finalNetProfit} EGP</h4>
        </div>
      </div>
    </div>
  `;
};




// Function to populate the employees summary
const employeesSummary = (employees) => {
  employeesSummaryRow.innerHTML = ''; // Clear existing rows

  let totalCollectedAmount = 0;
  let totalPreparedStudents = 0;

  employees.forEach((employee) => {
    totalCollectedAmount += employee.totalAmount;
    totalPreparedStudents += employee.count;
  });

  employees.forEach((employee) => {
    // Calculate each employee's percentage of the total amount
    const employeePercentage = ((employee.totalAmount / totalCollectedAmount) * 100).toFixed(2);

    employeesSummaryRow.innerHTML += `
      <div class="col-lg-3 col-sm-6 mb-lg-0 mb-4">
        <div class="card">
          <div class="card-header p-3 pt-2 text-center">
            <h3 class="mb-0 text-capitalize">${employee.employeeName}</h3>
          </div>
          <hr class="dark horizontal my-0">
          <div class="card-body text-center">
            <p class="text-sm mb-0 text-capitalize">عدد الطلاب الذين تم تحضيرهم</p>
            <h4 class="mb-0" dir="ltr">${employee.count}</h4>
            
            <p class="text-sm mb-0 text-capitalize mt-3">المبلغ المجمع</p>
            <h4 class="mb-0 text-success" dir="ltr">${employee.totalAmount} EGP</h4>

            <p class="text-sm mb-0 text-capitalize mt-3">النسبة من الإجمالي</p>
            <h4 class="mb-0 text-primary" dir="ltr">${employeePercentage} %</h4>

            <button type="button" class="btn bg-gradient-dark mt-3 sendExcelBtn" data-employee-id="${employee.employeeId}">
              <i class="material-symbols-rounded text-sm">send</i>&nbsp;&nbsp;ارسال نسخة اكسل 
            </button>
          </div>
        </div>
      </div>
    `;
  });

  // Add final total summary
  employeesSummaryRow.innerHTML += `
    <div class="col-lg-3 col-sm-6 mb-lg-0 mb-4">
      <div class="card">
        <div class="card-header p-3 pt-2 text-center bg-gradient-primary text-white">
          <h3 class="mb-0 text-capitalize">إجمالي الحساب</h3>
        </div>
        <hr class="dark horizontal my-0">
        <div class="card-body text-center">
          <p class="text-sm mb-0 text-capitalize">إجمالي الطلاب المحضرين</p>
          <h4 class="mb-0" dir="ltr">${totalPreparedStudents}</h4>

          <p class="text-sm mb-0 text-capitalize mt-3">إجمالي المبلغ المجمع</p>
          <h4 class="mb-0 text-warning" dir="ltr">${totalCollectedAmount} EGP</h4>
        </div>
      </div>
    </div>
  `;
};



// Function to populate the invoices table
const populateInvoicesTable = (attendanceRecords) => {
  invoiceTBody.innerHTML = ''; // Clear existing data

  const groupedInvoices = {};
  console.log(attendanceRecords);
  attendanceRecords.forEach((attendance) => {
    const date = attendance.date;
    const teacherName = attendance.teacher?.teacherName || 'Unknown Teacher'; // Handle missing teacher data
    if (!groupedInvoices[date]) {
      groupedInvoices[date] = {};
    }
    if (!groupedInvoices[date][teacherName]) {
      groupedInvoices[date][teacherName] = [];
    }

    attendance.invoices.forEach((invoice) => {
      groupedInvoices[date][teacherName].push(invoice);
    });
  });

  Object.keys(groupedInvoices).forEach((date) => {
    // Create a row for the date
    const dateRow = document.createElement('tr');
    const dateCell = document.createElement('td');
    dateCell.colSpan = 4; // Adjust based on the number of columns
    dateCell.classList.add('text-center', 'font-weight-bold', 'bg-gray');
    dateCell.style.backgroundColor = '#e3e3e3';
    dateCell.style.borderRadius = '15px';
    dateCell.textContent = `Date: ${date}`;
    dateRow.appendChild(dateCell);
    invoiceTBody.appendChild(dateRow);

    Object.keys(groupedInvoices[date]).forEach((teacherName) => {
      // Create a row for the teacher
      const teacherRow = document.createElement('tr');
      const teacherCell = document.createElement('td');
      teacherCell.colSpan = 4;
      teacherCell.classList.add('text-center', 'font-weight-bold');
      teacherCell.style.backgroundColor = '#d1e7fd';
      teacherCell.style.borderRadius = '10px';
      teacherCell.textContent = `Teacher: ${teacherName}`;
      teacherRow.appendChild(teacherCell);
      invoiceTBody.appendChild(teacherRow);

      // Add invoices for this teacher
      groupedInvoices[date][teacherName].forEach((invoice) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="text-center">${invoice.invoiceDetails}</td>
          <td class="text-center">${invoice.invoiceAmount} EGP</td>
          <td class="text-center">${invoice.time}</td>
          <td class="text-center">${
            invoice.addedBy?.employeeName || 'Unknown'
          }</td>
        `;
        invoiceTBody.appendChild(tr);
      });
    });
  });
};


// download Excel Files

downloadExcelBtn.addEventListener('click', async () => {
  try {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    downloadExcelBtn.innerHTML = 'جاري التحميل...';
    const response = await fetch(`/employee/download-attendance-excel-by-date-range?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
      throw new Error('Failed to download excel file');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    a.download = `كشف حضور الطلاب - ${startDate} إلى ${endDate}.xlsx`;
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
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const response = await fetch(`/employee/download-sendExcelTeachrByDate/${teacherId}?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
      throw new Error('Failed to download excel file');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    a.download = `كشف حضور الطلاب __ ${teacherName} __ ${startDate} إلى ${endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading excel file:', error);
  }
}

// Function to download Excel for a specific employee 

async function downloadAndSendExcelForEmployee(employeeId, employeeName) {

  try {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const response = await fetch(`/employee/download-sendExcelEmployeeByDate/${employeeId}?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
      throw new Error('Failed to download excel file');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    a.download = `كشف حضور الطلاب __ ${employeeName} __ ${startDate} إلى ${endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading excel file:', error);
  }
}


 // get Students By Date 
attendanceByDateForm.onsubmit = async (event) => {
     tBody.innerHTML = ''; // Clear existing rows
    event.preventDefault();
    try {
      spinner.classList.remove('d-none');
      // Collect form data
      const formData = new FormData(attendanceByDateForm);
      const params = new URLSearchParams();

      // Append form data to params
      for (const [key, value] of formData.entries()) {
        params.append(key, value);
      }
        const response = await fetch(`/employee/attendance-by-date?${params.toString()}`, {
            method: 'GET',
        });
   
    const responseData = await response.json();
       if (!response.ok) {
         message.textContent = responseData.message;
       }

    // Populate table

    addStudentsToTable( responseData.attendanceRecords);
      

    // const totalStudentsCount = responseData.attendanceRecords.reduce((total, record) => total + record.studentsPresent.length, 0);
    // totalStudents.textContent = totalStudentsCount;
    spinner.classList.add('d-none');
    message.textContent = responseData.message;
    // totalAmount.textContent = responseData.totalAmount + ' EGP';
    // totalFees.textContent = responseData.totalFees+' EGP';
   
    // pouplate Teachers Summary
    teachersSummary(
      responseData.teachersSummary,
      responseData.totalInvoiceAmount,
      responseData.invoicesByTeacher
    );

    // pouplate Employees Summary

    employeesSummary(responseData.employeesSummary);

     // pouplateInvoicesTable  
    populateInvoicesTable(responseData.attendanceRecords);

    setTimeout(() => {message.textContent = ''; },3000)
    } catch (error) {
    console.error('Error fetching students:', error);
    spinner.classList.add('d-none');
  
    }
    
};