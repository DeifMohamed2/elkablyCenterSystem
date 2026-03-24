// Professional Send Messages Management System

function randomDelayMsAroundBaseSeconds(baseSec) {
  const lo = Math.max(1000, (baseSec - 2) * 1000);
  const hi = (baseSec + 3) * 1000;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function averageDelaySecondsAroundBase(baseSec) {
  const lo = Math.max(1000, (baseSec - 2) * 1000);
  const hi = (baseSec + 3) * 1000;
  return ((lo + hi) / 2) / 1000;
}

class SendMessagesManager {
  constructor() {
    this.teachers = [];
    this.courses = [];
    this.students = [];
    this.templates = [];
    this.filteredStudents = [];
    this.isLoading = false;
    this.isSending = false;
    this.sendingProgress = {
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
      startTime: null
    };
    
    this.initializeEventListeners();
    this.loadData();
  }

  initializeEventListeners() {
    // Teacher selection
    const teacherSelect = document.getElementById('teacherSelect');
    if (teacherSelect) {
      teacherSelect.addEventListener('change', () => this.onTeacherChange());
    }

    // Course selection
    const courseSelect = document.getElementById('courseSelect');
    if (courseSelect) {
      courseSelect.addEventListener('change', () => this.onCourseChange());
    }

    // Template selection
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => this.onTemplateChange());
    }

    // Custom message changes
    const customMessage = document.getElementById('customMessage');
    if (customMessage) {
      customMessage.addEventListener('input', () => this.updateMessagePreview());
    }

    // Phone type selection
    const phoneType = document.getElementById('phoneType');
    if (phoneType) {
      phoneType.addEventListener('change', () => this.updateStudentsCount());
    }

    // Delay between messages
    const delayBetween = document.getElementById('delayBetween');
    if (delayBetween) {
      delayBetween.addEventListener('change', () => this.calculateEstimatedTime());
    }

    // Form submission
    const sendMessagesForm = document.getElementById('sendMessagesForm');
    if (sendMessagesForm) {
      sendMessagesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessages();
      });
    }

    // Preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewStudents());
    }

    // Send from preview button
    const sendFromPreviewBtn = document.getElementById('sendFromPreviewBtn');
    if (sendFromPreviewBtn) {
      sendFromPreviewBtn.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('previewModal')).hide();
        this.sendMessages();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }
  }

  async loadData() {
    this.showLoading(true);
    
    try {
      console.log('Loading send messages data...');
      
      // Load data in parallel for better performance
      const [teachersResponse, templatesResponse, studentsResponse] = await Promise.all([
        this.fetchTeachers(),
        this.fetchTemplates(),
        this.fetchStudents()
      ]);

      this.teachers = teachersResponse;
      this.templates = templatesResponse;
      this.students = studentsResponse;
      
      this.populateTeacherFilter();
      this.populateTemplateFilter();
      this.updateDashboardStats();
      
      console.log('All data loaded successfully');
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async fetchTeachers() {
    try {
      const response = await fetch('/employee/all-teachers');
      const data = await response.json();
      
      if (response.ok) {
        return data || [];
      } else {
        throw new Error('Failed to load teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return [];
    }
  }

  async fetchTemplates() {
    try {
      const response = await fetch('/employee/api/notification-templates');
      const data = await response.json();
      
      if (response.ok) {
        return data.templates || [];
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  async fetchStudents() {
    try {
      const response = await fetch('/employee/api/all-students');
      const data = await response.json();
      
      if (response.ok) {
        return data.students || [];
      } else {
        throw new Error('Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  populateTeacherFilter() {
    const teacherSelect = document.getElementById('teacherSelect');
    
    if (!this.teachers) return;

    // Clear existing options except the first one
    while (teacherSelect.children.length > 1) {
      teacherSelect.removeChild(teacherSelect.lastChild);
    }
    
    this.teachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher._id;
      option.textContent = teacher.teacherName;
      teacherSelect.appendChild(option);
    });
  }

  populateTemplateFilter() {
    const templateSelect = document.getElementById('templateSelect');
    
    if (!this.templates) return;

    // Clear existing options except the first one
    while (templateSelect.children.length > 1) {
      templateSelect.removeChild(templateSelect.lastChild);
    }
    
    this.templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template._id;
      option.textContent = template.name;
      templateSelect.appendChild(option);
    });
  }

  onTeacherChange() {
    const teacherId = document.getElementById('teacherSelect').value;
    const courseSelect = document.getElementById('courseSelect');
    
    // Clear course filter
    courseSelect.innerHTML = '<option value="">اختر الكورس</option>';
    courseSelect.disabled = !teacherId;
    
    if (teacherId) {
      // Get courses from selected teacher's available courses
      const selectedTeacher = this.teachers.find(t => t._id === teacherId);
      if (selectedTeacher && selectedTeacher.courses) {
        selectedTeacher.courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course;
          option.textContent = course;
          courseSelect.appendChild(option);
        });
      }
    }
    
    this.updateStudentsCount();
  }

  onCourseChange() {
    this.updateStudentsCount();
  }

  onTemplateChange() {
    const templateId = document.getElementById('templateSelect').value;
    const customMessage = document.getElementById('customMessage');
    
    if (templateId) {
      const template = this.templates.find(t => t._id === templateId);
      if (template) {
        customMessage.value = template.message;
        this.updateMessagePreview();
      }
    } else {
      customMessage.value = '';
      this.updateMessagePreview();
    }
  }

  updateStudentsCount() {
    const teacherId = document.getElementById('teacherSelect').value;
    const courseName = document.getElementById('courseSelect').value;
    const phoneType = document.getElementById('phoneType').value;
    
    if (!teacherId || !courseName) {
      document.getElementById('studentsCount').value = '0 طالب';
      this.filteredStudents = [];
      this.calculateEstimatedTime();
      return;
    }

    // Filter students based on selected teacher and course
    this.filteredStudents = this.students.filter(student => {
      // Check if student is enrolled with the selected teacher and course
      const hasTeacherAndCourse = student.selectedTeachers.some(teacher => {
        // Compare teacher IDs (handle both string and ObjectId)
        let teacherMatch = false;
        
        if (teacher.teacherId) {
          if (typeof teacher.teacherId === 'object' && teacher.teacherId._id) {
            // Populated teacher object
            teacherMatch = teacher.teacherId._id.toString() === teacherId;
          } else if (typeof teacher.teacherId === 'string') {
            // String ID
            teacherMatch = teacher.teacherId === teacherId;
          } else {
            // ObjectId
            teacherMatch = teacher.teacherId.toString() === teacherId;
          }
        }
        
        // Check if this teacher has the selected course
        const hasCourse = teacher.courses && teacher.courses.some(course => 
          course.courseName === courseName
        );
        
        return teacherMatch && hasCourse;
      });
      
      const hasPhone = this.getStudentPhone(student, phoneType);
      
      return hasTeacherAndCourse && hasPhone;
    });
    
    const count = this.filteredStudents.length;
    document.getElementById('studentsCount').value = `${count} طالب`;
    this.calculateEstimatedTime();
  }

  getStudentPhone(student, phoneType) {
    switch (phoneType) {
      case 'student':
        return student.studentPhoneNumber && student.studentPhoneNumber.trim() !== '';
      case 'parent':
        return student.studentParentPhone && student.studentParentPhone.trim() !== '';
      case 'both':
        return (student.studentPhoneNumber && student.studentPhoneNumber.trim() !== '') || 
               (student.studentParentPhone && student.studentParentPhone.trim() !== '');
      default:
        return false;
    }
  }

  getStudentPhoneNumber(student, phoneType) {
    switch (phoneType) {
      case 'student':
        return student.studentPhoneNumber;
      case 'parent':
        return student.studentParentPhone;
      case 'both':
        return student.studentParentPhone || student.studentPhoneNumber;
      default:
        return null;
    }
  }

  updateMessagePreview() {
    const customMessage = document.getElementById('customMessage').value;
    const messagePreview = document.getElementById('messagePreview');
    
    if (!customMessage.trim()) {
      messagePreview.value = '';
      return;
    }

    // Use first student as example for preview
    if (this.filteredStudents.length > 0) {
      const sampleStudent = this.filteredStudents[0];
      const personalizedMessage = this.personalizeMessage(customMessage, sampleStudent);
      messagePreview.value = personalizedMessage;
    } else {
      messagePreview.value = customMessage;
    }
  }

  personalizeMessage(message, student) {
    const teacherId = document.getElementById('teacherSelect').value;
    const courseName = document.getElementById('courseSelect').value;
    
    // Find the teacher and course info from student's selectedTeachers
    let teacherName = '';
    let studentCourseName = courseName;
    
    const selectedTeacher = student.selectedTeachers.find(teacher => {
      // Compare teacher IDs (handle both string and ObjectId)
      const teacherMatch = teacher.teacherId && (
        teacher.teacherId._id ? teacher.teacherId._id.toString() === teacherId : 
        teacher.teacherId.toString() === teacherId
      );
      
      // Check if this teacher has the selected course
      const hasCourse = teacher.courses && teacher.courses.some(course => 
        course.courseName === courseName
      );
      
      return teacherMatch && hasCourse;
    });
    
    if (selectedTeacher && selectedTeacher.teacherId) {
      teacherName = selectedTeacher.teacherId.teacherName || '';
    }
    
    return message
      .replace(/{studentName}/g, student.studentName || '')
      .replace(/{teacherName}/g, teacherName)
      .replace(/{courseName}/g, studentCourseName)
      .replace(/{studentCode}/g, student.studentCode || '')
      .replace(/{schoolName}/g, student.schoolName || '');
  }

  calculateEstimatedTime() {
    const baseSec = parseInt(document.getElementById('delayBetween').value, 10);
    const avgDelaySec = averageDelaySecondsAroundBase(baseSec);
    const totalTime = this.filteredStudents.length * avgDelaySec;
    const estimatedMinutes = Math.ceil(totalTime / 60);
    
    document.getElementById('estimatedTime').textContent = estimatedMinutes;
  }

  previewStudents() {
    if (this.filteredStudents.length === 0) {
      this.showToast('لا يوجد طلاب مطابقين للمعايير المحددة', 'warning');
      return;
    }

    this.renderPreviewTable();
    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    modal.show();
  }

  renderPreviewTable() {
    const tbody = document.getElementById('previewTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const teacherId = document.getElementById('teacherSelect').value;
    const courseName = document.getElementById('courseSelect').value;
    
    this.filteredStudents.forEach((student, index) => {
      const row = document.createElement('tr');
      const phoneType = document.getElementById('phoneType').value;
      const phoneNumber = this.getStudentPhoneNumber(student, phoneType);
      
      // Find teacher name from student's selectedTeachers
      let teacherName = '';
      const selectedTeacher = student.selectedTeachers.find(teacher => {
        // Compare teacher IDs (handle both string and ObjectId)
        const teacherMatch = teacher.teacherId && (
          teacher.teacherId._id ? teacher.teacherId._id.toString() === teacherId : 
          teacher.teacherId.toString() === teacherId
        );
        
        // Check if this teacher has the selected course
        const hasCourse = teacher.courses && teacher.courses.some(course => 
          course.courseName === courseName
        );
        
        return teacherMatch && hasCourse;
      });
      
      if (selectedTeacher && selectedTeacher.teacherId) {
        teacherName = selectedTeacher.teacherId.teacherName || '';
      }
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><span class="student-code">${student.studentCode || 'غير محدد'}</span></td>
        <td>${student.studentName || 'غير محدد'}</td>
        <td>${phoneNumber || 'غير محدد'}</td>
        <td>${teacherName || 'غير محدد'}</td>
        <td>${courseName || 'غير محدد'}</td>
        <td>
          <span class="badge ${phoneType === 'student' ? 'bg-primary' : phoneType === 'parent' ? 'bg-success' : 'bg-info'}">
            ${phoneType === 'student' ? 'رقم الطالب' : phoneType === 'parent' ? 'رقم ولي الأمر' : 'كلا الرقمين'}
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  async sendMessages() {
    if (this.filteredStudents.length === 0) {
      this.showToast('لا يوجد طلاب مطابقين للمعايير المحددة', 'warning');
      return;
    }

    const customMessage = document.getElementById('customMessage').value;
    if (!customMessage.trim()) {
      this.showToast('يرجى كتابة الرسالة', 'error');
      return;
    }

    const confirmed = await this.showConfirmation(
      `هل أنت متأكد من إرسال ${this.filteredStudents.length} رسالة؟`,
      'إرسال الرسائل'
    );

    if (!confirmed) return;

    this.isSending = true;
    this.sendingProgress = {
      current: 0,
      total: this.filteredStudents.length,
      success: 0,
      failed: 0,
      startTime: new Date()
    };

    this.showProgressContainer();
    this.updateProgress();
    this.disableForm(true);

    try {
      const baseSec = parseInt(document.getElementById('delayBetween').value, 10);

      for (let i = 0; i < this.filteredStudents.length; i++) {
        const student = this.filteredStudents[i];
        const phoneNumber = this.getStudentPhoneNumber(student, document.getElementById('phoneType').value);
        
        if (!phoneNumber) {
          this.sendingProgress.failed++;
          continue;
        }

        try {
          const personalizedMessage = this.personalizeMessage(customMessage, student);
          
          const response = await fetch('/employee/send-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentId: student._id,
              message: personalizedMessage,
              phoneNumber: phoneNumber,
              studentName: student.studentName
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            this.sendingProgress.success++;
          } else {
            this.sendingProgress.failed++;
          }
        } catch (error) {
          console.error('Error sending message to student:', student.studentName, error);
          this.sendingProgress.failed++;
        }

        this.sendingProgress.current = i + 1;
        this.updateProgress();

        if (i < this.filteredStudents.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, randomDelayMsAroundBaseSeconds(baseSec))
          );
        }
      }

      // Show final results
      this.showFinalResults();

    } catch (error) {
      console.error('Error sending messages:', error);
      this.showToast('فشل في إرسال الرسائل', 'error');
    } finally {
      this.isSending = false;
      this.disableForm(false);
    }
  }

  showProgressContainer() {
    const progressContainer = document.getElementById('progressContainer');
    progressContainer.style.display = 'block';
    
    // Scroll to progress container
    progressContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressDetails = document.getElementById('progressDetails');
    const progressTime = document.getElementById('progressTime');
    
    const percentage = Math.round((this.sendingProgress.current / this.sendingProgress.total) * 100);
    progressBar.style.width = `${percentage}%`;
    
    progressText.textContent = `جاري الإرسال... (${this.sendingProgress.current}/${this.sendingProgress.total})`;
    progressDetails.textContent = `${this.sendingProgress.current} من ${this.sendingProgress.total}`;
    
    // Calculate remaining time
    if (this.sendingProgress.current > 0) {
      const elapsed = new Date() - this.sendingProgress.startTime;
      const avgTimePerMessage = elapsed / this.sendingProgress.current;
      const remainingMessages = this.sendingProgress.total - this.sendingProgress.current;
      const remainingTime = Math.ceil((remainingMessages * avgTimePerMessage) / 1000 / 60);
      progressTime.textContent = `الوقت المتبقي: ${remainingTime} دقيقة`;
    }
  }

  showFinalResults() {
    const progressText = document.getElementById('progressText');
    const progressDetails = document.getElementById('progressDetails');
    
    progressText.textContent = 'تم الانتهاء من الإرسال';
    progressDetails.textContent = `نجح: ${this.sendingProgress.success} | فشل: ${this.sendingProgress.failed}`;
    
    const message = `تم إرسال ${this.sendingProgress.success} رسالة بنجاح من أصل ${this.sendingProgress.total}`;
    const type = this.sendingProgress.success > 0 ? 'success' : 'error';
    
    this.showToast(message, type);
    this.updateDashboardStats();
  }

  disableForm(disable) {
    const form = document.getElementById('sendMessagesForm');
    const inputs = form.querySelectorAll('input, select, textarea, button');
    
    inputs.forEach(input => {
      if (disable) {
        input.disabled = true;
        if (input.type === 'submit') {
          input.innerHTML = '<i class="material-symbols-rounded me-1">send</i>جاري الإرسال...';
        }
      } else {
        input.disabled = false;
        if (input.type === 'submit') {
          input.innerHTML = '<i class="material-symbols-rounded me-1">send</i>إرسال الرسائل';
        }
      }
    });
  }

  refreshData() {
    this.loadData();
    this.showToast('تم تحديث البيانات', 'success');
  }

  updateDashboardStats() {
    document.getElementById('totalStudentsCount').textContent = this.students.length;
    document.getElementById('templatesCount').textContent = this.templates.length;
    document.getElementById('messagesSentCount').textContent = this.sendingProgress.success;
  }

  showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.style.display = show ? 'flex' : 'none';
    }
    this.isLoading = show;
  }

  showToast(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
      const iconMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
      };

      Swal.fire({
        icon: iconMap[type] || 'info',
        title: this.getToastTitle(type),
        text: message,
        timer: 5000,
        showConfirmButton: false,
        toast: true,
        position: 'top-start',
        customClass: {
          popup: 'swal2-toast-custom'
        }
      });
    } else {
      alert(`${this.getToastTitle(type)}: ${message}`);
    }
  }

  getToastTitle(type) {
    const titles = {
      success: 'نجح',
      error: 'خطأ',
      warning: 'تحذير',
      info: 'معلومات'
    };
    return titles[type] || 'معلومات';
  }

  async showConfirmation(message, title = 'تأكيد') {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: title,
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'نعم',
        cancelButtonText: 'إلغاء'
      });
      
      return result.isConfirmed;
    } else {
      return confirm(`${title}: ${message}`);
    }
  }
}

// Initialize the send messages manager when the page loads
let sendMessagesManager;

document.addEventListener('DOMContentLoaded', function() {
  sendMessagesManager = new SendMessagesManager();
});

// Make it globally accessible
window.sendMessagesManager = sendMessagesManager;
