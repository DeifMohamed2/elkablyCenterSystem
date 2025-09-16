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



// Currency formatter available globally
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

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
          <h6 class="text-sm font-weight-bold">${employee.employeeName}</h6>
        </td>
        <td class="align-middle text-center">${employee.employeePhoneNumber}</td>
        <td class="align-middle text-center"><span class="pw" data-pw="${employee.employeePassword}">********</span> <button class="btn btn-link btn-sm toggle-pw" data-id="${employee._id}">Show</button></td>
        <td class="align-middle text-center">${formatCurrency(employee.employeeSalary)}</td>
        <td class="align-middle text-center">
          <div class="btn-group" role="group">
            <a href="/admin/employee-log?id=${employee._id}" class="btn btn-info btn-sm me-2">
              <i class="material-symbols-rounded">visibility</i>
              Employee Log
            </a>
            <button class="btn btn-warning btn-sm edit-employee-btn" data-id="${employee._id}" 
              data-bs-toggle="modal" data-bs-target="#editEmployeeModal">
              <i class="material-symbols-rounded">edit</i>
              Edit
            </button>
            <button class="btn btn-danger btn-sm delete-employee-btn" data-id="${employee._id}">
              <i class="material-symbols-rounded">delete</i>
              Delete
            </button>
          </div>
        </td>
      `;
      employeeTable.appendChild(tr);
    });

    // Attach event listener for Edit buttons
    document
      .querySelectorAll('.edit-employee-btn')
      .forEach((btn) =>
        btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id))
      );

    document
      .querySelectorAll('.delete-employee-btn')
      .forEach((btn) =>
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          if (!confirm('Delete this employee?')) return;
          try {
            const resp = await fetch(`/admin/delete-employee/${id}`, { method: 'DELETE' });
            if (!resp.ok) throw new Error('Delete failed');
            e.currentTarget.closest('tr').remove();
          } catch (err) {
            alert('Failed to delete employee');
          }
        })
      );

    document.querySelectorAll('.toggle-pw').forEach((btn)=>{
      btn.addEventListener('click', (e)=>{
        const row = e.currentTarget.closest('tr');
        const span = row.querySelector('.pw');
        const isHidden = span.textContent === '********';
        span.textContent = isHidden ? span.dataset.pw : '********';
        e.currentTarget.textContent = isHidden ? 'Hide' : 'Show';
      });
    });


    // formatCurrency now defined globally

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
  const employeePassword = document.getElementById('editEmployeePassword')?.value;

  try {
    const response = await fetch(`/admin/get-employee/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeName,
        employeePhoneNumber,
        // Only send salary if provided
        ...(employeeSalary !== '' ? { employeeSalary: parseFloat(employeeSalary) } : {}),
        ...(employeePassword ? { employeePassword } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to update employee');
    }

    const updatedEmployee = await response.json();

    // Update the row in the table
    const row = document.querySelector(`button[data-id="${id}"]`).closest('tr');
    row.cells[0].textContent = updatedEmployee.employeeName;
    row.cells[1].textContent = updatedEmployee.employeePhoneNumber;
    row.cells[2].textContent = formatCurrency(updatedEmployee.employeeSalary);

    // Close the modal
    // editEmployeeModal.hide();
    alert('Employee updated successfully!');
  } catch (error) {
    console.error('Error updating employee:', error);
    alert(error.message || 'Failed to save changes. Please try again.');
  }
});



getEmployees();

// Show/Hide password toggles
document.addEventListener('DOMContentLoaded', ()=>{
  const addPw = document.getElementById('employeePassword');
  const toggleAdd = document.getElementById('toggleAddPw');
  if (addPw && toggleAdd){
    toggleAdd.addEventListener('click', ()=>{
      const isPw = addPw.type === 'password';
      addPw.type = isPw ? 'text' : 'password';
      toggleAdd.innerHTML = isPw ? '<i class="material-symbols-rounded">visibility_off</i>' : '<i class="material-symbols-rounded">visibility</i>';
    });
  }

  const editPw = document.getElementById('editEmployeePassword');
  const toggleEdit = document.getElementById('toggleEditPw');
  if (editPw && toggleEdit){
    toggleEdit.addEventListener('click', ()=>{
      const isPw = editPw.type === 'password';
      editPw.type = isPw ? 'text' : 'password';
      toggleEdit.innerHTML = isPw ? '<i class="material-symbols-rounded">visibility_off</i>' : '<i class="material-symbols-rounded">visibility</i>';
    });
  }
});

