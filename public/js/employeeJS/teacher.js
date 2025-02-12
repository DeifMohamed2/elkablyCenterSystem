const addTeacherForm = document.getElementById('addTeacherForm');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const spinner = document.getElementById('spinner');
const timeSlots = document.getElementById('timeSlots');

function toggleSchedule(day) {
  const timeSlotsContainer = document.getElementById('timeSlots');
  const dayCheckbox = document.getElementById(day.toLowerCase());

  if (dayCheckbox.checked) {
    // Create a new section for the selected day
    const dayDiv = document.createElement('div');
    dayDiv.id = `time-slot-${day}`;
    dayDiv.className = 'row mb-3';

    dayDiv.innerHTML = `
      <div class="col-md-12">
        <h6>${day}</h6>
        <div class="row mb-2 time-slot-group">
          <div class="col-md-3 ">
            <input type="time"  style="border: 2px solid black; color:black;" class="form-control" name="${day}StartTime[]" required placeholder="Start Time">
          </div>
          <div class="col-md-3" >
            <input type="time"  style="border: 2px solid black;color:black;" class="form-control" name="${day}EndTime[]" required placeholder="End Time">
          </div>
          <div class="col-md-3" >
            <input type="text"  style="border: 2px solid black;color:black;" class="form-control input-group border border-2 rounded w-50 text-center" placeholder="Room ID" name="${day}roomID"  required>
          </div>
          <div class="col-md-2 text-end">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="addTimeSlot('${day}')">+ إضافة وقت آخر</button>
          </div>
        </div>
      </div>
    `;

    timeSlotsContainer.appendChild(dayDiv);
  } else {
    // Remove the day section if the checkbox is unchecked
    const dayDiv = document.getElementById(`time-slot-${day}`);
    if (dayDiv) {
      dayDiv.remove();
    }
  }
}

function addTimeSlot(day) {
  const dayDiv = document.getElementById(`time-slot-${day}`);

  // Create a new time slot row
  const newSlot = document.createElement('div');
  newSlot.className = 'row mb-2 time-slot-group';
  newSlot.innerHTML = `
    <div class="col-md-3">
      <input type="time" style="border: 2px solid black; color:black;"  class="form-control" name="${day}StartTime[]" required placeholder="Start Time">
    </div>
    <div class="col-md-3">
      <input type="time" style="border: 2px solid black; color:black;"  class="form-control" name="${day}EndTime[]" required placeholder="End Time">
    </div>
    <div class="col-md-3">
      <input type="text" style="border: 2px solid black; color:black;" class="form-control input-group border border-2 rounded w-50 text-center" placeholder="Room ID" name="${day}roomID"  required>
    </div>
    
    <div class="col-md-2">
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeTimeSlot(this)">- إزالة الوقت</button>
    </div>
  `;

  dayDiv.appendChild(newSlot);
}

function removeTimeSlot(button) {
  // Remove the time slot row
  const slotRow = button.closest('.time-slot-group');
  if (slotRow) {
    slotRow.remove();
  }
}

function resetAndSpinner() {
  spinner.classList.add('d-none');
  timeSlots.innerHTML = '';
  
  addTeacherForm.reset();
}

function closeMessage() {
    setTimeout(() => {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }, 6000);
}

addTeacherForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  spinner.classList.remove('d-none');

  const teacherName = document.getElementById('teacherName').value;
  const subjectName = document.getElementById('subjectName').value;
  const teacherPhoneNumber = document.getElementById('teacherPhoneNumber').value;
  const teacherFees = document.getElementById('teacherFees').value;
  const paymentType = document.getElementById('paymentType').value;

  // Get all courses
  const courses = [];
  document.querySelectorAll('input[name="courses[]"]').forEach((input) => {
    if (input.value.trim() !== '') {
      courses.push(input.value.trim());
    }
  });

  const schedule = {};
  document.querySelectorAll('#timeSlots > .row').forEach((dayDiv) => {
    const day = dayDiv.id.replace('time-slot-', '');
    schedule[day] = [];

    dayDiv.querySelectorAll('.time-slot-group').forEach((slotGroup) => {
      const startTime = slotGroup.querySelector('input[name*="StartTime"]').value;
      const endTime = slotGroup.querySelector('input[name*="EndTime"]').value;
      const roomID = slotGroup.querySelector('input[name*="roomID"]').value;

      if (startTime && endTime && roomID) {
        schedule[day].push({ startTime, endTime, roomID });
      }
    });
  });

  const data = {
    teacherName,
    teacherPhoneNumber,
    subjectName,
    courses,
    schedule,
    teacherFees,
    paymentType,
  };

  console.log(data);
  const response = await fetch('/employee/add-teacher', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  if (response.ok) {
    successMessage.style.display = 'block';
    successMessage.innerHTML = responseData.message;
    resetAndSpinner();
    closeMessage();
  } else {
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = responseData.error;
    resetAndSpinner();
    closeMessage();
  }
});




