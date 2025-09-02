
const addStudentForm = document.getElementById('addStudentForm');
const spinner = document.getElementById('spinner');
const spinner2 = document.getElementById('spinner2');
const successToast = document.getElementById('successToast');
const messageToast = document.getElementById('messageToast');
const errorMessage = document.getElementById('errorMessage');
const searchStudent = document.getElementById('searchStudent');
const filterTeacherSelection = document.getElementById('filterCourseSelection');
const searchButton = document.getElementById('searchButton');
const studentTableBody = document.querySelector('#studentTable tbody'); // Target tbody
const sendWaButton = document.getElementById('sendWaButton');
const waTeacherSelection = document.getElementById('waTeacherSelection');
const waMessage = document.getElementById('waMessage');
const addNewStudentBtn = document.getElementById('addNewStudentBtn');

let sequenceOfStudets = 0;

// Toast function for showing messages
function showToast(message, type = 'success') {
  if (type === 'success') {
    messageToast.textContent = message;
    successToast.classList.add('show');
    // Auto hide after 3 seconds
    setTimeout(() => {
      successToast.classList.remove('show');
    }, 3000);
  } else {
    errorMessage.querySelector('.toast-body').textContent = message;
    errorMessage.classList.add('show');
    // Auto hide after 3 seconds
    setTimeout(() => {
      errorMessage.classList.remove('show');
    }, 3000);
  }
}

async function addNewStudent(event) {
  event.preventDefault();
  addNewStudentBtn.disabled = true;
  spinner.classList.remove('d-none');

  const studentName = document.getElementById('studentName').value;
  const studentPhoneNumber =
    document.getElementById('studentPhoneNumber').value;
  const studentParentPhone =
    document.getElementById('studentParentPhone').value;
  const schoolName = document.getElementById('schoolName').value;
  const paymentType = document.getElementById('paymentType').value;

  const selectedTeachers = [];
  document
    .querySelectorAll('input[name="teachers[]"]:checked')
    .forEach((teacherCheckbox) => {
      const teacherId = teacherCheckbox.value;
      const selectedCourses = [];

      document
        .querySelectorAll(
          `input[name="selectedCourses[${teacherId}][]"]:checked`
        )
        .forEach((courseCheckbox) => {
          const courseName = courseCheckbox.value;
          const amountPay = document.getElementById(
            `price_${courseName}_${teacherId}`
          ).value;
          const registerPrice = document.getElementById(
            `registerPrice_${courseName}_${teacherId}`
          ).value;

          console.log(`Course: ${courseName}, Amount: ${amountPay}, Register: ${registerPrice}`);

          // Only include courses that have valid prices
          if (courseName && amountPay && parseFloat(amountPay) > 0) {
            selectedCourses.push({ courseName, amountPay, registerPrice });
          }
        });

      if (selectedCourses.length > 0) {
        selectedTeachers.push({ teacherId, courses: selectedCourses });
      }
    });

  const data = {
    studentName,
    studentPhoneNumber,
    studentParentPhone,
    schoolName,
    paymentType,
    selectedTeachers,
  };

  // Validate that at least one course is selected
  if (selectedTeachers.length === 0) {
    alert('يرجى اختيار معلم واحد على الأقل مع دورة واحدة');
    addNewStudentBtn.disabled = false;
    spinner.classList.add('d-none');
    return;
  }

  // Check if any teacher has courses selected
  let totalCourses = 0;
  selectedTeachers.forEach(teacher => {
    totalCourses += teacher.courses.length;
  });

  if (totalCourses === 0) {
    alert('يرجى اختيار دورة واحدة على الأقل');
    addNewStudentBtn.disabled = false;
    spinner.classList.add('d-none');
    return;
  }

  console.log(data);

  try {
    const response = await fetch('/employee/add-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    if (response.ok) {
      successToast.classList.add('show');
      messageToast.innerHTML = 'تم إضافة الطالب بنجاح';
      addStudentForm.reset();
      document
        .querySelectorAll('input[name="teachers[]"]')
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
      document
        .querySelectorAll('input[name^="selectedCourses"]')
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
      document
        .querySelectorAll('input[id^="price_"], input[id^="registerPrice_"]')
        .forEach((input) => {
          input.value = '';
          input.disabled = true;
          input.required = false;
        });
      document.querySelectorAll('.courses-container').forEach((container) => {
        container.style.display = 'none';
      });
      spinner.classList.add('d-none');
      addNewStudentBtn.disabled = false;
    } else {
      errorMessage.classList.add('show');
      errorMessage.innerHTML = responseData.message;
      spinner.classList.add('d-none');
      addNewStudentBtn.disabled = false;
    }
  } catch (error) {
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'حدث خطأ. يرجى المحاولة لاحقًا.';
    spinner.classList.add('d-none');
    addNewStudentBtn.disabled = false;
  }
}

addStudentForm.addEventListener('submit', addNewStudent);

