const addKpiForm = document.getElementById('addKpiForm');
const filterKpisForm = document.getElementById('filterKpisForm');
const spinner = document.getElementById('spinner');
const spinner2 = document.getElementById('spinner2');
const successToast = document.getElementById('successToast');
const errorMessage = document.getElementById('errorMessage');
const allKPIs = document.getElementById('allKPIs');

// Add a new KPI

async function addNewKpi(event) {
    event.preventDefault();
    
    // Show spinner and hide messages
    spinner.classList.remove('d-none');
    successToast.classList.remove('show');
    errorMessage.classList.remove('show');
    
    const formData = new FormData(addKpiForm);
    
    const data = {
        employee: formData.get('employee'),
        kpiName: formData.get('kpiName'),
        kpiAmount: formData.get('kpiAmount'),
        kpiNote: formData.get('kpiNote'),
    };
    
    const response = await fetch('/admin/add-kpi', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    
    const responseData = await response.json();
    if (response.ok) {
        successToast.classList.add('show');
        addKpiForm.reset();
        spinner.classList.add('d-none');
        getKPIs()   // Refresh KPIs list
    } else {
        errorMessage.classList.add('show');
        errorMessage.textContent = responseData.message;
        spinner.classList.add('d-none');
    }
}

addKpiForm.addEventListener('submit', addNewKpi);


// Get ALL KPIs


function populateKPIs(KPIs) {
  KPIs.forEach((KPI) => {
    const KPIitem = document.createElement('li');
    KPIitem.className =
      'list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg';

    KPIitem.innerHTML = `
        <div class="d-flex flex-column">
          <h6 class="mb-3 text-sm">تاريخ : ${new Date(
            KPI.createdAt
          ).toLocaleDateString()} ${new Date(KPI.createdAt).toLocaleTimeString()} </h6>
          <span class="mb-2 text-dark SpanTitle"> الاسم   : <span class="text-dark font-weight-bold me-sm-2">${
            KPI.kpiName}
          </span></span>
          <span class="text-dark SpanTitle">المبلغ : <span class="text-dark font-weight-bold me-sm-2">${
            KPI.kpi ? KPI.kpi.toLocaleString('en-US') + ' EGP' : '0 EGP'}
          </span></span>
          <span class="text-dark SpanTitle">ملاحظات : <span class="text-dark font-weight-bold me-sm-2">${
            KPI.kpiNote || 'لا توجد ملاحظات'}
          </span></span>

          <span class="text-dark SpanTitle">الموظف : <span class="text-dark font-weight-bold me-sm-2">
          ${KPI.employee['employeeName']}
          </span></span>

        </div>
            `;

    allKPIs.appendChild(KPIitem);

  });
}


const getKPIs = async () => {
    try {
        spinner2.classList.remove('d-none');
        const response = await fetch('/admin/all-kpis');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const responseData = await response.json();

        allKPIs.innerHTML = ''; // Clear existing list
        // Populate table
        populateKPIs(responseData.KPIs);
        spinner2.classList.add('d-none');
    }
    catch (error) {
        console.error('Error fetching KPIs:', error);
        spinner2.classList.add('d-none');
    }
}


document.addEventListener('DOMContentLoaded', getKPIs);


// Filter KPIs

filterKpisForm.addEventListener('submit', async (event) => {
  spinner2.classList.remove('d-none'); // Show spinner

  event.preventDefault();

  // Collect form data
  const formData = new FormData(filterKpisForm);
  const params = new URLSearchParams();

  // Append form data to params
  for (const [key, value] of formData.entries()) {
    params.append(key, value);
  }

  console.log('Form Data:', Object.fromEntries(formData.entries()));

  try {
    spinner2.classList.remove('d-none');

    // Fetch data with filters
    const response = await fetch(`/admin/all-kpis?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();

    // Populate filtered bills only
    allKPIs.innerHTML = ''; // Clear existing list
    populateKPIs(responseData.filtered);

    spinner2.classList.add('d-none');
  } catch (error) {
    console.error('Error fetching bills:', error);
    spinner2.classList.add('d-none');
  }
});