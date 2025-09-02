const spinner2 = document.getElementById('spinner2');

const allBills = document.getElementById('allBills');

const filterBillsForm = document.getElementById('filterBillsForm');

const downloadExcelBtn = document.getElementById('downloadExcelBtn');
// Handle Filter Bills Form Submission
filterBillsForm.addEventListener('submit', async (event) => {
  spinner2.classList.remove('d-none'); // Show spinner

  event.preventDefault();

  // Collect form data
  const formData = new FormData(filterBillsForm);
  const params = new URLSearchParams();

  // Append form data to params
  for (const [key, value] of formData.entries()) {
    params.append(key, value);
  }

  console.log('Form Data:', Object.fromEntries(formData.entries()));

  try {
    spinner2.classList.remove('d-none');

    // Fetch data with filters
    const response = await fetch(`/admin/all-bills?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const { filtered, today, week, month, all } = await response.json();

    // Update counts and totals
    updateStats('filtered', filtered);
    updateStats('today', today);
    updateStats('week', week);
    updateStats('month', month);
    updateStats('all', all);

    // Populate filtered bills only
    allBills.innerHTML = ''; // Clear existing list
    populateBills(filtered.bills);

    spinner2.classList.add('d-none');
  } catch (error) {
    console.error('Error fetching bills:', error);
    spinner2.classList.add('d-none');
  }
});

// Function to Update Stats Blocks
function formatCurrency(val) {
  return `${(val || 0).toLocaleString('en-US')} EGP`;
}

function updateStats(type, data) {
  document.getElementById(`${type}-count`).textContent = data.count || '--';
  const totalEl = document.getElementById(`${type}-total`);
  if (totalEl) totalEl.textContent = formatCurrency(data.total);
  const incomeEl = document.getElementById(`${type}-income`);
  if (incomeEl) incomeEl.textContent = formatCurrency(data.income);
  const expensesEl = document.getElementById(`${type}-expenses`);
  if (expensesEl) expensesEl.textContent = formatCurrency(data.expenses);
  const netEl = document.getElementById(`${type}-net`);
  if (netEl) netEl.textContent = formatCurrency(Math.abs(data.net || 0));

  // Badge and card color
  const badge = document.getElementById(`${type}-badge`);
  const card = document.getElementById(`${type}-card`);
  if (badge && card) {
    // reset
    badge.classList.remove('bg-success', 'bg-danger', 'bg-secondary');
    card.classList.remove('border-success', 'border-danger');

    if ((data.net || 0) > 0) {
      badge.textContent = 'Surplus';
      badge.classList.add('bg-success');
      card.classList.add('border-success');
      card.style.borderWidth = '2px';
    } else if ((data.net || 0) < 0) {
      badge.textContent = 'Deficit';
      badge.classList.add('bg-danger');
      card.classList.add('border-danger');
      card.style.borderWidth = '2px';
    } else {
      badge.textContent = 'Balanced';
      badge.classList.add('bg-secondary');
      card.style.borderWidth = '1px';
    }
  }
}

// Function to Populate Bills List
function populateBills(bills) {
  bills.forEach((bill) => {
    const billItem = document.createElement('li');
    billItem.className = 'list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg';

    const categoryNames = {
      salaries: 'الرواتب',
      canteen_in: 'مقصف (داخل)',
      canteen_out: 'مقصف (خارج)',
      government_fees: 'رسوم حكومية',
      electric_invoices: 'فواتير الكهرباء',
      equipments: 'المعدات والأجهزة',
      other: 'أخرى'
    };

    billItem.innerHTML = `
      <div class="d-flex flex-column">
        <h6 class="mb-3 text-sm">تاريخ : ${new Date(bill.createdAt).toLocaleDateString()} ${new Date(bill.createdAt).toLocaleTimeString()}</h6>
        <span class="mb-2 text-dark SpanTitle">اسم الموظف : <span class="text-dark font-weight-bold me-sm-2">${bill['employee'].employeeName}</span></span>
        <span class="mb-2 text-dark SpanTitle">اسم المنتج : <span class="text-dark font-weight-bold me-sm-2">${bill.billName}</span></span>
        <span class="mb-2 text-dark SpanTitle">فئة الفاتورة : <span class="text-dark font-weight-bold me-sm-2">${categoryNames[bill.billCategory] || 'غير محدد'}</span></span>
        <span class="mb-2 text-dark SpanTitle">سعر الشراء : <span class="text-dark font-weight-bold me-sm-2" dir='ltr'>${formatCurrency(bill.billAmount)}</span></span>
        <span class="text-dark SpanTitle">ملاحظات : <span class="text-dark font-weight-bold me-sm-2">${bill.billNote}</span></span>
        <span><button class="billingPhotoBtn" data-photo-url="${bill.billPhoto}"> ${bill.billPhoto ? 'مشاهده الصوره' : 'لا يوجد صوره'} </button></span>
      </div>
    `;

    allBills.appendChild(billItem);

    const billingPhotoBtn = billItem.querySelector('.billingPhotoBtn');

    billingPhotoBtn.addEventListener('click', () => {
      const photoUrl = billingPhotoBtn.getAttribute('data-photo-url');
      if (photoUrl) {
        window.open(photoUrl, '_blank');
      }
    });
  });
}


// Fetch all bills when the page is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    spinner2.classList.remove('d-none'); // Show spinner

    // Fetch all grouped bills data
    const response = await fetch('/admin/all-bills');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the response
    const { filtered, today, week, month, all } = await response.json();

    // Update stats blocks
    // updateStats('filtered', filtered);
    updateStats('today', today);
    updateStats('week', week);
    updateStats('month', month);
    updateStats('all', all);

    // Populate the list with all bills (all-time)
    allBills.innerHTML = ''; // Clear existing list
    populateBills(all.bills);

    spinner2.classList.add('d-none'); // Hide spinner
  } catch (error) {
    console.error('Error loading bills:', error);
    spinner2.classList.add('d-none'); // Hide spinner in case of error
  }
});



// Download Excel File

downloadExcelBtn.addEventListener('click', async () => {
  try {
    spinner2.classList.remove('d-none'); // Show spinner
    downloadExcelBtn.innerHTML = 'Downloading...'; // Change button text
    // Collect filter parameters
    const formData = new FormData(filterBillsForm);
    const params = new URLSearchParams();

    // Append form data to params
    for (const [key, value] of formData.entries()) {
      params.append(key, value);
    }

    // Fetch the Excel file with filters applied
    const response = await fetch(`/admin/download-excel?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the response as a Blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Create a download link and trigger the download
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    a.download = `كشف فواتير - ${date}.xlsx`;
    a.click();

    // Cleanup the URL object
    URL.revokeObjectURL(url);

    spinner2.classList.add('d-none'); // Hide spinner
    downloadExcelBtn.innerHTML =
      '<i class="material-symbols-rounded text-sm">download</i>&nbsp;&nbsp;Download Excel'; // Reset button text
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    spinner2.classList.add('d-none'); // Hide spinner in case of error
  }
});
