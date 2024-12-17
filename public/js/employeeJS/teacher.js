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
          <div class="col-md-3">
            <input type="time" class="form-control" name="${day}StartTime[]" required>
          </div>
          <div class="col-md-3">
            <input type="time" class="form-control" name="${day}EndTime[]" required>
          </div>
             <div class="col-md-3">
            <input type="text" class="form-control input-group border border-2 rounded w-50 text-center" placeholder="Room ID" name="${day}roomID"  required>
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
      <input type="time" class="form-control" name="${day}StartTime[]" required>
    </div>
    <div class="col-md-3">
      <input type="time" class="form-control" name="${day}EndTime[]" required>
    </div>
    <div class="col-md-3">
      <input type="text" class="form-control input-group border border-2 rounded w-50 text-center" placeholder="Room ID" name="${day}roomID"  required>
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
  const teacherPhoneNumber =
    document.getElementById('teacherPhoneNumber').value;
  const subjectName = document.getElementById('subjectName').value;
  const teacherFees = document.getElementById('teacherFees').value;

  const schedule = {};
  document.querySelectorAll('#timeSlots > .row').forEach((dayDiv) => {
    const day = dayDiv.id.replace('time-slot-', ''); // Extract day name
    schedule[day] = [];

    dayDiv.querySelectorAll('.time-slot-group').forEach((slotGroup) => {
      const startTimeInput = slotGroup.querySelector(
        'input[name*="StartTime"]'
      );
      const endTimeInput = slotGroup.querySelector('input[name*="EndTime"]');
      const roomIDInput = slotGroup.querySelector('input[name*="roomID"]');

      const startTime = startTimeInput ? startTimeInput.value : null;
      const endTime = endTimeInput ? endTimeInput.value : null;
      const roomID = roomIDInput ? roomIDInput.value : null;

      if (startTime && endTime && roomID) {
        schedule[day].push({ startTime, endTime, roomID }); // Add roomID to schedule
      }
    });
  });

  const data = {
    teacherName,
    teacherPhoneNumber,
    subjectName,
    schedule,
    teacherFees,
  };

  console.log(data); // Log the updated data with roomID

  const response = await fetch('/employee/add-teacher', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  if (response.ok) {
    console.log(responseData);

    successMessage.style.display = 'block';
    successMessage.innerHTML = responseData.message;
    resetAndSpinner();
    closeMessage();
  } else {
    console.log(responseData.error, responseData.details);
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = responseData.error;
    resetAndSpinner();
    closeMessage();
    return;
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

// Event to add a new time slot in the edit modal
document.getElementById('addEditTimeSlot').addEventListener('click', () => {
  addEditTimeSlot(); // Empty fields
});

function removeTimeSlot(button) {
  button.closest('.time-slot-group').remove();
}




const editTeacherModal = document.getElementById('editTeacherModal');
const saveTeacherBtn = document.getElementById('saveTeacherBtn');


saveTeacherBtn.addEventListener('click', async () => {
  const teacherId = document.getElementById('editTeacherId').value;
  const teacherName = document.getElementById('editTeacherName').value;
  const teacherPhoneNumber = document.getElementById('editTeacherPhone').value;
  const subjectName = document.getElementById('editTeacherSubject').value;
  const teacherFees = document.getElementById('editTeacherFees').value;

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










