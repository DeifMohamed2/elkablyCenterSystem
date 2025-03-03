const addNewEmployeeBtn = document.getElementById('addNewEmployeeBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const spinner = document.getElementById('spinner');


function resetAndSpinner(){
    spinner.classList.add('d-none');
    form.reset();
}

function closeMessage(){
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

addNewEmployeeBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    spinner.classList.remove('d-none');
    closeMessage();
    const form = document.getElementById('addEmployeeForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    const response = await fetch('/admin/add-employee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (response.ok) {
      successMessage.style.display = 'block';  
      resetAndSpinner();
        // window.location.href = '/admin/employee';
    } else {
        errorMessage.style.display = 'block'
        errorMessage.innerHTML = responseData.message;
        resetAndSpinner();
        return;

    }
  
});



// Get ALL Employees

const employeeTable = document.getElementById('employeeTable');

const getEmployees = async () => {
  try {
    const response = await fetch('/admin/all-employee');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const employees = await response.json();

    // Populate table
    employees.forEach((employee) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="align-middle text-center">
          <h1 class="text-sm" >${employee.employeeName}</h1>
         </td>
        <td class="align-middle text-center">${
          employee.employeePhoneNumber
        }</td>
        <td class="align-middle text-center">${employee.employeePassword}</td>
        <td class="align-middle text-center">${employee.employeeSalary}</td>
        <td class="align-middle text-center">
          <span class="KPIColor">${employee.totalKPIs || 0}</span> 
          <input type="number" class="form-control kpi-input" placeholder="Add Bouns" style="display: inline-block; width: 110px; margin-left: 10px; border:1px solid #000" />
        </td>
        <td class="align-middle text-center">
          <span class="LossColor">${employee.totalLosses || 0}</span>
          
          <input type="number" class="form-control loss-input" placeholder="Add Loss" style="display: inline-block; width: 100px; margin-left: 10px; border:1px solid #000" />
        </td>
        <td class="align-middle text-center">${
          employee.totalSalary || calculateTotalSalary(employee)
        }</td>
        <td class="align-middle text-center ">
          <button class="save-changes mt-2" data-id="${
            employee._id
          }">Save Changes</button>
        </td>

        <td class="align-middle text-center">
          <button class="btn btn-warning edit-employee-btn mt-2" data-id="${employee._id}" 
          data-bs-toggle="modal" data-bs-target="#editEmployeeModal">Edit</button>
        </td>

      `;
      employeeTable.appendChild(tr);
    });

    // Attach event listener for Save Changes buttons
    document
      .querySelectorAll('.save-changes')
      .forEach((btn) =>
        btn.addEventListener('click', (e) => saveChanges(e.target.dataset.id))
      );


      document.addEventListener('click', (event) => {
        if (event.target.classList.contains('edit-employee-btn')) {
          const employeeId = event.target.dataset.id;
          openEditModal(employeeId);
        }
      });

  } catch (error) {
    console.error('Error fetching employees:', error);
  }
};

// Calculate total salary
const calculateTotalSalary = (employee) => {
  return employee.employeeSalary + employee.totalKPIs - employee.totalLosses;
};

// Save Changes Function
const saveChanges = async (id) => {
  const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
  const kpiInput = row.querySelector('.kpi-input').value;
  const lossInput = row.querySelector('.loss-input').value;

  try {
    const response = await fetch(`/admin/update-salary/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kpi: parseFloat(kpiInput) || 0,
        loss: parseFloat(lossInput) || 0,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save changes');
    }

    const updatedEmployee = await response.json();

    // Update the row with new values
    row.cells[4].innerHTML = `
      <span class="KPIColor">${updatedEmployee.totalKPIs}</span> 
      <input type="number" class="form-control kpi-input" placeholder="Add KPI" style="display: inline-block; width: 100px; margin-left: 10px; border:1px solid #000" />`;
    row.cells[5].innerHTML = `
      <span class="LossColor" >${updatedEmployee.totalLosses}</span>  
      <input type="number" class="form-control loss-input" placeholder="Add Loss" style="display: inline-block; width: 100px; margin-left: 10px; border:1px solid #000" />`;
    row.cells[6].innerHTML = updatedEmployee.totalSalary;
  } catch (error) {
    console.error('Error saving changes:', error);
    alert('Failed to save changes. Please try again.');
  }
};

const editEmployeeModal = document.getElementById('editEmployeeModal');
const saveEditEmployeeBtn = document.getElementById('saveEditEmployeeBtn');

// Event listener for "Edit" buttons

// Open the Edit Modal and populate fields
const openEditModal = async (id) => {
  try {
    const response = await fetch(`/admin/get-employee/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee details');
    }

    const employee = await response.json();
    console.log(employee);
    // Populate the modal fields
    document.getElementById('editEmployeeName').value = employee.employeeName;
    document.getElementById('editEmployeePhone').value = employee.employeePhoneNumber;
    document.getElementById('editEmployeeSalary').value = employee.employeeSalary;
    document.getElementById('editEmployeeId').value = employee._id;
  } catch (error) {
    console.error('Error fetching employee details:', error);
    alert('Failed to open edit modal. Please try again.');
  }
};

// Save changes made in the modal
saveEditEmployeeBtn.addEventListener('click', async () => {
  const id = document.getElementById('editEmployeeId').value;
  const employeeName = document.getElementById('editEmployeeName').value;
  const employeePhoneNumber = document.getElementById('editEmployeePhone').value;
  const employeeSalary = document.getElementById('editEmployeeSalary').value;

  try {
    const response = await fetch(`/admin/get-employee/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeName,
        employeePhoneNumber,
        employeeSalary: parseFloat(employeeSalary),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update employee');
    }

    const updatedEmployee = await response.json();

    // Update the row in the table
    const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
    row.cells[0].textContent = updatedEmployee.employeeName;
    row.cells[1].textContent = updatedEmployee.employeePhoneNumber;
    row.cells[2].textContent = updatedEmployee.employeeSalary;

    // Close the modal
    // editEmployeeModal.hide();
    alert('Employee updated successfully!');
  } catch (error) {
    console.error('Error updating employee:', error);
    alert('Failed to save changes. Please try again.');
  }
});



getEmployees();
