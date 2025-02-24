const spinner = document.getElementById('spinner'); 

document.addEventListener('DOMContentLoaded', function () {
  
  spinner.classList.remove('d-none'); 

  // Get the calendar element
  let calendarEl = document.getElementById('calendar');

  // Function to fetch teachers' schedules from an API
  async function fetchTeacherSchedules() {
  // Simulate API call (replace with actual API endpoint)
  const response = await fetch('/employee/teacher-sechdule'); // Replace with your API URL
  const data = await response.json(); // Parse the response
  return data; // Return the array of teacher schedules
  }

  // Convert the teacher schedules into FullCalendar-compatible events
  function generateEvents(teacherSchedules) {
  const events = [];
  const daysMapping = {
    Sunday: '0',
    Monday: '1',
    Tuesday: '2',
    Wednesday: '3',
    Thursday: '4',
    Friday: '5',
    Saturday: '6',
  };

  teacherSchedules.forEach((teacher) => {
    const { teacherName, subjectName, schedule } = teacher;

    Object.entries(schedule).forEach(([day, sessions]) => {
    const rruleDay = daysMapping[day]; // Get the numeric day of the week (e.g., 0 for Sunday)

    sessions.forEach((session) => {
      events.push({
      title: `${teacherName} - ${subjectName} (Room: ${session.roomID})`, // Event title with teacher name, subject, and room ID
      daysOfWeek: [rruleDay], // Recurring day of the week
      startTime: session.startTime, // Start time (e.g., 10:00)
      endTime: session.endTime, // End time (e.g., 12:00)
      RoomID : session.roomID,
      color: '#FF5733', // Event color (can be customized per teacher or subject)
      });
    });
    });
  });

  return events;
  }

  // Initialize the calendar with fetched events
  async function initializeCalendar() {
  try {
    spinner.classList.remove('d-none'); // Show spinner
    const teacherSchedules = await fetchTeacherSchedules(); // Fetch teacher schedules from API
    const events = generateEvents(teacherSchedules); // Generate events from the schedules

    // Initialize FullCalendar
    var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridDay', // Daily time series view
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridWeek',
    },
    events: events, // Load dynamically generated events
    slotMinTime: '08:00:00', // Start time of the calendar
    slotMaxTime: '23:00:00', // End time of the calendar
    editable: false, // Disable drag-and-drop
    selectable: false, // Disable selection

    // Event click handler
    eventClick: function (info) {
      const [teacherName, subjectName] = info.event.title.split(' - ');
      alert(
      `Teacher: ${teacherName}\nSubject: ${subjectName}\nRoom ID: ${info.event.extendedProps.RoomID}\nDay: ${info.event.start.toLocaleString(
        'en-US',
        { weekday: 'long' }
      )}\nTime: ${info.event.start.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      })} - ${info.event.end.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      })}`
      );
    },
    });

    // Render the calendar
    calendar.render();
    spinner.classList.add('d-none'); // Hide spinner
  } catch (error) {
    console.error('Failed to fetch teacher schedules:', error);
  }
  }

  // Call the function to initialize the calendar
  initializeCalendar();
});