// Addcourses to Student
function toggleCourses(teacherId) {
  const coursesContainer = document.getElementById(`courses_${teacherId}`);
  const teacherCheckbox = document.getElementById(`teacher_${teacherId}`);

  if (teacherCheckbox.checked) {
    coursesContainer.style.display = 'block';
  } else {
    coursesContainer.style.display = 'none';
    // Uncheck all courses if the teacher is deselected
    coursesContainer
      .querySelectorAll('input[type="checkbox"]')
      .forEach((course) => {
        course.checked = false;
      });
  }
}

function toggleCoursePrice(courseCheckbox, teacherId, courseName) {
  const priceInput = document.getElementById(
    `price_${courseName}_${teacherId}`
  );
  const registerPriceInput = document.getElementById(
    `registerPrice_${courseName}_${teacherId}`
  );

  if (courseCheckbox.checked) {
    priceInput.disabled = false;
    priceInput.required = true;
    registerPriceInput.disabled = false;
    registerPriceInput.required = true;
  } else {
    priceInput.disabled = true;
    priceInput.required = false;
    priceInput.value = '';

    registerPriceInput.disabled = true;
    registerPriceInput.required = false;
    registerPriceInput.value = '';
  }
}

// Get ALL Students

const studentTable = document.getElementById('studentTable');

// Function to add students to the tbody
const addStudentToTable = (student) => {
  const tr = document.createElement('tr');
  
  // Add blocked class if student is blocked
  if (student.isBlocked) {
    tr.classList.add('blocked-student');
  }
  
  tr.innerHTML = `
    <td class="text-center">${++sequenceOfStudets}</td>
    <td class="text-center">${student.studentName}</td>
    <td class="text-center">${student.studentPhoneNumber}</td>
    <td class="text-center">${student.studentParentPhone}</td>
    <td class="text-center">${student.studentCode}</td>

    <td class="text-center">${
      student.paymentType == 'perSession' ? 'Per Session' : 'Per Course'
    }</td>
    <td class="text-center">
      ${
        student.createdAt
          ? new Date(student.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : 'N/A'
      }
    </td>
    <td class="align-middle text-center">
      <button class="edit-student-btn mt-2" data-id="${student._id}" 
      data-bs-toggle="modal" data-bs-target="#editStudentModal">Edit</button>
    </td>

    <td class="align-middle text-center">
      <button class="delete-student-btn mt-2" data-id="${
        student._id
      }">Delete</button>
    </td>

    <td class="align-middle text-center">
      ${student.paymentType === 'perCourse' ? 
        `<button class="pay-installment-btn mt-2" data-id="${student._id}" 
         data-bs-toggle="modal" data-bs-target="#payInstallmentModal">Pay Installment</button>` : 
        '<span class="text-muted">-</span>'
      }
    </td>

    <td class="align-middle text-center">
      <button class="send-code-btn mt-2" data-id="${
        student._id
      }">Send Code</button>
    </td>

    <td class="align-middle text-center">
      ${student.isBlocked ? 
        `<button class="unblock-student-btn mt-2" data-id="${student._id}" 
         data-bs-toggle="modal" data-bs-target="#unblockStudentModal">Unblock</button>` : 
        `<button class="block-student-btn mt-2" data-id="${student._id}" 
         data-bs-toggle="modal" data-bs-target="#blockStudentModal">Block</button>`
      }
    </td>
    `;

  studentTableBody.appendChild(tr);

  // Attach the event listener for the edit button dynamically
  tr.querySelector('.edit-student-btn').addEventListener('click', () => {
    openEditModal(student._id);
  });

  tr.querySelector('.delete-student-btn').addEventListener('click', () => {
    deleteStudent(student._id);
  });

  // Attach event listener for the pay installment button (only for per-course students)
  const payInstallmentBtn = tr.querySelector('.pay-installment-btn');
  if (payInstallmentBtn) {
    payInstallmentBtn.addEventListener('click', () => {
      openPayInstallmentModal(student._id);
    });
  }

  // Attach event listener for the send code button
  tr.querySelector('.send-code-btn').addEventListener('click', () => {
    sendCodeAgain(student._id);
  });

  // Attach event listener for the block/unblock button
  const blockUnblockBtn = tr.querySelector('.block-student-btn, .unblock-student-btn');
  if (blockUnblockBtn) {
    blockUnblockBtn.addEventListener('click', () => {
      if (student.isBlocked) {
        openUnblockModal(student._id);
      } else {
        openBlockModal(student._id);
      }
    });
  }
};

// Function to clear tbody before adding new rows
const clearStudentTable = () => {
  studentTableBody.innerHTML = '';
};

const getStudents = async () => {
  try {
    const response = await fetch('/employee/all-students');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const students = await response.json();
    console.log(students);
    console.log(students);
    clearStudentTable(); // Clear the table before populating
    sequenceOfStudets = 0;
    students.forEach(addStudentToTable); // Add each student to the table
  } catch (error) {
    console.error(error);
  }
};

document.addEventListener('DOMContentLoaded', getStudents);

