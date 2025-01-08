const attendanceByDateForm = document.getElementById('attendanceByDateForm');
const studentTable = document.getElementById('studentTable');
const reloadButton = document.getElementById('reloadButton');
const spinner = document.getElementById('spinner');
const tBody = document.querySelector('#studentTable tbody');
const message = document.getElementById('message');
const totalAmount = document.getElementById('totalAmount');
const totalFees = document.getElementById('totalFees');
const totalStudents = document.getElementById('totalStudents');
const teachersSummaryRow = document.getElementById('teachersSummaryRow');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const attendanceDate = document.getElementById('date');


// Function to add addStudentsToTable to the tbody

const addStudentsToTable = (students) => {
   tBody.innerHTML = ''; // Clear existing rows
    students.forEach((student) => {

        const tr = document.createElement('tr');
        tr.innerHTML = `
                        <td class="text-center">${student.studentName}</td>
                        <td class="text-center">${student.studentPhoneNumber}</td>
                        <td class="text-center">${student.studentParentPhone}</td>
                        <td class="text-center">${student.studentAmount}</td>
                        <td class="text-center">${student['studentTeacher']['subjectName']}</td>
                        <td class="text-center">${student['studentTeacher']['teacherName']}</td>
                   
                `;

        // Append the row to the tbody
        tBody.appendChild(tr);
    });  
 }


 // get Students By Date 
attendanceByDateForm.onsubmit = async (event) => {
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
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

    const responseData = await response.json();
    // Populate table
    addStudentsToTable(responseData.students);
    spinner.classList.add('d-none');
    message.textContent = responseData.message;
    totalAmount.textContent = responseData.totalAmount +' EGP';
    totalFees.textContent = responseData.totalFees+' EGP';
    totalStudents.textContent = responseData.students.length;
    // pouplate Teachers Summary
    teachersSummary(responseData.teachersSummary);
    setTimeout(() => {
        message.textContent = '';
    },3000)
    } catch (error) {
    console.error('Error fetching students:', error);
    spinner.classList.add('d-none');
    message.textContent = 'لم يتم تسجيل اي طلاب في هذا اليوم';
    }
    
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
                    await downloadAndSendExcelForTeacher(teacherId, teacher.teacherName);
                    event.target.innerHTML = originalText;
                });
            });

  });


};

// download Excel File

downloadExcelBtn.addEventListener('click', async () => {
    try {
        console.log(attendanceDate.value);
        downloadExcelBtn.innerHTML = 'جاري التحميل...';
        const response = await fetch('/employee/download-attendance-excel-by-date?date=' + attendanceDate.value);
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
        
        const response = await fetch(`/employee/download-sendExcelTeachrByDate/${teacherId}?date=${attendanceDate.value}`);
        if (!response.ok) {
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
