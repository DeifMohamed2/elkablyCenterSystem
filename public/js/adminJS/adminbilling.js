
const addNewBillForm = document.getElementById('addNewBillForm');
const spinner = document.getElementById('spinner');
const spinner2 = document.getElementById('spinner2');
const successToast = document.getElementById('successToast');
const errorMessage = document.getElementById('errorMessage');
const allBills = document.getElementById('allBills');



// Upload photo to Cloudinary
async function uploadPhoto(photoFile) {
  const formData = new FormData();
  formData.append('file', photoFile);
  formData.append('upload_preset', 'Elkably'); // Set in your Cloudinary dashboard
  formData.append('cloud_name', 'dusod9wxt'); // Replace with your Cloudinary cloud name

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/dusod9wxt/image/upload',
    {
      method: 'POST',
      body: formData,
    }
  );

  if (response.ok) {
    const data = await response.json();
    return data.secure_url; // URL of the uploaded image
  } else {
    throw new Error('Photo upload failed');
  }
}


// Add a new bill
async function addNewBill(event) {
  event.preventDefault();

  // Show spinner and hide messages
  spinner.classList.remove('d-none');
  successToast.classList.remove('show');
  errorMessage.classList.remove('show');

  const formData = new FormData(addNewBillForm);
  const billPhoto = formData.get('billPhoto');

  let photoUrl = '';
  try {
    if (billPhoto && billPhoto.size > 0) {
      // Check if a photo file exists and has size
      console.log('Uploading photo...');
      photoUrl = await uploadPhoto(billPhoto); // Upload photo if provided
    }

    // Add other form data
    const data = {
      billName: formData.get('billName'),
      billAmount: formData.get('billAmount'),
      billNote: formData.get('billNote'),
      billPhoto: photoUrl, // Include photo URL or empty if not uploaded
    };

    const response = await fetch('/admin/Admin-add-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    spinner.classList.add('d-none'); // Hide spinner

    if (response.ok) {
      addNewBillForm.reset(); // Clear form
      successToast.classList.add('show'); // Show success message
      setTimeout(() => {
        successToast.classList.remove('show'); // Auto-hide after 3 seconds
      }, 4000);
    } else {
      errorMessage.querySelector('.toast-body').textContent =
        responseData.message || 'An error occurred.';
      errorMessage.classList.add('show'); // Show error message
      setTimeout(() => errorMessage.classList.remove('show'), 5000); // Auto-hide after 5 seconds
    }
  } catch (error) {
    console.error('Error adding bill:', error);
    spinner.classList.add('d-none'); // Hide spinner
    errorMessage.querySelector('.toast-body').textContent =
      'Network error. Please try again.';
    errorMessage.classList.add('show'); // Show error message
    setTimeout(() => errorMessage.classList.remove('show'), 5000); // Auto-hide after 5 seconds
  }
}


addNewBillForm.addEventListener('submit', addNewBill);



// Get ALL Billings

function populateBills (bills){
    bills.forEach((bill) => {
      const billItem = document.createElement('li');
      billItem.className = 'list-group-item border-0 d-flex p-4 mb-2 bg-gray-100 border-radius-lg';


      billItem.innerHTML = `
        <div class="d-flex flex-column">
          <h6 class="mb-3 text-sm">تاريخ : ${new Date(bill.createdAt).toLocaleDateString()} ${new Date(bill.createdAt).toLocaleTimeString()}</h6>
          <span class="mb-2 text-dark SpanTitle">اسم المنتج : <span class="text-dark font-weight-bold me-sm-2">${bill.billName}</span></span>
          <span class="mb-2 text-dark SpanTitle">سعر الشراء : <span class="text-dark font-weight-bold me-sm-2">${bill.billAmount}EGP</span></span>
          <span class="text-dark SpanTitle">ملاحظات : <span class="text-dark font-weight-bold me-sm-2">${bill.billNote}</span></span>
          <span><button class="billingPhotoBtn" data-photo-url="${bill.billPhoto}"> ${bill.billPhoto ? 'مشاهده الصوره':'لا يوجد صوره'} </button></span>
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
    spinner2.classList.remove('d-none');
    const response = await fetch('/admin/Admin-get-all-bills');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    allBills.innerHTML = ''; // Clear existing list
    const Bills = await response.json();
    console.log(Bills);
    populateBills(Bills);
    spinner2.classList.add('d-none');
  } catch (error) {
    console.error(error);
  }
});