// Get ALL Teachers

const teacherTable = document.getElementById('teacherTable');

const getTeachers = async () => {
  try {
    const response = await fetch('/employee/all-teachers');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const teachers = await response.json();
    
    // Populate table
    teachers.forEach((teacher) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="align-middle text-center">
          <h1 class="text-sm" >${teacher.teacherName}</h1>
         </td>
        <td class="align-middle text-center">${teacher.teacherPhoneNumber}</td>
        <td class="align-middle text-center">${teacher.subjectName}</td>
        <td class="align-middle text-center">${teacher.paymentType == 'perSession' ? 'Per Session' : 'Per Course'  }</td>
        <td class="align-middle text-center">${teacher.teacherFees}</td>
        
   
        <td class="align-middle text-center">
          <button class="btn btn-warning edit-teacher-btn mt-2" data-id="${teacher._id}" 
          data-bs-toggle="modal" data-bs-target="#editTeacherModal">Edit</button>
        </td>

      `;
      teacherTable.appendChild(tr);


        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-teacher-btn')) {
              const teacherId = event.target.dataset.id;
              console.log(teacherId);
              openEditModal(teacherId);
            }
          });
    });


  }
  catch (error) {
    console.error('Error getting teachers:', error);
  }
}

document.addEventListener('DOMContentLoaded', getTeachers);


// Open the Edit Modal and populate fields
const openEditModal = async (id) => {
  try {
    const response = await fetch(`/employee/get-teacher/${id}`);
    if (!response.ok) throw new Error('Failed to fetch teacher details');

    const teacher = await response.json();

    // Populate basic teacher info
    document.getElementById('editTeacherName').value = teacher.teacherName;
    document.getElementById('editTeacherPhone').value =
      teacher.teacherPhoneNumber;
    document.getElementById('editTeacherSubject').value = teacher.subjectName;
    document.getElementById('editTeacherFees').value = teacher.teacherFees;
    document.getElementById('editTeacherId').value = teacher._id;

    // Populate schedule
    const editScheduleContainer = document.getElementById(
      'editScheduleContainer'
    );
    editScheduleContainer.innerHTML = ''; // Clear previous slots

    Object.keys(teacher.schedule).forEach((day) => {
      teacher.schedule[day].forEach((slot, index) => {
        addEditTimeSlot(day, slot.startTime, slot.endTime, slot.roomID);
      });
    });

    // Populate courses
    const editCoursesContainer = document.getElementById(
      'editCoursesContainer'
    );
    editCoursesContainer.innerHTML = ''; // Clear previous courses

    teacher.courses.forEach((course) => {
      addEditCourseView(course); // Load each course dynamically
    });

  } catch (error) {
    console.error('Error fetching teacher details:', error);
    alert('Failed to open edit modal. Please try again.');
  }
};

function addEditTimeSlot(day = '', startTime = '', endTime = '', roomID = '') {
  const editScheduleContainer = document.getElementById(
    'editScheduleContainer'
  );

  const timeSlotDiv = document.createElement('div');
  timeSlotDiv.className = 'row mb-2 time-slot-group';
  timeSlotDiv.innerHTML = `
    <div class="col-md-3">
      <select class="form-select" name="day[]" required>
        <option value="" disabled>Select Day</option>
        <option value="Sunday" ${day === 'Sunday' ? 'selected' : ''}>Sunday</option>
        <option value="Monday" ${day === 'Monday' ? 'selected' : ''}>Monday</option>
        <option value="Tuesday" ${day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
        <option value="Wednesday" ${day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
        <option value="Thursday" ${day === 'Thursday' ? 'selected' : ''}>Thursday</option>
        <option value="Friday" ${day === 'Friday' ? 'selected' : ''}>Friday</option>
        <option value="Saturday" ${day === 'Saturday' ? 'selected' : ''}>Saturday</option>
      </select>
    </div>
    <div class="col-md-3">
      <input type="time" class="form-control" placeholder="Start Time" name="startTime[]" value="${startTime}" required>
    </div>
    <div class="col-md-3">
      <input type="time" class="form-control" placeholder="End Time" name="endTime[]" value="${endTime}" required>
    </div>
    <div class="col-md-3">
      <input type="text" class="form-control border border-1 text-center" placeholder="Room ID" name="roomID[]" value="${roomID}" required>
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger" onclick="removeTimeSlot(this)">- Remove</button>
    </div>
  `;
  editScheduleContainer.appendChild(timeSlotDiv);
}

function addEditCourseView(courseName = '') {
  const editCoursesContainer = document.getElementById('editCoursesContainer');

  const newCourseDiv = document.createElement('div');
  newCourseDiv.className = 'row mb-2';
  newCourseDiv.innerHTML = `
    <div class="col-md-4">
      <input type="text" class="form-control" name="editCourses[]" style="border: 2px solid black; width: 100%; text-align: center;" value="${courseName}" placeholder="اسم الكورس" required readonly>
    </div>

  `;

  editCoursesContainer.appendChild(newCourseDiv);
}

function addEditCourse() {
  const editCoursesContainer = document.getElementById('editCoursesContainer');

  const newCourseDiv = document.createElement('div');
  newCourseDiv.className = 'row mb-2';
  newCourseDiv.innerHTML = `
    <div class="col-md-4"> 
      <input type="text" class="form-control" name="editCourses[]" style="border: 2px solid black; width: 100%; text-align: center;" placeholder="اسم الكورس" required>
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger" onclick="removeEditCourse(this)">- إزالة</button>
    </div>
  `;
  editCoursesContainer.appendChild(newCourseDiv);
}


// Event to add a new time slot in the edit modal
document.getElementById('addEditTimeSlot').addEventListener('click', () => {
  addEditTimeSlot(); // Empty fields
});

document.getElementById('addEditCourse').addEventListener('click', () => {
  addEditCourse(); // Add an empty course field
});


function removeTimeSlot(button) {
  button.closest('.time-slot-group').remove();
}


// Function to remove course
function removeEditCourse(button) {
  button.closest('.row').remove();
}


//add courses 
function addCourse() {
  const coursesContainer = document.getElementById('coursesContainer');

  const newCourseDiv = document.createElement('div');
  newCourseDiv.className = 'row mb-2';
  newCourseDiv.innerHTML = `
    <div class="col-md-4">
      <input type="text" class="form-control" name="courses[]" style="border: 2px solid black; width: 100%; text-align: center;"  placeholder="اسم الكورس" required>
    </div>
    <div class="col-md-2">
      <button type="button" class="btn btn-outline-danger" onclick="removeCourse(this)">- إزالة</button>
    </div>
  `;

  coursesContainer.appendChild(newCourseDiv);
}

function removeCourse(button) {
  button.closest('.row').remove();
}



const editTeacherModal = document.getElementById('editTeacherModal');
const saveTeacherBtn = document.getElementById('saveTeacherBtn');

saveTeacherBtn.addEventListener('click', async () => {
  const teacherId = document.getElementById('editTeacherId').value;
  const teacherName = document.getElementById('editTeacherName').value;
  const teacherPhoneNumber = document.getElementById('editTeacherPhone').value;
  const subjectName = document.getElementById('editTeacherSubject').value;
  const teacherFees = document.getElementById('editTeacherFees').value;

  // Collect updated courses
  const courses = [];
  document.querySelectorAll('input[name="editCourses[]"]').forEach((input) => {
    if (input.value.trim() !== '') {
      courses.push(input.value.trim());
    }
  });

  // Collect updated schedule
  const schedule = [];
  document
    .querySelectorAll('#editScheduleContainer .time-slot-group')
    .forEach((group) => {
      const day = group.querySelector('select[name="day[]"]').value;
      const startTime = group.querySelector('input[name="startTime[]"]').value;
      const endTime = group.querySelector('input[name="endTime[]"]').value;
      const roomID = group.querySelector('input[name="roomID[]"]').value;

      if (day && startTime && endTime && roomID) {
        schedule.push({ day, startTime, endTime, roomID });
      }
    });

  const data = {
    teacherName,
    teacherPhoneNumber,
    subjectName,
    teacherFees,
    courses,
    schedule,
  };

  try {
    const response = await fetch(`/employee/update-teacher/${teacherId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to update teacher');

    alert('Teacher updated successfully');
    window.location.reload(); // Refresh table or page
  } catch (error) {
    console.error('Error updating teacher:', error);
    alert('Failed to update teacher.');
  }
});











