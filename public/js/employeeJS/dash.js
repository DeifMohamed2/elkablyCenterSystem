document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
const spinner = document.getElementById('spinner'); 
  const calendarContent = document.getElementById('calendarContent');
  const daySelector = document.getElementById('daySelector');
  const legendContainer = document.getElementById('legendContainer');
  const dayViewBtn = document.getElementById('dayViewBtn');
  const weekViewBtn = document.getElementById('weekViewBtn');
  const todayBtn = document.getElementById('todayBtn');
  const eventTooltip = document.getElementById('eventTooltip');
  const tooltipTitle = document.getElementById('tooltipTitle');
  const tooltipTeacher = document.getElementById('tooltipTeacher');
  const tooltipSubject = document.getElementById('tooltipSubject');
  const tooltipRoom = document.getElementById('tooltipRoom');
  const tooltipTime = document.getElementById('tooltipTime');
  const tooltipCourses = document.getElementById('tooltipCourses');

  // Calendar state
  let currentDate = new Date();
  let currentView = 'day'; // 'day' or 'week'
  let teacherData = [];
  let rooms = [];
  let subjectColors = {};

  // Initialize the calendar
  initCalendar();

  // Event listeners for view buttons
  dayViewBtn.addEventListener('click', () => {
    dayViewBtn.classList.add('active');
    weekViewBtn.classList.remove('active');
    currentView = 'day';
    renderCalendar();
  });

  weekViewBtn.addEventListener('click', () => {
    weekViewBtn.classList.add('active');
    dayViewBtn.classList.remove('active');
    currentView = 'week';
    renderCalendar();
  });

  todayBtn.addEventListener('click', () => {
    currentDate = new Date();
    renderCalendar();
  });

  // Hide tooltip when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.calendar-event') && !e.target.closest('.event-tooltip')) {
      eventTooltip.style.display = 'none';
    }
  });

  // Function to initialize the calendar
  async function initCalendar() {
  spinner.classList.remove('d-none'); 
    try {
      // Fetch teacher data
      const response = await fetch('/employee/teacher-sechdule');
      const data = await response.json();
      
      // Process teacher data
      if (data && data.teachers) {
        teacherData = data.teachers;
      } else if (Array.isArray(data)) {
        teacherData = data;
      } else {
        teacherData = [];
      }
      
      // Extract rooms
      rooms = extractRooms(teacherData);
      
      // Generate subject colors
      generateSubjectColors(teacherData);
      
      // Render the calendar
      renderCalendar();
      
      // Create legend
      createLegend();
    } catch (error) {
      console.error('Error initializing calendar:', error);
      calendarContent.innerHTML = '<div class="no-events-message">حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.</div>';
    } finally {
      spinner.classList.add('d-none');
    }
  }

  // Function to extract unique rooms from teacher data
  function extractRooms(teachers) {
    const roomSet = new Set();
    
    teachers.forEach(teacher => {
      if (!teacher || !teacher.schedule) return;
      
      // Handle schedule as object
      if (typeof teacher.schedule === 'object' && !Array.isArray(teacher.schedule)) {
        Object.values(teacher.schedule).forEach(sessions => {
          if (Array.isArray(sessions)) {
            sessions.forEach(session => {
              if (session && session.roomID) {
                roomSet.add(session.roomID);
              }
            });
          }
        });
      }
    });
    
    // If no rooms found, add a default room
    if (roomSet.size === 0) {
      roomSet.add('1');
    }
    
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  // Function to generate consistent colors for subjects
  function generateSubjectColors(teachers) {
    const predefinedColors = [
      '#4285F4', '#34A853', '#FBBC05', '#EA4335', 
      '#8E24AA', '#00ACC1', '#43A047', '#FB8C00', 
      '#6D4C41', '#3949AB', '#D81B60', '#1E88E5'
    ];
    
    const subjects = new Set();
    
    // Extract all unique subjects
    teachers.forEach(teacher => {
      if (teacher && teacher.subjectName) {
        subjects.add(teacher.subjectName);
      }
    });
    
    // Assign colors to subjects
    let colorIndex = 0;
    subjects.forEach(subject => {
      subjectColors[subject] = predefinedColors[colorIndex % predefinedColors.length];
      colorIndex++;
    });
  }

  // Function to create the legend
  function createLegend() {
    legendContainer.innerHTML = '';
    
    // Add day colors legend if in week view
    if (currentView === 'week') {
      const dayColors = [
        { day: 'الأحد', color: '#FF5722', key: 'Sunday' },
        { day: 'الاثنين', color: '#2196F3', key: 'Monday' },
        { day: 'الثلاثاء', color: '#4CAF50', key: 'Tuesday' },
        { day: 'الأربعاء', color: '#9C27B0', key: 'Wednesday' },
        { day: 'الخميس', color: '#FFC107', key: 'Thursday' },
        { day: 'الجمعة', color: '#795548', key: 'Friday' },
        { day: 'السبت', color: '#607D8B', key: 'Saturday' }
      ];
      
      const dayLegendTitle = document.createElement('div');
      dayLegendTitle.className = 'legend-title';
      dayLegendTitle.textContent = 'أيام الأسبوع:';
      dayLegendTitle.style.fontWeight = 'bold';
      dayLegendTitle.style.marginRight = '10px';
      legendContainer.appendChild(dayLegendTitle);
      
      dayColors.forEach(({ day, color, key }) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = 'transparent';
        colorBox.style.borderLeft = `3px solid ${color}`;
        colorBox.style.width = '12px';
        
        const dayName = document.createElement('span');
        dayName.textContent = day;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(dayName);
        legendContainer.appendChild(legendItem);
      });
      
      // Add separator
      const separator = document.createElement('div');
      separator.style.width = '1px';
      separator.style.height = '20px';
      separator.style.backgroundColor = '#dee2e6';
      separator.style.margin = '0 15px';
      legendContainer.appendChild(separator);
    }
    
    // Add subject colors legend
    const subjectLegendTitle = document.createElement('div');
    subjectLegendTitle.className = 'legend-title';
    subjectLegendTitle.textContent = 'المواد:';
    subjectLegendTitle.style.fontWeight = 'bold';
    subjectLegendTitle.style.marginRight = '10px';
    legendContainer.appendChild(subjectLegendTitle);
    
    Object.entries(subjectColors).forEach(([subject, color]) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      
      const colorBox = document.createElement('div');
      colorBox.className = 'legend-color';
      colorBox.style.backgroundColor = color;
      
      const subjectName = document.createElement('span');
      subjectName.textContent = subject;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(subjectName);
      legendContainer.appendChild(legendItem);
    });
  }

  // Function to render the calendar
  function renderCalendar() {
    // Update day selector
    renderDaySelector();
    
    // Render appropriate view
    if (currentView === 'day') {
      renderDayView();
    } else {
      renderWeekView();
    }
    
    // Update legend based on current view
    createLegend();
  }

  // Function to render the day selector
  function renderDaySelector() {
    daySelector.innerHTML = '';
    
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    // Create buttons for each day of the week
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      
      const dayButton = document.createElement('button');
      dayButton.className = 'btn day-button';
      
      // Check if this is the selected day
      const isCurrentDay = dayDate.toDateString() === currentDate.toDateString();
      if (isCurrentDay) {
        dayButton.classList.add('active', 'btn-success');
      } else {
        dayButton.classList.add('btn-outline-success');
      }
      
      // Format the day name and date
      const dayName = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(dayDate);
      const dayNum = dayDate.getDate();
      const monthNum = dayDate.getMonth() + 1;
      
      dayButton.textContent = `${dayName}، ${dayNum}/${monthNum}`;
      
      // Add click event
      dayButton.addEventListener('click', () => {
        currentDate = new Date(dayDate);
        renderCalendar();
      });
      
      daySelector.appendChild(dayButton);
    }
  }
  
  // Function to render day view
  function renderDayView() {
    calendarContent.innerHTML = '';
    
    // Create room header
    const roomHeader = document.createElement('div');
    roomHeader.className = 'room-header';
    
    // Add empty cell for time column
    const emptyCell = document.createElement('div');
    emptyCell.className = 'empty-cell';
    roomHeader.appendChild(emptyCell);
    
    // Add room cells
    rooms.forEach(roomID => {
      const roomCell = document.createElement('div');
      roomCell.className = 'room-cell';
      roomCell.textContent = `غرفة ${roomID}`;
      roomHeader.appendChild(roomCell);
    });
    
    calendarContent.appendChild(roomHeader);
    
    // Create calendar body
    const calendarBody = document.createElement('div');
    calendarBody.className = 'calendar-body';
    
    // Generate time slots (8 AM to 11 PM)
    for (let hour = 8; hour < 23; hour++) {
      // Create time row
      const timeRow = document.createElement('div');
      timeRow.className = 'time-row';
      
      // Add time label
      const timeSlot = document.createElement('div');
      timeSlot.className = 'time-slot';
      timeSlot.textContent = formatTime(hour, 0);
      timeRow.appendChild(timeSlot);
      
      // Add room slots
      const roomSlots = document.createElement('div');
      roomSlots.className = 'room-slots';
      
      rooms.forEach(roomID => {
        const roomTimeSlot = document.createElement('div');
        roomTimeSlot.className = 'room-time-slot';
        roomTimeSlot.dataset.roomId = roomID;
        roomTimeSlot.dataset.hour = hour;
        roomSlots.appendChild(roomTimeSlot);
      });
      
      timeRow.appendChild(roomSlots);
      calendarBody.appendChild(timeRow);
    }
    
    calendarContent.appendChild(calendarBody);
    
    // Add events to the calendar
    addEventsToCalendar('day');
  }

  // Function to render week view
  function renderWeekView() {
    calendarContent.innerHTML = '';
    
    // Create room header
    const roomHeader = document.createElement('div');
    roomHeader.className = 'room-header';
    
    // Add empty cell for time column
    const emptyCell = document.createElement('div');
    emptyCell.className = 'empty-cell';
    roomHeader.appendChild(emptyCell);
    
    // Add room cells
    rooms.forEach(roomID => {
      const roomCell = document.createElement('div');
      roomCell.className = 'room-cell';
      roomCell.textContent = `غرفة ${roomID}`;
      roomHeader.appendChild(roomCell);
    });
    
    calendarContent.appendChild(roomHeader);
    
    // Create calendar body
    const calendarBody = document.createElement('div');
    calendarBody.className = 'calendar-body';
    
    // Generate time slots (8 AM to 11 PM)
    for (let hour = 8; hour < 23; hour++) {
      // Create time row
      const timeRow = document.createElement('div');
      timeRow.className = 'time-row';
      
      // Add time label
      const timeSlot = document.createElement('div');
      timeSlot.className = 'time-slot';
      timeSlot.textContent = formatTime(hour, 0);
      timeRow.appendChild(timeSlot);
      
      // Add room slots
      const roomSlots = document.createElement('div');
      roomSlots.className = 'room-slots';
      
      rooms.forEach(roomID => {
        const roomTimeSlot = document.createElement('div');
        roomTimeSlot.className = 'room-time-slot';
        roomTimeSlot.dataset.roomId = roomID;
        roomTimeSlot.dataset.hour = hour;
        roomSlots.appendChild(roomTimeSlot);
      });
      
      timeRow.appendChild(roomSlots);
      calendarBody.appendChild(timeRow);
    }
    
    calendarContent.appendChild(calendarBody);
    
    // Add events to the calendar
    addEventsToCalendar('week');
  }

  // Function to add events to the calendar
  function addEventsToCalendar(viewType) {
    // Get the day of week for the current date
    const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[currentDay];
    
    // Create a structure to track events by room, hour, and time range
    const eventsByRoomAndHour = {};
    
    // First pass: collect all events
    const allEvents = [];
    
    // Process each teacher's schedule
    teacherData.forEach(teacher => {
      if (!teacher || !teacher.schedule) return;
      
      const teacherName = teacher.teacherName || 'Unknown Teacher';
      const subjectName = teacher.subjectName || 'Unknown Subject';
      const schedule = teacher.schedule;
      
      // Process schedule for the current day or week
      if (typeof schedule === 'object' && !Array.isArray(schedule)) {
        Object.entries(schedule).forEach(([day, sessions]) => {
          // Skip if not the current day in day view
          if (viewType === 'day' && day !== currentDayName) return;
          
          if (Array.isArray(sessions)) {
            sessions.forEach(session => {
              if (!session || !session.startTime || !session.endTime || !session.roomID) return;
              
              // Parse start and end times
              const [startHour, startMinute] = session.startTime.split(':').map(Number);
              const [endHour, endMinute] = session.endTime.split(':').map(Number);
              
              // Calculate position and height
              const startPosition = (startHour - 8) * 60 + startMinute;
              const endPosition = (endHour - 8) * 60 + endMinute;
              const duration = endPosition - startPosition;
              
              // Store event data
              const eventData = {
                teacherName,
                subjectName,
                roomID: session.roomID,
                startHour,
                startMinute,
                endHour,
                endMinute,
                startTime: session.startTime,
                endTime: session.endTime,
                day,
                courses: teacher.courses || [],
                color: subjectColors[subjectName] || '#43A047',
                duration,
                startPosition,
                endPosition
              };
              
              // Add to all events
              allEvents.push(eventData);
              
              // Group by room and hour for overlap detection
              const roomHourKey = `${session.roomID}-${startHour}`;
              if (!eventsByRoomAndHour[roomHourKey]) {
                eventsByRoomAndHour[roomHourKey] = [];
              }
              eventsByRoomAndHour[roomHourKey].push(eventData);
            });
          }
        });
      }
    });
    
    // Second pass: process overlaps and render events
    Object.entries(eventsByRoomAndHour).forEach(([roomHourKey, events]) => {
      // Sort events by start time
      events.sort((a, b) => a.startPosition - b.startPosition);
      
      // Check for overlaps
      const overlappingGroups = [];
      let currentGroup = [];
      
      events.forEach((event, index) => {
        if (index === 0) {
          currentGroup.push(event);
          return;
        }
        
        // Check if this event overlaps with the last event in the current group
        const lastEvent = currentGroup[currentGroup.length - 1];
        if (event.startPosition < lastEvent.endPosition) {
          // Overlapping
          currentGroup.push(event);
        } else {
          // Not overlapping, start a new group
          if (currentGroup.length > 0) {
            overlappingGroups.push([...currentGroup]);
          }
          currentGroup = [event];
        }
      });
      
      // Add the last group if it has events
      if (currentGroup.length > 0) {
        overlappingGroups.push(currentGroup);
      }
      
      // Render each group
      overlappingGroups.forEach(group => {
        // Get the room slot for the first event in the group
        const firstEvent = group[0];
        const roomSlot = document.querySelector(`.room-time-slot[data-room-id="${firstEvent.roomID}"][data-hour="${Math.floor(firstEvent.startHour)}"]`);
        if (!roomSlot) return;
        
        // Render each event in the group with appropriate positioning
        group.forEach((event, index) => {
          // Create event element
          const eventElement = document.createElement('div');
          eventElement.className = 'calendar-event';
          
          // Add day class for visual indicator in week view
          if (viewType === 'week') {
            eventElement.classList.add(`day-${event.day}`);
          }
          
          // Add overlapping class if needed
          if (group.length > 1) {
            eventElement.classList.add(`overlapping-${index + 1}`);
          }
          
          eventElement.style.backgroundColor = event.color;
          eventElement.style.top = `${(event.startMinute / 60) * 100}%`;
          eventElement.style.height = `${(event.duration / 60) * 100}%`;
          
          // Create text container for better control
          const textElement = document.createElement('span');
          textElement.className = 'calendar-event-text';
          
          // In week view, include the day name in the event text
          if (viewType === 'week') {
            const dayAbbr = {
              'Sunday': 'أحد',
              'Monday': 'اثنين',
              'Tuesday': 'ثلاثاء',
              'Wednesday': 'أربعاء',
              'Thursday': 'خميس',
              'Friday': 'جمعة',
              'Saturday': 'سبت'
            };
            textElement.textContent = `${dayAbbr[event.day] || ''}: ${event.teacherName}`;
          } else {
            textElement.textContent = `${event.teacherName}`;
          }
          
          eventElement.appendChild(textElement);
          
          // Add subject as details
          const detailsElement = document.createElement('span');
          detailsElement.className = 'calendar-event-details';
          detailsElement.textContent = event.subjectName;
          eventElement.appendChild(detailsElement);
          
          // Add time information
          const timeElement = document.createElement('span');
          timeElement.className = 'calendar-event-time';
          timeElement.textContent = `${event.startTime} - ${event.endTime}`;
          eventElement.appendChild(timeElement);
          
          // Add overlap indicator if needed
          if (group.length > 1) {
            const indicatorElement = document.createElement('span');
            indicatorElement.className = 'calendar-event-indicator';
            indicatorElement.textContent = group.length;
            eventElement.appendChild(indicatorElement);
          }
          
          // Store event data for tooltip
          eventElement.dataset.teacherName = event.teacherName;
          eventElement.dataset.subjectName = event.subjectName;
          eventElement.dataset.roomId = event.roomID;
          eventElement.dataset.startTime = event.startTime;
          eventElement.dataset.endTime = event.endTime;
          eventElement.dataset.day = event.day;
          eventElement.dataset.courses = event.courses.join(', ');
          eventElement.dataset.overlapping = group.length > 1 ? 'true' : 'false';
          eventElement.dataset.overlapCount = group.length;
          
          // Add click event for tooltip
          eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventTooltip(eventElement, e);
          });
          
          roomSlot.appendChild(eventElement);
        });
      });
    });
  }

  // Function to show event tooltip
  function showEventTooltip(eventElement, event) {
    const { 
      teacherName, 
      subjectName, 
      roomId, 
      startTime, 
      endTime, 
      day, 
      courses, 
      overlapping, 
      overlapCount 
    } = eventElement.dataset;
    
    // Arabic day names
    const dayNames = {
      'Sunday': 'الأحد',
      'Monday': 'الاثنين',
      'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء',
      'Thursday': 'الخميس',
      'Friday': 'الجمعة',
      'Saturday': 'السبت'
    };
    
    tooltipTitle.textContent = `${subjectName}`;
    tooltipTeacher.textContent = `المعلم: ${teacherName}`;
    tooltipRoom.textContent = `الغرفة: ${roomId}`;
    tooltipSubject.textContent = `المادة: ${subjectName}`;
    
    // Show day name in tooltip when in week view
    if (currentView === 'week') {
      tooltipTime.textContent = `اليوم: ${dayNames[day] || day} | الوقت: ${startTime} - ${endTime}`;
    } else {
      tooltipTime.textContent = `الوقت: ${startTime} - ${endTime}`;
    }
    
    if (courses) {
      tooltipCourses.textContent = `الدورات: ${courses}`;
      tooltipCourses.style.display = 'block';
    } else {
      tooltipCourses.style.display = 'none';
    }
    
    // Add overlap warning if applicable
    if (overlapping === 'true' && overlapCount) {
      const overlapWarning = document.createElement('div');
      overlapWarning.className = 'tooltip-detail';
      overlapWarning.style.color = '#e53935';
      overlapWarning.style.fontWeight = 'bold';
      overlapWarning.textContent = `تنبيه: يوجد ${overlapCount} حجوزات متداخلة في نفس الوقت`;
      
      // Remove any existing warning
      const existingWarning = eventTooltip.querySelector('.overlap-warning');
      if (existingWarning) {
        eventTooltip.removeChild(existingWarning);
      }
      
      overlapWarning.classList.add('overlap-warning');
      eventTooltip.appendChild(overlapWarning);
    } else {
      // Remove any existing warning
      const existingWarning = eventTooltip.querySelector('.overlap-warning');
      if (existingWarning) {
        eventTooltip.removeChild(existingWarning);
      }
    }
    
    // Position the tooltip
    const rect = eventElement.getBoundingClientRect();
    const tooltipWidth = 250;
    
    // Get sidebar width if present (assuming sidebar is on the right in RTL layout)
    const sidebar = document.querySelector('.g-sidenav-show .sidenav');
    const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
    
    // Available space calculation
    const availableRightSpace = window.innerWidth - rect.right - sidebarWidth;
    const availableLeftSpace = rect.left;
    
    // Determine best position for tooltip
    if (availableRightSpace >= tooltipWidth) {
      // Enough space on right
      eventTooltip.style.left = `${rect.right + 10}px`;
      eventTooltip.style.right = 'auto';
    } else if (availableLeftSpace >= tooltipWidth) {
      // Not enough space on right, but enough on left
      eventTooltip.style.left = `${rect.left - tooltipWidth - 10}px`;
      eventTooltip.style.right = 'auto';
    } else {
      // Not enough space on either side, center over the event
      eventTooltip.style.left = `${Math.max(10, rect.left + (rect.width / 2) - (tooltipWidth / 2))}px`;
      eventTooltip.style.right = 'auto';
    }
    
    // Check if tooltip would go off-screen at the bottom
    const tooltipHeight = eventTooltip.offsetHeight || 150; // Estimate if not yet rendered
    if (rect.bottom + tooltipHeight > window.innerHeight) {
      eventTooltip.style.top = `${Math.max(10, window.innerHeight - tooltipHeight - 10)}px`;
    } else {
      eventTooltip.style.top = `${rect.top}px`;
    }
    
    // Ensure tooltip is always visible and not behind any element
    eventTooltip.style.zIndex = '9999';
    
    eventTooltip.style.display = 'block';
  }

  // Helper function to format time
  function formatTime(hour, minute) {
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  }
});