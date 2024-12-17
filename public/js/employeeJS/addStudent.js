const addStudentForm = document.getElementById('addStudentForm');
const spinner = document.getElementById('spinner');
const successToast = document.getElementById('successToast');
const errorMessage = document.getElementById('errorMessage');
const searchStudent = document.getElementById('searchStudent');
const filterTeacherSelection = document.getElementById('filterTeacherSelection');
const searchButton = document.getElementById('searchButton');
const studentTableBody = document.querySelector('#studentTable tbody'); // Target tbody

async function addNewStudent(event) {
  event.preventDefault();

  // Show spinner and hide messages
  spinner.classList.remove('d-none');
  successToast.classList.remove('show');
  errorMessage.classList.remove('show');

  const formData = new FormData(addStudentForm);

  const data = Object.fromEntries(formData);

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
      addStudentForm.reset();
      spinner.classList.add('d-none');
    } else {
      errorMessage.classList.add('show');
      errorMessage.innerHTML = responseData.message;
      spinner.classList.add('d-none');
    }
  } catch (error) {
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'An error occurred. Please try again later.';
    spinner.classList.add('d-none');
  }
}

addStudentForm.addEventListener('submit', addNewStudent);

// Get ALL Students

const studentTable = document.getElementById('studentTable');

// Function to add students to the tbody
const addStudentToTable = (student) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="text-center">${student.studentName}</td>
    <td class="text-center">${student.studentPhoneNumber}</td>
    <td class="text-center">${student.studentParentPhone}</td>
    <td class="text-center">${student.studentAmount}</td>
    <td class="text-center">${student.subject}</td>
    <td class="text-center">${student.studentTeacher['teacherName']}</td>
    <td class="align-middle text-center">
      <button class="edit-student-btn mt-2" data-id="${student._id}" 
      data-bs-toggle="modal" data-bs-target="#editStudentModal">Edit</button>
    </td>
  `;
  studentTableBody.appendChild(tr);

  // Attach the event listener for the edit button dynamically
  tr.querySelector('.edit-student-btn').addEventListener('click', () => {
    openEditModal(student._id);
  });
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
    if (!response.ok) {
      throw new Error('Failed to fetch student details');
    }

    const student = await response.json();
    console.log(student);

    // Populate the modal fields
    document.getElementById('editStudentName').value = student.studentName;
    document.getElementById('editStudentPhone').value =
      student.studentPhoneNumber;
    document.getElementById('editStudentParentPhone').value =
      student.studentParentPhone;
    document.getElementById('editStudentAmount').value =
      student.studentAmount;

    document.getElementById('editSubject').value = student.subject;

    // Set the teacher in the select dropdown
    const teacherSelect = document.getElementById('editTeacherName');
    const teacherId = student.studentTeacher._id; // Ensure this is the ID of the teacher
    console.log(teacherId);
    teacherSelect.value = teacherId;

    document.getElementById('editStudentId').value = student._id;
  } catch (error) {
    console.error('Error fetching student details:', error);
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'هناك مشكله ما يرجي اعاده تحميل الصفحه';
  }
};

// Save updated Data
const editStudentModal = document.getElementById('editStudentModal');
const clodeModalBtn = document.getElementById('clodeModalBtn');
const saveEditStudentBtn = document.getElementById('saveEditStudentBtn');

const saveEditStudent = async () => {
  const editStudentName = document.getElementById('editStudentName').value;
  const editStudentPhone = document.getElementById('editStudentPhone').value;
  const editStudentParentPhone = document.getElementById(
    'editStudentParentPhone'
  ).value;
  const editStudentAmount = document.getElementById('editStudentAmount').value;
  const editSubject = document.getElementById('editSubject').value;
  const editTeacherName = document.getElementById('editTeacherName').value;
  const Id = document.getElementById('editStudentId').value;

  const data = {
    studentName: editStudentName,
    studentPhoneNumber: editStudentPhone,
    studentParentPhone: editStudentParentPhone,
    studentAmount: editStudentAmount,
    subject: editSubject,
    studentTeacher: editTeacherName,
  };

  try {
    const response = await fetch(`/employee/update-student/${Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    console.log(responseData);
    if (response.ok) {
      // Update the row in the table
      const row = document
        .querySelector(`button[data-id="${Id}"]`)
        .closest('tr');
      row.cells[0].textContent = responseData.studentName;
      row.cells[1].textContent = responseData.studentPhoneNumber;
      row.cells[2].textContent = responseData.studentParentPhone;
      row.cells[3].textContent = responseData.studentAmount;
      row.cells[4].textContent = responseData.subject;
      row.cells[5].textContent = responseData.studentTeacher.teacherName;

      clodeModalBtn.click();
      successToast.classList.add('show');
    } else {
      // Handle error response and fade out the modal
      clodeModalBtn.click();
        errorMessage.classList.add('show');
      errorMessage.innerHTML = responseData.message;
    }
  } catch (error) {
      clodeModalBtn.click();
    errorMessage.classList.add('show');
    errorMessage.innerHTML = 'An error occurred. Please try again later.';
  }
};


saveEditStudentBtn.addEventListener('click', saveEditStudent);



// Search Student

searchButton.addEventListener('click', async () => {
    const searchValue = searchStudent.value;
    const teacherValue = filterTeacherSelection.value;
    
    try {
        const response = await fetch(`/employee/search-student?search=${searchValue}&teacher=${teacherValue}`
        );
        if (!response.ok) {
        throw new Error('Failed to search for student');
        }
    
        const students = await response.json();
        console.log(students);
        clearStudentTable(); // Clear the table before populating
        students.forEach(addStudentToTable); // Add each student to the table
    } catch (error) {
        console.error('Error searching for student:', error);
        errorMessage.classList.add('show');
        errorMessage.innerHTML = 'An error occurred. Please try again later.';
    }
    });
