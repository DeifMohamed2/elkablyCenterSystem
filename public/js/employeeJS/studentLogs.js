document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const searchForm = document.getElementById('searchForm');
  const searchResults = document.getElementById('searchResults');
  const searchResultsBody = document.getElementById('searchResultsBody');
  const studentDetails = document.getElementById('studentDetails');
  const backToSearchBtn = document.getElementById('backToSearch');
  const spinner = document.getElementById('spinner');
  const message = document.getElementById('message');
  
  // Table loading elements
  const attendanceTableLoading = document.getElementById('attendanceTableLoading');
  const coursesTableLoading = document.getElementById('coursesTableLoading');
  const installmentsTableLoading = document.getElementById('installmentsTableLoading');
  
  // Filter elements
  const teacherFilter = document.getElementById('teacherFilter');
  const courseFilter = document.getElementById('courseFilter');
  const startDateFilter = document.getElementById('startDateFilter');
  const endDateFilter = document.getElementById('endDateFilter');
  const timelineCheckbox = document.getElementById('timelineCheckbox');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const toggleFiltersBtn = document.getElementById('toggleFilters');
  const filtersBody = document.getElementById('filtersBody');
  
  // Store courses by teacher for filtering
  const coursesByTeacher = {};
  const allCourses = new Set();
  
  // No data messages
  const noAttendanceMessage = document.getElementById('noAttendanceMessage');
  const noPaymentsMessage = document.getElementById('noPaymentsMessage');
  const noCoursesMessage = document.getElementById('noCoursesMessage');
  const noInstallmentsMessage = document.getElementById('noInstallmentsMessage');
  
  // Current student ID being viewed
  let currentStudentId = null;

  // Initialize with current date for end date filter
  const today = new Date().toISOString().split('T')[0];
  endDateFilter.value = today;
  
  // Set start date to 30 days ago by default
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  startDateFilter.value = thirtyDaysAgo.toISOString().split('T')[0];

  // Search form submission
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    if (searchTerm.length >= 3) {
      searchStudents(searchTerm);
    } else {
      message.textContent = 'يرجى إدخال 3 أحرف على الأقل للبحث';
      setTimeout(() => {
        message.textContent = '';
      }, 3000);
    }
  });

  // Back to search button
  backToSearchBtn.addEventListener('click', function() {
    studentDetails.style.display = 'none';
    searchResults.style.display = 'block';
    currentStudentId = null;
  });

  // Apply filters
  applyFiltersBtn.addEventListener('click', function() {
    if (currentStudentId) {
      // Show loading spinner
      spinner.classList.remove('d-none');
      message.textContent = 'جاري تطبيق الفلاتر...';
      applyFiltersBtn.disabled = true;
      
      // Pass true to indicate we want to apply filters
      loadStudentData(currentStudentId, true);
    }
  });

  // Reset filters
  resetFiltersBtn.addEventListener('click', function() {
    // Reset all filter values
    teacherFilter.value = '';
    courseFilter.value = '';
    
    // Reset timeline checkbox
    timelineCheckbox.checked = false;
    timelineCheckbox.disabled = true;
    
    // Reset date filters to default (last 30 days)
    const today = new Date().toISOString().split('T')[0];
    endDateFilter.value = today;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDateFilter.value = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Show loading spinner
    if (currentStudentId) {
      spinner.classList.remove('d-none');
      message.textContent = 'جاري إعادة تحميل البيانات...';
      resetFiltersBtn.disabled = true;
      
      // Load data without applying filters (pass false)
      loadStudentData(currentStudentId, false);
      
      // Re-enable button after a short delay
      setTimeout(() => {
        resetFiltersBtn.disabled = false;
      }, 1000);
    }
  });
  
  // Toggle filters visibility
  toggleFiltersBtn.addEventListener('click', function() {
    if (filtersBody.style.display === 'none') {
      filtersBody.style.display = 'block';
      toggleFiltersBtn.innerHTML = '<i class="fas fa-filter text-sm"></i>&nbsp;&nbsp;إخفاء الفلاتر';
    } else {
      filtersBody.style.display = 'none';
      toggleFiltersBtn.innerHTML = '<i class="fas fa-filter text-sm"></i>&nbsp;&nbsp;إظهار الفلاتر';
    }
  });
  
  // Initialize timeline checkbox state
  timelineCheckbox.disabled = true;

  // Search for students
  function searchStudents(searchTerm) {
    // Show loading spinner
    spinner.classList.remove('d-none');
    searchButton.disabled = true;
    message.textContent = '';
    
    fetch(`/employee/search-student?search=${encodeURIComponent(searchTerm)}`)
      .then(response => response.json())
      .then(data => {
        // Hide loading spinner
        spinner.classList.add('d-none');
        searchButton.disabled = false;
        
        // Check if it's a single exact match (by code)
        if (data.length === 1 && (data[0].studentCode === searchTerm || data[0].studentCode === "G" + searchTerm)) {
          // Direct load student data without showing search results
          loadStudentData(data[0]._id);
          return;
        }
        
        // Handle search results
        searchResultsBody.innerHTML = '';
        
        if (data.message || data.length === 0) {
          // No students found
          message.textContent = 'لا توجد نتائج مطابقة';
          searchResults.style.display = 'none';
        } else {
          // Display search results
          data.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td class="text-center">
                ${index + 1}
              </td>
              <td class="text-center">
                ${student.studentName}
              </td>
              <td class="text-center">
                ${student.studentCode}
              </td>
              <td class="text-center">
                ${student.studentPhoneNumber}
              </td>
              <td class="text-center">
                ${student.schoolName}
              </td>
              <td class="text-center">
                <button class="view-student-btn" data-id="${student._id}">عرض</button>
              </td>
            `;
            searchResultsBody.appendChild(row);
          });

          // Add event listeners to view buttons
          document.querySelectorAll('.view-student-btn').forEach(button => {
            button.addEventListener('click', function() {
              const studentId = this.getAttribute('data-id');
              loadStudentData(studentId);
            });
          });
          
          searchResults.style.display = 'block';
        }
      })
      .catch(error => {
        // Hide loading spinner
        spinner.classList.add('d-none');
        searchButton.disabled = false;
        
        console.error('Error searching for students:', error);
        message.textContent = 'حدث خطأ أثناء البحث عن الطلاب';
      });
  }

  // Load student data
  function loadStudentData(studentId, applyFilters = false) {
    currentStudentId = studentId;
    
    // Show loading spinner
    spinner.classList.remove('d-none');
    message.textContent = 'جاري تحميل بيانات الطالب...';
    
    // Show table loading indicators
    attendanceTableLoading.style.display = 'flex';
    coursesTableLoading.style.display = 'flex';
    installmentsTableLoading.style.display = 'flex';
    
    // Build query string based on whether we're applying filters
    let queryString = '';
    
    if (applyFilters) {
      // Get filter values
      const teacherId = teacherFilter.value;
      const courseName = courseFilter.value;
      const startDate = startDateFilter.value;
      const endDate = endDateFilter.value;
      const showTimeline = timelineCheckbox.checked;
      
      // Build query string with filters
      if (teacherId) queryString += `&teacherId=${teacherId}`;
      if (courseName) queryString += `&courseName=${courseName}`;
      if (startDate && !showTimeline) queryString += `&startDate=${startDate}`;
      if (endDate && !showTimeline) queryString += `&endDate=${endDate}`;
      if (showTimeline && teacherId) queryString += `&showTimeline=true`;
    }
    
    // If queryString is not empty, remove the first character (which is '&')
    const finalQueryString = queryString ? `?${queryString.substring(1)}` : '';
    
    fetch(`/employee/student-logs-data/${studentId}${finalQueryString}`)
      .then(response => response.json())
      .then(data => {
        // Hide loading spinner
        spinner.classList.add('d-none');
        message.textContent = '';
        
        // Hide search results and show student details
        searchResults.style.display = 'none';
        studentDetails.style.display = 'block';
        
        // Update student basic info
        document.getElementById('studentName').textContent = data.student.studentName;
        document.getElementById('studentCode').textContent = data.student.studentCode;
        document.getElementById('studentPhone').textContent = data.student.studentPhoneNumber;
        document.getElementById('parentPhone').textContent = data.student.studentParentPhone;
        document.getElementById('schoolName').textContent = data.student.schoolName;
        document.getElementById('paymentType').textContent = data.student.paymentType === 'perSession' ? 'دفع بالحصة' : 'دفع بالكورس';
        
        // Format registration date using English numerals
        const regDate = new Date(data.student.createdAt);
        document.getElementById('registrationDate').textContent = regDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
        // Update statistics
        document.getElementById('totalAttendance').textContent = data.statistics.totalAttendance;
        
        // Format currency
        const formatter = new Intl.NumberFormat('ar-EG', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
        
        const formattedTotalPayments = formatter.format(data.statistics.totalAmountPaid);
        document.getElementById('totalPayments').textContent = `${formattedTotalPayments} EGP`;
        
        // Calculate attendance rate (assuming 2 sessions per week)
        const weeksSinceRegistration = Math.max(1, Math.ceil((new Date() - regDate) / (7 * 24 * 60 * 60 * 1000)));
        const expectedSessions = weeksSinceRegistration * 2;
        const attendanceRate = expectedSessions > 0 ? Math.round((data.statistics.totalAttendance / expectedSessions) * 100) : 0;
        document.getElementById('attendanceRate').textContent = `${attendanceRate}%`;
        
        // Calculate remaining amount
        let totalRemaining = 0;
        data.enrolledCourses.forEach(course => {
          totalRemaining += course.amountRemaining || 0;
        });
        
        const formattedRemaining = formatter.format(totalRemaining);
        document.getElementById('remainingAmount').textContent = `${formattedRemaining} EGP`;
        
        // Update courses count
        document.getElementById('coursesCount').textContent = data.enrolledCourses.length;
        
        // Count active courses (those with remaining amount)
        const activeCourses = data.enrolledCourses.filter(course => course.amountRemaining > 0).length;
        document.getElementById('activeCoursesCount').textContent = activeCourses;
        
        // Count unique teachers
        const uniqueTeachers = new Set(data.enrolledCourses.map(course => course.teacherId));
        document.getElementById('teachersCount').textContent = uniqueTeachers.size;
        
        // Populate teacher and course filters
        populateFilters(data.student);
        
        // Populate attendance table
        populateAttendanceTable(data.attendanceRecords);
        
        // Populate courses table
        populateCoursesTable(data.enrolledCourses);
        
        // Load installment history
        loadInstallmentHistory(studentId);
        
        // Hide spinner and reset buttons
        spinner.classList.add('d-none');
        message.textContent = '';
        applyFiltersBtn.disabled = false;
        resetFiltersBtn.disabled = false;
      })
      .catch(error => {
        // Hide loading spinner
        spinner.classList.add('d-none');
        
        // Hide table loading indicators
        attendanceTableLoading.style.display = 'none';
        coursesTableLoading.style.display = 'none';
        installmentsTableLoading.style.display = 'none';
        
        // Reset button states
        applyFiltersBtn.disabled = false;
        resetFiltersBtn.disabled = false;
        
        console.error('Error loading student data:', error);
        message.textContent = 'حدث خطأ أثناء تحميل بيانات الطالب';
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          message.textContent = '';
        }, 5000);
      });
  }

  // Populate teacher and course filters
  function populateFilters(student) {
    // Clear existing options but keep the default "all" option
    teacherFilter.innerHTML = '<option value="">جميع المعلمين</option>';
    courseFilter.innerHTML = '<option value="">جميع الكورسات</option>';
    
    // Clear previous data
    Object.keys(coursesByTeacher).forEach(key => delete coursesByTeacher[key]);
    allCourses.clear();
    
    // Add teachers and courses from student data
    student.selectedTeachers.forEach(teacherEntry => {
      // Add teacher option
      const teacher = teacherEntry.teacherId;
      const teacherOption = document.createElement('option');
      teacherOption.value = teacher._id;
      teacherOption.textContent = teacher.teacherName;
      teacherFilter.appendChild(teacherOption);
      
      // Store courses for this teacher
      if (!coursesByTeacher[teacher._id]) {
        coursesByTeacher[teacher._id] = [];
      }
      
      // Add course options and store them by teacher
      teacherEntry.courses.forEach(course => {
        coursesByTeacher[teacher._id].push({
          name: course.courseName,
          teacherName: teacher.teacherName
        });
        allCourses.add(course.courseName);
      });
    });
    
    // Add all unique courses to the dropdown initially
    allCourses.forEach(courseName => {
      const courseOption = document.createElement('option');
      courseOption.value = courseName;
      courseOption.textContent = courseName;
      courseFilter.appendChild(courseOption);
    });
  }
  
  // Handle teacher filter change to update course options
  teacherFilter.addEventListener('change', function() {
    const selectedTeacherId = this.value;
    
    // Clear and reset course filter
    courseFilter.innerHTML = '<option value="">جميع الكورسات</option>';
    
    if (selectedTeacherId) {
      // Enable timeline checkbox
      timelineCheckbox.disabled = false;
      
      // Show only courses for the selected teacher
      const teacherCourses = coursesByTeacher[selectedTeacherId] || [];
      teacherCourses.forEach(course => {
        const courseOption = document.createElement('option');
        courseOption.value = course.name;
        courseOption.textContent = course.name;
        courseFilter.appendChild(courseOption);
      });
    } else {
      // Disable timeline checkbox
      timelineCheckbox.disabled = true;
      timelineCheckbox.checked = false;
      
      // Show all courses if no teacher is selected
      allCourses.forEach(courseName => {
        const courseOption = document.createElement('option');
        courseOption.value = courseName;
        courseOption.textContent = courseName;
        courseFilter.appendChild(courseOption);
      });
    }
  });

  // Populate attendance table
  function populateAttendanceTable(attendanceRecords) {
    const tableBody = document.getElementById('attendanceTableBody');
    const noAttendanceMsg = document.getElementById('noAttendanceMessage');
    
    // Show loading indicator
    attendanceTableLoading.style.display = 'flex';
    
    tableBody.innerHTML = '';
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      // Hide loading indicator
      attendanceTableLoading.style.display = 'none';
      noAttendanceMsg.style.display = 'block';
      return;
    }
    
    noAttendanceMsg.style.display = 'none';
      
    // Format currency using English numerals
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    attendanceRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      
      // Format date using English numerals (en-US)
      const recordDate = new Date(record.date);
      const formattedDate = recordDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      // Add alternating row colors
      const rowClass = index % 2 === 0 ? 'bg-light' : '';
      row.className = rowClass;
      
      // Format amount
      const formattedAmount = formatter.format(record.amountPaid);
      
      // Add teacher badge color
      const badgeColor = record.teacher ? 'bg-gradient-info' : 'bg-gradient-secondary';
      
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td class="text-center">
          <div class="d-flex justify-content-center align-items-center">
            <i class="fas fa-calendar-day opacity-10 text-dark me-2" style="font-size: 1rem;"></i>
            <span>${formattedDate}</span>
          </div>
        </td>
        <td class="text-center">
          <span class="badge badge-sm ${badgeColor} me-1"></span>
          ${record.course}
        </td>
        <td class="text-center">${record.teacher ? record.teacher.teacherName : 'غير محدد'}</td>
        <td class="text-center">
          <span class="text-dark font-weight-bold">${formattedAmount}</span> EGP
        </td>
        <td class="text-center">
          <div class="d-flex justify-content-center align-items-center">
            <div class="avatar avatar-xs me-2 bg-gradient-dark">
              <span class="text-xs text-white">${record.addedBy ? record.addedBy.employeeName.charAt(0) : '?'}</span>
            </div>
            <span>${record.addedBy ? record.addedBy.employeeName : 'غير محدد'}</span>
          </div>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Hide loading indicator after table is populated
    setTimeout(() => {
      attendanceTableLoading.style.display = 'none';
    }, 300); // Small delay for smoother transition
  }



  // Populate courses table
  function populateCoursesTable(enrolledCourses) {
    const tableBody = document.getElementById('coursesTableBody');
    const noCoursesMsg = document.getElementById('noCoursesMessage');
    
    // Show loading indicator
    coursesTableLoading.style.display = 'flex';
    
    tableBody.innerHTML = '';
    
    if (!enrolledCourses || enrolledCourses.length === 0) {
      // Hide loading indicator
      coursesTableLoading.style.display = 'none';
      noCoursesMsg.style.display = 'block';
      return;
    }
    
    noCoursesMsg.style.display = 'none';
    
    // Format currency using English numerals
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    enrolledCourses.forEach((course, index) => {
      const row = document.createElement('tr');
      
      // Add alternating row colors
      const rowClass = index % 2 === 0 ? 'bg-light' : '';
      row.className = rowClass;
      
      // Determine course status
      let status, statusClass, statusIcon;
      
      if (course.amountRemaining <= 0) {
        status = 'مكتمل';
        statusClass = 'bg-gradient-success';
        statusIcon = 'fa-check-circle';
      } else {
        status = 'نشط';
        statusClass = 'bg-gradient-info';
        statusIcon = 'fa-clock';
      }
      
      // Format amounts
      const formattedPaid = formatter.format(course.amountPay);
      const formattedRemaining = formatter.format(course.amountRemaining || 0);
      
      row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td class="text-center">
          <div class="d-flex justify-content-center align-items-center">
            <i class="fas fa-user-tie opacity-10 text-dark me-2" style="font-size: 1rem;"></i>
            <span>${course.teacherName}</span>
          </div>
        </td>
        <td class="text-center">
          <span class="badge badge-sm bg-gradient-dark me-1"></span>
          ${course.courseName}
        </td>
        <td class="text-center">
          <span class="text-dark font-weight-bold">${formattedPaid}</span> EGP
        </td>
        <td class="text-center">
          <span class="text-danger font-weight-bold">${formattedRemaining}</span> EGP
        </td>
        <td class="text-center">
          <span class="badge ${statusClass}">
            <i class="fas ${statusIcon} text-xs me-1"></i>
            ${status}
          </span>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Hide loading indicator after table is populated
    setTimeout(() => {
      coursesTableLoading.style.display = 'none';
    }, 300); // Small delay for smoother transition
  }
 
 // Load installment history for a student
 function loadInstallmentHistory(studentId) {
   fetch(`/employee/installment-history/${studentId}`)
     .then(response => response.json())
     .then(data => {
       if (data.installmentHistory) {
         populateInstallmentsTable(data.installmentHistory);
       }
     })
     .catch(error => {
       console.error('Error loading installment history:', error);
       // Hide loading indicator on error
       installmentsTableLoading.style.display = 'none';
     });
 }
 
 // Populate installments table
 function populateInstallmentsTable(installmentHistory) {
   const tableBody = document.getElementById('installmentsTableBody');
   const noInstallmentsMsg = document.getElementById('noInstallmentsMessage');
   
   tableBody.innerHTML = '';
   
   if (!installmentHistory || installmentHistory.length === 0) {
     installmentsTableLoading.style.display = 'none';
     noInstallmentsMsg.style.display = 'block';
     return;
   }
   
   noInstallmentsMsg.style.display = 'none';
   
   // Format currency using English numerals
   const formatter = new Intl.NumberFormat('en-US', {
     style: 'decimal',
     minimumFractionDigits: 0,
     maximumFractionDigits: 0
   });
   
   installmentHistory.forEach((installment, index) => {
     const row = document.createElement('tr');
     
     // Add alternating row colors
     const rowClass = index % 2 === 0 ? 'bg-light' : '';
     row.className = rowClass;
     
     // Format date using English numerals
     const installmentDate = new Date(installment.date);
     const formattedDate = installmentDate.toLocaleDateString('en-US', {
       year: 'numeric',
       month: '2-digit',
       day: '2-digit'
     });
     
     // Format amount
     const formattedAmount = formatter.format(installment.amount);
     
     row.innerHTML = `
       <td class="text-center">${index + 1}</td>
       <td class="text-center">
         <div class="d-flex justify-content-center align-items-center">
           <i class="fas fa-calendar-day opacity-10 text-dark me-2" style="font-size: 1rem;"></i>
           <span>${formattedDate}</span>
         </div>
       </td>
       <td class="text-center">
         <span class="badge badge-sm bg-gradient-info me-1"></span>
         ${installment.courseName}
       </td>
       <td class="text-center">
         <div class="d-flex justify-content-center align-items-center">
           <i class="fas fa-user-tie opacity-10 text-dark me-2" style="font-size: 1rem;"></i>
           <span>${installment.teacherName}</span>
         </div>
       </td>
       <td class="text-center">
         <span class="text-success font-weight-bold">${formattedAmount}</span> EGP
       </td>
       <td class="text-center">
         <div class="d-flex justify-content-center align-items-center">
           <div class="avatar avatar-xs me-2 bg-gradient-success">
             <span class="text-xs text-white">${installment.employeeName ? installment.employeeName.charAt(0) : '?'}</span>
           </div>
           <span>${installment.employeeName || 'غير محدد'}</span>
         </div>
       </td>
       <td class="text-center">
         <span class="text-muted">${installment.notes || '-'}</span>
       </td>
     `;
     
     tableBody.appendChild(row);
   });
   
   // Hide loading indicator after table is populated
   setTimeout(() => {
     installmentsTableLoading.style.display = 'none';
   }, 300); // Small delay for smoother transition
 }
});