// Open Edit Modal
const openEditModal = async (id) => {
  try {
    const response = await fetch(`/employee/get-student/${id}`);
    if (!response.ok) throw new Error('Failed to fetch student details');

    const student = await response.json();
    console.log(student);

    // Populate basic student info
    document.getElementById('editStudentName').value = student.studentName;
    document.getElementById('editStudentPhone').value =
      student.studentPhoneNumber;
    document.getElementById('editStudentParentPhone').value =
      student.studentParentPhone;
    document.getElementById('editStudentId').value = student._id;

    // Reset all checkboxes and fields
    document
      .querySelectorAll('input[name="editTeachers[]"]')
      .forEach((input) => {
        input.checked = false;
      });
    document
      .querySelectorAll('input[name^="editSelectedCourses"]')
      .forEach((input) => {
        input.checked = false;
      });
    document
      .querySelectorAll(
        'input[id^="edit_price_"], input[id^="edit_registerPrice_"], input[id^="edit_amountRemaining_"], input[id^="edit_totalCourseCost_"]'
      )
      .forEach((input) => {
        input.value = '';
        input.disabled = true;
      });
    document
      .querySelectorAll('.edit-courses-container')
      .forEach((container) => {
        container.style.display = 'none';
      });

    // Mark selected teachers and courses
    student.selectedTeachers.forEach(({ teacherId, courses }) => {
      const teacherCheckbox = document.getElementById(
        `edit_teacher_${teacherId._id}`
      );

      if (teacherCheckbox) {
        teacherCheckbox.checked = true;
        toggleEditCourses(teacherId._id); // Show the teacher's courses

        courses.forEach(
          ({ courseName, amountPay, registerPrice, amountRemaining, totalCourseCost }) => {
            const courseCheckbox = document.getElementById(
              `edit_course_${courseName}_${teacherId._id}`
            );
            const priceInput = document.getElementById(
              `edit_price_${courseName}_${teacherId._id}`
            );
            const registerPriceInput = document.getElementById(
              `edit_registerPrice_${courseName}_${teacherId._id}`
            );
            const amountRemainingInput = document.getElementById(
              `edit_amountRemaining_${courseName}_${teacherId._id}`
            );
            const totalCourseCostInput = document.getElementById(
              `edit_totalCourseCost_${courseName}_${teacherId._id}`
            );

            if (courseCheckbox) {
              courseCheckbox.checked = true;
              toggleEditCoursePrice(courseCheckbox, teacherId._id, courseName); // Enable inputs
              priceInput.value = amountPay;
              registerPriceInput.value = registerPrice;
              amountRemainingInput.value = amountRemaining;
              if (totalCourseCostInput) {
                totalCourseCostInput.value = totalCourseCost || amountPay || 0;
              }
            }
          }
        );
      }
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    alert('حدثت مشكلة أثناء تحميل بيانات الطالب.');
  }
};

function toggleEditCourses(teacherId) {
  const coursesContainer = document.getElementById(`edit_courses_${teacherId}`);
  const teacherCheckbox = document.getElementById(`edit_teacher_${teacherId}`);

  coursesContainer.style.display = teacherCheckbox.checked ? 'block' : 'none';

  // Uncheck all courses if teacher is deselected
  if (!teacherCheckbox.checked) {
    coursesContainer
      .querySelectorAll('input[type="checkbox"]')
      .forEach((course) => {
        course.checked = false;
      });
  }
}

function toggleEditCoursePrice(courseCheckbox, teacherId, courseName) {
  const priceInput = document.getElementById(
    `edit_price_${courseName}_${teacherId}`
  );
  const registerPriceInput = document.getElementById(
    `edit_registerPrice_${courseName}_${teacherId}`
  );
  const amountRemainingInput = document.getElementById(
    `edit_amountRemaining_${courseName}_${teacherId}`
  );
  const totalCourseCostInput = document.getElementById(
    `edit_totalCourseCost_${courseName}_${teacherId}`
  );

  if (courseCheckbox.checked) {
    priceInput.disabled = false;
    registerPriceInput.disabled = false;
    amountRemainingInput.disabled = false;
    if (totalCourseCostInput) {
      totalCourseCostInput.disabled = false;
    }
  } else {
    priceInput.disabled = true;
    registerPriceInput.disabled = true;
    amountRemainingInput.disabled = true;
    if (totalCourseCostInput) {
      totalCourseCostInput.disabled = true;
    }
    priceInput.value = '';
    registerPriceInput.value = '';
    amountRemainingInput.value = '';
    if (totalCourseCostInput) {
      totalCourseCostInput.value = '';
    }
  }
}

// Save updated Data
const editStudentModal = document.getElementById('editStudentModal');
const clodeModalBtn = document.getElementById('clodeModalBtn');
const saveEditStudentBtn = document.getElementById('saveEditStudentBtn');

const saveEditStudent = async () => {
  const studentId = document.getElementById('editStudentId').value;
  const studentName = document.getElementById('editStudentName').value;
  const studentPhone = document.getElementById('editStudentPhone').value;
  const studentParentPhone = document.getElementById(
    'editStudentParentPhone'
  ).value;

  // Collect updated teachers and courses
  const selectedTeachers = [];
  document
    .querySelectorAll('input[name="editTeachers[]"]:checked')
    .forEach((teacherCheckbox) => {
      const teacherId = teacherCheckbox.value;
      const selectedCourses = [];

      document
        .querySelectorAll(
          `input[name="editSelectedCourses[${teacherId}][]"]:checked`
        )
        .forEach((courseCheckbox) => {
          const courseName = courseCheckbox.value;
          const amountPay = document.getElementById(
            `edit_price_${courseName}_${teacherId}`
          ).value;
          const registerPrice = document.getElementById(
            `edit_registerPrice_${courseName}_${teacherId}`
          ).value;
          const amountRemaining = document.getElementById(
            `edit_amountRemaining_${courseName}_${teacherId}`
          ).value;
          const totalCourseCost = document.getElementById(
            `edit_totalCourseCost_${courseName}_${teacherId}`
          ).value;

          selectedCourses.push({
            courseName,
            amountPay: parseFloat(amountPay) || 0,
            registerPrice: parseFloat(registerPrice) || 0,
            amountRemaining: parseFloat(amountRemaining) || 0,
            totalCourseCost: parseFloat(totalCourseCost) || 0,
          });
        });

      if (selectedCourses.length > 0) {
        selectedTeachers.push({ teacherId, courses: selectedCourses });
      }
    });

  const data = {
    studentName,
    studentPhoneNumber: studentPhone,
    studentParentPhone,
    selectedTeachers,
  };

  const saveButton = document.getElementById('saveEditStudentBtn');
  const originalButtonText = saveButton.innerHTML;
  
  // Show loader on save button
  saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>جاري الحفظ...';
  saveButton.disabled = true;

  try {
    const response = await fetch(`/employee/update-student/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    if (!response.ok)
      throw new Error(responseData.message || 'Failed to update student');

    // Update the row in the table dynamically
    const row = document
      .querySelector(`button[data-id="${studentId}"]`)
      .closest('tr');
    row.cells[0].textContent = responseData.studentName;
    row.cells[1].textContent = responseData.studentPhoneNumber;
    row.cells[2].textContent = responseData.studentParentPhone;
    row.cells[3].textContent = responseData.studentCode;

    // Close modal & show success message
    document.getElementById('clodeModalBtn').click();
    showToast('تم تعديل الطالب بنجاح', 'success');
  } catch (error) {
    console.error('Error updating student:', error);
    showToast('حدث خطأ أثناء تحديث الطالب', 'error');
  } finally {
    // Restore button
    saveButton.innerHTML = originalButtonText;
    saveButton.disabled = false;
  }
};

// Attach event to save button
document
  .getElementById('saveEditStudentBtn')
  .addEventListener('click', saveEditStudent);

// Delete Student

const deleteStudent = async (id) => {
  if (!confirm('هل أنت متأكد أنك تريد حذف هذا الطالب؟')) return;

  const deleteButton = document.querySelector(`button[data-id="${id}"]`);
  const originalButtonText = deleteButton.innerHTML;
  
  // Show loader on delete button
  deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>جاري الحذف...';
  deleteButton.disabled = true;

  try {
    const response = await fetch(`/employee/delete-student/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete student');

    // Remove the row from the table
    deleteButton.closest('tr').remove();
    showToast('تم حذف الطالب بنجاح', 'success');
  } catch (error) {
    console.error('Error deleting student:', error);
    showToast('حدث خطأ أثناء حذف الطالب', 'error');
  } finally {
    // Restore button
    deleteButton.innerHTML = originalButtonText;
    deleteButton.disabled = false;
  }
};

// Search Student

searchButton.addEventListener('click', async () => {
  const searchValue = searchStudent.value;
  const teacherValue = filterTeacherSelection.value;
  const [teacher, course] = teacherValue.split('_');
  studentTableBody.innerHTML = '';
  spinner2.classList.remove('d-none');
  try {
    const response = await fetch(
      `/employee/search-student?search=${searchValue}&teacher=${teacher}&course=${course}`
    );
    if (!response.ok) {
      throw new Error('Failed to search for student');
    }

    const students = await response.json();
    console.log(students);
    clearStudentTable(); // Clear the table before populating
    sequenceOfStudets = 0;
    students.forEach(addStudentToTable); // Add each student to the table
    spinner2.classList.add('d-none');
  } catch (error) {
    console.error('Error searching for student:', error);
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'No Students Found. Please try again later.';
    spinner2.classList.add('d-none');
  }
});

// Send WA

sendWaButton.addEventListener('click', async () => {
  const teacherValue = waTeacherSelection.value;
  const message = waMessage.value;

  if (!message) {
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'Please enter a message';
    return;
  }
  if (!teacherValue) {
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'Please select a teacher';
    return;
  }

  sendWaButton.innerHTML = 'Please wait the message is sending...';
  sendWaButton.disabled = true;
  try {
    const response = await fetch(
      `/employee/send-wa?teacher=${teacherValue}&message=${message}`
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const responseData = await response.json();
    console.log(responseData);
    if (response.ok) {
      successToast.classList.add('show');
      successToast.innerHTML = responseData.message;

      setTimeout(() => {
        window.location.reload();
        sendWaButton.innerHTML =
          'Messages Sent and the page will reload in 3 seconds';
      }, 3000);
    } else {
      errorMessage.classList.add('show');
      errorMessage.innerHTML = responseData.message;
      setTimeout(() => {
        window.location.reload();
        sendWaButton.innerHTML =
          'Messages was not sent and the page will reload in 6 seconds';
      }, 6000);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'An error occurred. Please try again later.';
    setTimeout(() => {
      window.location.reload();
      sendWaButton.innerHTML =
        'Messages was not sent and the page will reload in 6 seconds';
    }, 6000);
  }
});

// Convert table to Excel
const exportToExcelBtn = document.getElementById('exportToExcelBtn');
exportToExcelBtn.addEventListener('click', () => {
  const tableData = [];
  const rows = studentTableBody.querySelectorAll('tr');

  rows.forEach((row, index) => {
    const sequenceNumber = index + 1;
    const studentName = row.cells[1].textContent;
    const studentPhoneNumber = row.cells[2].textContent;
    const studentParentPhone = row.cells[3].textContent;
    const studentCode = row.cells[4].textContent;

    tableData.push({
      '#': sequenceNumber,
      'Student Name': studentName,
      'Student Phone Number': studentPhoneNumber,
      'Parent Phone Number': studentParentPhone,
      'Student Code': studentCode,
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Apply styles
  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center' },
    fill: { fgColor: { rgb: 'FFFF00' } },
  };

  const cellStyle = {
    alignment: { horizontal: 'center' },
  };

  // Apply header style
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!worksheet[address]) continue;
    worksheet[address].s = headerStyle;
  }

  // Apply cell style
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[address]) continue;
      worksheet[address].s = cellStyle;
    }
  }

  XLSX.writeFile(workbook, 'students.xlsx');
});




// send code again 

const sendCodeAgain = async (studentId) => {
  if (!confirm('Are you sure you want to send the code again?')) return;

  try {
    const response = await fetch(`/employee/send-code-again/${studentId}`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to send code');

    const responseData = await response.json();
    successToast.classList.add('show');
    messageToast.innerHTML = responseData.message;
  } catch (error) {
    console.error('Error sending code:', error);
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'An error occurred. Please try again later.';
  }
}
// Close modal

// Handle payment type change
document.getElementById('paymentType').addEventListener('change', function() {
  const paymentType = this.value;
  const perCourseOptions = document.getElementById('perCourseOptions');
  
  if (paymentType === 'perCourse') {
    perCourseOptions.style.display = 'block';
  } else {
    perCourseOptions.style.display = 'none';
  }
  
  // Update course price displays
  updateCoursePriceDisplays();
});

// Update course price displays based on payment type
function updateCoursePriceDisplays() {
  const paymentType = document.getElementById('paymentType').value;
  const isPerCourse = paymentType === 'perCourse';
  
  // Update all course price inputs
  document.querySelectorAll('.course-price').forEach(input => {
    const courseId = input.id;
    const totalDisplay = document.getElementById('courseTotal_' + courseId.replace('price_', ''));
    
    if (totalDisplay) {
      if (isPerCourse) {
        totalDisplay.style.display = 'block';
        updateTotalCost(courseId);
      } else {
        totalDisplay.style.display = 'none';
      }
    }
  });
}

// Update total cost display for a course
function updateTotalCost(courseId) {
  const priceInput = document.getElementById(courseId);
  const totalSpan = document.getElementById('totalCost_' + courseId.replace('price_', ''));
  
  if (priceInput && totalSpan) {
    const price = parseFloat(priceInput.value) || 0;
    totalSpan.textContent = price.toLocaleString();
  }
}

// Add event listeners to course price inputs to update total cost in real-time
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners to all course price inputs
  document.querySelectorAll('.course-price').forEach(input => {
    input.addEventListener('input', function() {
      const courseId = this.id;
      updateTotalCost(courseId);
    });
  });
});

// Enhanced toggleCoursePrice function
function toggleCoursePrice(checkbox, teacherId, course) {
  const priceInput = document.getElementById(`price_${course}_${teacherId}`);
  const registerPriceInput = document.getElementById(`registerPrice_${course}_${teacherId}`);
  const totalDisplay = document.getElementById(`courseTotal_${course}_${teacherId}`);
  
  if (checkbox.checked) {
    priceInput.disabled = false;
    registerPriceInput.disabled = false;
    
    // Show total cost display for perCourse payment
    const paymentType = document.getElementById('paymentType').value;
    if (paymentType === 'perCourse' && totalDisplay) {
      totalDisplay.style.display = 'block';
      // Update the total cost immediately when checkbox is checked
      updateTotalCost(priceInput.id);
    }
  } else {
    priceInput.disabled = true;
    registerPriceInput.disabled = true;
    priceInput.value = '';
    registerPriceInput.value = '';
    
    if (totalDisplay) {
      totalDisplay.style.display = 'none';
    }
  }
}

// Add installment function for edit modal
function addInstallment(teacherId, courseName) {
  const installmentInput = document.getElementById(`edit_newInstallment_${courseName}_${teacherId}`);
  const amount = parseFloat(installmentInput.value);
  
  if (!amount || amount <= 0) {
    alert('يرجى إدخال مبلغ صحيح');
    return;
  }
  
  const studentId = document.getElementById('editStudentId').value;
  
  // Call API to add installment
  fetch('/employee/add-installment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentId: studentId,
      teacherId: teacherId,
      courseName: courseName,
      installmentAmount: amount,
      notes: ''
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      alert('تم إضافة القسط بنجاح');
      installmentInput.value = '';
      // Refresh the installment history
      loadInstallmentHistory(teacherId, courseName);
    } else {
      alert('حدث خطأ أثناء إضافة القسط');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('حدث خطأ أثناء إضافة القسط');
  });
}

// Load installment history for a course
function loadInstallmentHistory(teacherId, courseName) {
  const studentId = document.getElementById('editStudentId').value;
  
  fetch(`/employee/installment-history/${studentId}`)
    .then(response => response.json())
    .then(data => {
      if (data.installmentHistory) {
        displayInstallmentHistory(teacherId, courseName, data.installmentHistory);
        updateCourseTotals(teacherId, courseName, data.student);
      }
    })
    .catch(error => {
      console.error('Error loading installment history:', error);
    });
}

// Display installment history in the edit modal
function displayInstallmentHistory(teacherId, courseName, installmentHistory) {
  const container = document.getElementById(`edit_installmentHistory_${courseName}_${teacherId}`);
  
  // Filter installments for this specific course
  const courseInstallments = installmentHistory.filter(item => 
    item.courseName === courseName
  );
  
  if (courseInstallments.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد أقساط مدفوعة لهذا الكورس</p>';
    return;
  }
  
  let html = `
    <table class="table table-sm">
      <thead>
        <tr>
          <th>التاريخ</th>
          <th>المبلغ</th>
          <th>بواسطة</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  courseInstallments.forEach(installment => {
    html += `
      <tr>
        <td>${new Date(installment.date).toLocaleDateString()}</td>
        <td>${installment.amount} ج.م</td>
        <td>${installment.employeeName}</td>
        <td>${installment.notes || '-'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Update course totals in edit modal
function updateCourseTotals(teacherId, courseName, student) {
  const teacherEntry = student.selectedTeachers.find(t => t.teacherId._id === teacherId);
  if (!teacherEntry) return;
  
  const course = teacherEntry.courses.find(c => c.courseName === courseName);
  if (!course) return;
  
  const totalCostInput = document.getElementById(`edit_totalCourseCost_${courseName}_${teacherId}`);
  const totalPaidInput = document.getElementById(`edit_totalPaid_${courseName}_${teacherId}`);
  const remainingInput = document.getElementById(`edit_remainingAmount_${courseName}_${teacherId}`);
  
  if (totalCostInput) totalCostInput.value = course.totalCourseCost || 0;
  
  const totalPaid = course.installments ? course.installments.reduce((sum, inst) => sum + inst.amount, 0) : 0;
  if (totalPaidInput) totalPaidInput.value = totalPaid;
  
  if (remainingInput) remainingInput.value = course.amountRemaining || 0;
}

// Enhanced edit student function to show installment history
function editStudent(studentId) {
  fetch(`/employee/get-student/${studentId}`)
    .then(response => response.json())
    .then(student => {
      // Populate form fields
      document.getElementById('editStudentId').value = student._id;
      document.getElementById('editStudentName').value = student.studentName;
      document.getElementById('editStudentPhone').value = student.studentPhoneNumber;
      document.getElementById('editStudentParentPhone').value = student.studentParentPhone;
      
      // Show payment type
      document.getElementById('modalPaymentType').textContent = 
        student.paymentType === 'perCourse' ? 'Per Course' : 'Per Session';
      
      // Show/hide installment section based on payment type
      const installmentSection = document.getElementById('perCourseInstallmentSection');
      if (student.paymentType === 'perCourse') {
        installmentSection.style.display = 'block';
        // Load installment history for each course
        student.selectedTeachers.forEach(({ teacherId, courses }) => {
          courses.forEach(course => {
            if (course.totalCourseCost > 0) {
              loadInstallmentHistory(teacherId._id, course.courseName);
            }
          });
        });
      } else {
        installmentSection.style.display = 'none';
      }
      
      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
      modal.show();
    })
    .catch(error => {
      console.error('Error fetching student:', error);
      alert('حدث خطأ أثناء تحميل بيانات الطالب');
    });
}

// Open Pay Installment Modal
function openPayInstallmentModal(studentId) {
  fetch(`/employee/get-student/${studentId}`)
    .then(response => response.json())
    .then(student => {
      if (student.paymentType !== 'perCourse') {
        alert('هذا الطالب ليس مسجل بنظام الدفع بالكورس');
        return;
      }
      
      // Check if student has any courses assigned
      if (!student.selectedTeachers || student.selectedTeachers.length === 0) {
        const content = document.getElementById('payInstallmentContent');
        content.innerHTML = `
          <div class="alert alert-warning">
            <h6 class="mb-2">لا توجد دورات مسندة لهذا الطالب</h6>
            <p class="mb-0">يجب إضافة دورات للطالب أولاً قبل إمكانية دفع الأقساط.</p>
          </div>
        `;
        return;
      }
      
      const content = document.getElementById('payInstallmentContent');
      let html = `
        <div class="row">
          <div class="col-12">
            <h6 class="mb-3">الطالب: ${student.studentName}</h6>
            <p class="text-muted">نوع الدفع: بالكورس</p>
          </div>
        </div>
      `;
      
      let hasValidCourses = false;
      
      // Add course sections
      student.selectedTeachers.forEach(({ teacherId, courses }) => {
        if (courses && courses.length > 0) {
          courses.forEach(course => {
            // Show course even if totalCourseCost is 0, but with a warning
            const totalPaid = course.installments ? course.installments.reduce((sum, inst) => sum + inst.amount, 0) : 0;
            const remaining = course.amountRemaining || 0;
            
            if (course.totalCourseCost > 0) {
              hasValidCourses = true;
            }
            
            html += `
              <div class="card mb-3">
                <div class="card-header">
                  <h6 class="mb-0">الكورس: ${course.courseName} - المعلم: ${teacherId.teacherName}</h6>
                  ${course.totalCourseCost <= 0 ? '<span class="badge bg-warning">تحذير: تكلفة الكورس غير محددة</span>' : ''}
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-3">
                      <label class="form-label">إجمالي تكلفة الكورس:</label>
                      <input type="number" class="form-control" value="${course.totalCourseCost || 0}" readonly>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label">إجمالي المدفوع:</label>
                      <input type="number" class="form-control" value="${totalPaid}" readonly>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label">المبلغ المتبقي:</label>
                      <input type="number" class="form-control" value="${remaining}" readonly>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label">قسط جديد:</label>
                      <div class="input-group">
                        <input type="number" class="form-control" id="newInstallment_${course.courseName}_${teacherId._id}" 
                               placeholder="المبلغ" min="0" max="${remaining}" step="0.01" ${course.totalCourseCost <= 0 ? 'disabled' : ''}>
                        <button type="button" class="btn btn-success" onclick="addNewInstallment('${teacherId._id}', '${course.courseName}', '${student._id}')" ${course.totalCourseCost <= 0 ? 'disabled' : ''}>
                          إضافة
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-3">
                    <h6>سجل الأقساط:</h6>
                    <div id="installmentHistory_${course.courseName}_${teacherId._id}" class="table-responsive">
                      <!-- سجل الأقساط سيتم تحميله هنا -->
                    </div>
                  </div>
                </div>
              </div>
            `;
          });
        }
      });
      
      if (!hasValidCourses) {
        html = `
          <div class="alert alert-warning">
            <h6 class="mb-2">لا توجد دورات صالحة للدفع</h6>
            <p class="mb-0">جميع الدورات المسندة للطالب لا تحتوي على تكلفة صالحة.</p>
          </div>
        `;
      }
      
      content.innerHTML = html;
      
      // Load installment history for all courses
      if (hasValidCourses) {
        loadPayInstallmentHistory(studentId);
      }
    })
    .catch(error => {
      console.error('Error fetching student:', error);
      alert('حدث خطأ أثناء تحميل بيانات الطالب');
    });
}
 
// Load installment history for pay installment modal
function loadPayInstallmentHistory(studentId) {
  fetch(`/employee/installment-history/${studentId}`)
    .then(response => response.json())
    .then(data => {
      console.log('Installment history data:', data);
      if (data.installmentHistory) {
        console.log('Installment history array:', data.installmentHistory);
        // Group installments by course name (since teacherId is not in the response)
        const courseGroups = {};
        data.installmentHistory.forEach(installment => {
          const key = `${installment.courseName}_${installment.teacherId}`;
          if (!courseGroups[key]) {
            courseGroups[key] = [];
          }
          courseGroups[key].push(installment);
        });
        
        console.log('Grouped installments:', courseGroups);
        
        // Display history for each course
        Object.keys(courseGroups).forEach(key => {
          const [courseName, teacherId] = key.split('_');
          const container = document.getElementById(`installmentHistory_${courseName}_${teacherId}`);
          console.log(`Looking for container: installmentHistory_${courseName}_${teacherId}`);
          if (container) {
            console.log(`Found container for course: ${courseName}, teacher: ${teacherId}`);
            displayPayInstallmentHistory(container, courseGroups[key]);
          } else {
            console.log(`Container not found for course: ${courseName}, teacher: ${teacherId}`);
          }
        });
      }
    })
    .catch(error => {
      console.error('Error loading installment history:', error);
    });
}
 
// Display installment history in pay installment modal
function displayPayInstallmentHistory(container, installments) {
  if (installments.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد أقساط مدفوعة لهذا الكورس</p>';
    return;
  }
  
  let html = `
    <table class="table table-sm">
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount</th>
          <th>By</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  installments.forEach(installment => {
    html += `
      <tr>
        <td>${new Date(installment.date).toLocaleDateString()}</td>
        <td>${installment.amount} EGP</td>
        <td>${installment.employeeName}</td>
        <td>${installment.notes || '-'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}
 
// Add new installment from pay installment modal
function addNewInstallment(teacherId, courseName, studentId) {
  const input = document.getElementById(`newInstallment_${courseName}_${teacherId}`);
  const addButton = document.querySelector(`button[onclick="addNewInstallment('${teacherId}', '${courseName}', '${studentId}')"]`);
  const amount = parseFloat(input.value);
  
  console.log('Adding new installment:', {
    teacherId,
    courseName,
    studentId,
    amount,
    inputValue: input.value
  });
  
  if (!amount || amount <= 0) {
    alert('يرجى إدخال مبلغ صحيح');
    return;
  }
  
  // Show loader on button
  const originalButtonText = addButton.innerHTML;
  addButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>جاري الإضافة...';
  addButton.disabled = true;
  input.disabled = true;
  
  // Call API to add installment
  fetch('/employee/add-installment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentId: studentId,
      teacherId: teacherId,
      courseName: courseName,
      installmentAmount: amount,
      notes: ''
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Installment API response:', data);
    if (data.message) {
      // Show success message
      showToast('تم إضافة القسط بنجاح', 'success');
      input.value = '';
      // Refresh the installment history
      loadPayInstallmentHistory(studentId);
      // Refresh the student table to show updated data
      getStudents();
    } else {
      showToast('حدث خطأ أثناء إضافة القسط', 'error');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('حدث خطأ أثناء إضافة القسط', 'error');
  })
  .finally(() => {
    // Restore button and input
    addButton.innerHTML = originalButtonText;
    addButton.disabled = false;
    input.disabled = false;
  });
}

// Block/Unblock Student Functions
function openBlockModal(studentId) {
  document.getElementById('blockStudentId').value = studentId;
  document.getElementById('blockReason').value = '';
}

function openUnblockModal(studentId) {
  document.getElementById('unblockStudentId').value = studentId;
}

// Block student
async function blockStudent() {
  const studentId = document.getElementById('blockStudentId').value;
  const reason = document.getElementById('blockReason').value.trim();
  
  if (!reason) {
    showToast('يرجى إدخال سبب الحظر', 'error');
    return;
  }
  
  const confirmBtn = document.getElementById('confirmBlockBtn');
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = 'جاري الحظر...';
  confirmBtn.disabled = true;
  
  try {
    const response = await fetch(`/employee/block-student/${studentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('تم حظر الطالب بنجاح', 'success');
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('blockStudentModal'));
      modal.hide();
      // Refresh student table
      getStudents();
    } else {
      showToast(data.message || 'حدث خطأ أثناء حظر الطالب', 'error');
    }
  } catch (error) {
    console.error('Error blocking student:', error);
    showToast('حدث خطأ أثناء حظر الطالب', 'error');
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
  }
}

// Unblock student
async function unblockStudent() {
  const studentId = document.getElementById('unblockStudentId').value;
  
  const confirmBtn = document.getElementById('confirmUnblockBtn');
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = 'جاري إلغاء الحظر...';
  confirmBtn.disabled = true;
  
  try {
    const response = await fetch(`/employee/unblock-student/${studentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('تم إلغاء حظر الطالب بنجاح', 'success');
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('unblockStudentModal'));
      modal.hide();
      // Refresh student table
      getStudents();
    } else {
      showToast(data.message || 'حدث خطأ أثناء إلغاء حظر الطالب', 'error');
    }
  } catch (error) {
    console.error('Error unblocking student:', error);
    showToast('حدث خطأ أثناء إلغاء حظر الطالب', 'error');
  } finally {
    confirmBtn.textContent = originalText;
    confirmBtn.disabled = false;
  }
}

// Add event listeners for block/unblock buttons
document.addEventListener('DOMContentLoaded', function() {
  // Block student button
  const confirmBlockBtn = document.getElementById('confirmBlockBtn');
  if (confirmBlockBtn) {
    confirmBlockBtn.addEventListener('click', blockStudent);
  }
  
  // Unblock student button
  const confirmUnblockBtn = document.getElementById('confirmUnblockBtn');
  if (confirmUnblockBtn) {
    confirmUnblockBtn.addEventListener('click', unblockStudent);
  }
});