// Supervisors CRUD
const supervisorTable = document.getElementById('supervisorTable');
async function loadSupervisors(){
  if (!supervisorTable) return;
  supervisorTable.querySelector('tbody').innerHTML = '';
  const res = await fetch('/admin/all-supervisors');
  if (!res.ok) return;
  const supervisors = await res.json();
  supervisors.forEach((sv)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="align-middle text-center"><h6 class="text-sm font-weight-bold">${sv.name}</h6></td>
      <td class="align-middle text-center">${sv.phoneNumber}</td>
      <td class="align-middle text-center"><span class="pw" data-pw="${sv.password}">********</span> <button class="btn btn-link btn-sm toggle-sv-pw" data-id="${sv._id}">Show</button></td>
      <td class="align-middle text-center">
        <div class="btn-group" role="group">
          <button class="btn btn-warning btn-sm edit-supervisor-btn" data-id="${sv._id}"><i class="material-symbols-rounded">edit</i>Edit</button>
          <button class="btn btn-danger btn-sm delete-supervisor-btn" data-id="${sv._id}"><i class="material-symbols-rounded">delete</i>Delete</button>
        </div>
      </td>`;
    supervisorTable.querySelector('tbody').appendChild(tr);
  });

  document.querySelectorAll('.toggle-sv-pw').forEach((btn)=>{
    btn.addEventListener('click', (e)=>{
      const row = e.currentTarget.closest('tr');
      const span = row.querySelector('.pw');
      const isHidden = span.textContent === '********';
      span.textContent = isHidden ? span.dataset.pw : '********';
      e.currentTarget.textContent = isHidden ? 'Hide' : 'Show';
    });
  });

  document.querySelectorAll('.delete-supervisor-btn').forEach((btn)=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.currentTarget.dataset.id;
      if (!confirm('Delete this supervisor?')) return;
      const resp = await fetch(`/admin/delete-supervisor/${id}`, { method:'DELETE' });
      if (resp.ok) e.currentTarget.closest('tr').remove();
    });
  });

  document.querySelectorAll('.edit-supervisor-btn').forEach((btn)=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.currentTarget.dataset.id;
      const name = prompt('New name (leave blank to keep)');
      const phone = prompt('New phone (leave blank to keep)');
      const password = prompt('New password (leave blank to keep)');
      const body = {};
      if (name) body.name = name;
      if (phone) body.phoneNumber = phone;
      if (password) body.password = password;
      const resp = await fetch(`/admin/get-supervisor/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
      if (resp.ok) loadSupervisors();
    });
  });
}

const addSupervisorForm = document.getElementById('addSupervisorForm');
if (addSupervisorForm){
  const toggleSvPw = document.getElementById('toggleSvPw');
  const svPw = document.getElementById('svPassword');
  if (toggleSvPw && svPw){
    toggleSvPw.addEventListener('click', ()=>{
      const isPw = svPw.type === 'password';
      svPw.type = isPw ? 'text' : 'password';
      toggleSvPw.innerHTML = isPw ? '<i class="material-symbols-rounded">visibility_off</i>' : '<i class="material-symbols-rounded">visibility</i>';
    });
  }
  addSupervisorForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('svName').value;
    const phoneNumber = document.getElementById('svPhone').value;
    const password = document.getElementById('svPassword').value;
    const resp = await fetch('/admin/add-supervisor', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, phoneNumber, password })});
    if (resp.ok){
      addSupervisorForm.reset();
      loadSupervisors();
    } else {
      alert('Failed to add supervisor');
    }
  });
  loadSupervisors();
}
