const Employee = require('../models/employee');
const Billing = require('../models/billing');
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const qrcode = require('qrcode');
const ExcelJS = require('exceljs');


const waapi = require('@api/waapi');
const { over } = require('lodash');
const waapiAPI = process.env.WAAPIAPI;
waapi.auth(waapiAPI);



const dashboard = (req, res) => {

  res.render('employee/dashboard', {
    title: 'Dashboard',
    path: '/employee/dashboard',
    employeeData: req.employee,
  });
};


const teacherSechdule = async(req, res) => {
    try {
      const teachers = await Teacher.find({});
      res.send(teachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      res
        .status(500)
        .send({ error: 'An error occurred while fetching teachers' });
    }
}



// ======================================== Billing ======================================== //

const billing_Get = (req, res) => {
    res.render('employee/billing', {
        title: 'Billing',
        path: '/employee/billing',
    });
}

const addBill = (req, res) => {
    const { billName, billAmount, billNote, billPhoto } = req.body;

    if (billAmount < 0) {
        res.status(400).send({ message: 'لازم Amount يكون اكبر من 0' });
        return;
    }

    if (billName.length < 3) {
        res.status(400).send({ message: 'اسم الفاتوره لازم يكون اكتر من 3 احرف' });
        return
    }

    const bill = new Billing({
      billName,
      billAmount,
      billNote,
      billPhoto,
      employee: req.employeeId,
    });

    bill
        .save()
        .then((result) => {
            res.status(201).send(result);
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send({ message: 'هناك مشكله فنيه' });
        });
}


const getAllBills = async (req, res) => {
  try {
    const allBills = await Billing.find({ employee: req.employeeId }).sort({
      createdAt: -1,
      });
    console.log(allBills);
    res.send(allBills);
  }catch (error) {
    console.error('Error fetching bills:', error);
    res
      .status(500)
      .send({ error: 'An error occurred while fetching bills' });
  }  
}

// ======================================== End Billing ======================================== //


// ======================================== Add Student ======================================== //

const getAddStudent = async (req, res) => {
    const allTeachers = await Teacher.find({}, { teacherName: 1 });
    console.log(allTeachers);
    res.render('employee/addStudent', {
      title: 'Add Student',
      path: '/employee/add-student',
      allTeachers,
    });
}


const getAllStudents = async (req, res) => {
    const allStudents = await Student.find().populate('studentTeacher' , 'teacherName');
    console.log(allStudents);
    res.send(allStudents);
}

const getStudent = async (req, res) => {
    const student = await Student.findById(req.params.id).populate('studentTeacher' , 'teacherName');
    console.log(student);
    res.send(student);
}

const updateStudent = async (req, res) => {
  const {
    studentName,
    studentPhoneNumber,
    studentParentPhone,
    studentTeacher,
    subject,
    studentAmount,
    amountRemaining,
    installmentAmount,
  } = req.body;

  if (studentName.length < 3) {
      res.status(400).send({ message: 'اسم الطالب لازم يكون اكتر من 3 احرف' });
      return;
  }

  if (studentPhoneNumber.length !== 11) {
      res.status(400).send({ message: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
      return;
  }

  if (studentParentPhone.length !== 11) {
      res.status(400).send({ message: 'رقم هاتف ولى الامر يجب ان يكون مكون من 11 رقم' });
      return;
  }

  if (!studentTeacher) {
      res.status(400).send({ message: 'يجب اختيار المعلم' });
      return
  }
  

  const student = await Student.findByIdAndUpdate(req.params.id, {
    studentName,
    studentPhoneNumber,
    studentParentPhone,
    studentTeacher,
    subject,
    studentAmount,
    amountRemaining,

  }).populate('studentTeacher' , 'teacherName');

  student.amountRemaining -= installmentAmount;
  student.paidHistory.push({
    amount: installmentAmount,
    date: new Date(),
  });

  await student.save();
  res.send(student);
}


async function sendQRCode(chatId, message, studentCode) {
  try {
    // Generate a high-quality QR code in Base64 format
    const qrData = await qrcode.toDataURL(studentCode, {
      margin: 2, // White border around the QR code
      scale: 10, // Scale factor (default is 4, increase for better quality)
      width: 500, // Adjust width for higher resolution (optional)
    });
    const base64Image = qrData.split(',')[1]; // Extract only the Base64 data

    console.log('Generated QR Code Base64:', base64Image);
    console.log('Sending to Chat ID:', chatId);

    const response = await waapi.postInstancesIdClientActionSendMedia(
      {
        chatId: chatId, // Target chat ID
        mediaBase64: base64Image,
        mediaName: 'qrcode.png',
        mediaCaption: message,
        asSticker: false, // Set true if you want to send as a sticker
      },
      { id: '34202' } // Replace with your actual instance ID
    );

    console.log('QR code sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending QR code:', error);
  }
}

const addStudent = async (req , res) => {
    const {
      studentName,
      studentPhoneNumber,
      studentParentPhone,
      studentTeacher,
      subject,
      paymentType,
      studentAmount,
    } = req.body;


    if (studentName.length < 3) {
        res.status(400).send({ message: 'اسم الطالب لازم يكون اكتر من 3 احرف' });
        return;
    }

    if (studentPhoneNumber.length !== 11) {
        res.status(400).send({ message: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
        return;
    }

    if (studentParentPhone.length !== 11) {
        res.status(400).send({ message: 'رقم هاتف ولى الامر يجب ان يكون مكون من 11 رقم' });
        return;
    }

    if (!studentTeacher) {
        res.status(400).send({ message: 'يجب اختيار المعلم' });
        return
    }
    
    if(studentAmount < 0){
        res.status(400).send({ message: 'لازم Amount يكون اكبر من 0' });
        return;
    }

    if (!paymentType) {
        res.status(400).send({ message: 'يجب اختيار نوع الدفع' });
        return;
    }

    const studentCode = Math.floor(Math.random() * (6000 - 1000 + 1)) + 1000;
    const student = new Student({
      studentName,
      studentPhoneNumber,
      studentParentPhone,
      studentTeacher,
      subject,
      studentAmount,
      amountRemaining: studentAmount,
      studentCode: studentCode,
      paymentType,
    });

    student
        .save()
        .then(async (result) => {
            const populatedStudent = await result.populate('studentTeacher', 'teacherName');
            const message = `Student Name: ${populatedStudent.studentName}\nTeacher: ${populatedStudent.studentTeacher.teacherName}\nSubject: ${populatedStudent.subject}\nAmount: ${populatedStudent.studentAmount}\nStudent Code: ${populatedStudent.studentCode}`;
            sendQRCode(`2${populatedStudent.studentPhoneNumber}@c.us`, `Scan the QR code to check in\n\n${message}`, populatedStudent.studentCode);

            res.status(201).send(populatedStudent);
        })
        .catch((err) => {
            console.log(err);
            res.status(400).send({ message: 'هناك مشكله فنيه' });
        });
}


const searchStudent = async (req, res) => {
  try {
    const { search, teacher } = req.query; // Extract query parameters
    console.log('Search:', search, 'Teacher:', teacher);

    // Build the query dynamically
    const query = {};
    if (search) {
      query.studentCode = search; // Filter by phone number if provided
    }
    if (teacher) {
      query.studentTeacher = teacher; // Filter by teacher if provided
    }

    // Fetch the student record(s)
    const students = await Student.find(query).populate(
      'studentTeacher',
      'teacherName'
    );
    console.log('Students:', students);

    // Send the response
    res.send(students.length ? students : { message: 'No students found' });
  } catch (error) {
    console.error('Error fetching students:', error);
    res
      .status(500)
      .send({ error: 'An error occurred while searching for students' });
  }
};

 
// ======================================== End Add Student ======================================== //


// ================================= Teacher ================================ //

const teacher_Get = (req, res) => {
  res.render('employee/teacher', { title: 'Add Teacher', path: '/employee/teacher' });
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

const addTeacher = async (req, res) => {
  try {
    const {
      teacherName,
      teacherPhoneNumber,
      subjectName,
      schedule,
      teacherFees,
      paymentType,
    } = req.body;

    console.log(req.body); // Debugging: Log the incoming request data

    // Validation for required fields
    if (
      !teacherName ||
      !teacherFees ||
      !teacherPhoneNumber ||
      !subjectName ||
      typeof schedule !== 'object'
    ) {
      return res.status(400).json({
        error: 'All fields are required. Schedule must be an object.',
      });
    }

    // Validation for schedule structure
    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    for (const [day, timeSlots] of Object.entries(schedule)) {
      if (!daysOfWeek.includes(day)) {
        return res.status(400).json({ error: `Invalid day: ${day}` });
      }
      if (!Array.isArray(timeSlots)) {
        return res.status(400).json({
          error: `Time slots for ${day} must be an array.`,
        });
      }
      for (const timeSlot of timeSlots) {
        if (!timeSlot.startTime || !timeSlot.endTime) {
          return res.status(400).json({
            error: `لازم كل الايام يكون ليها وقت بدايه ونهايه`,
          });
        }
      }
    }

    // Create and save a new teacher
    const newTeacher = new Teacher({
      teacherName: teacherName.trim(),
      teacherPhoneNumber: teacherPhoneNumber.trim(),
      subjectName: subjectName.trim(),
      teacherFees : teacherFees,
      paymentType,
      schedule,
    });

    await newTeacher.save();

    // Send success response
    res.status(201).json({
      message: 'تم اضافه المدرس بنجاح',
      teacher: newTeacher,
    });
  } catch (error) {
    // Handle server errors
    res.status(500).json({
      error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
      details: error.message,
    });
  }
};

const getTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.status(200).json(teacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const {
    teacherName,
    teacherPhoneNumber,
    subjectName,
    teacherFees,
    schedule,
  } = req.body;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    // Update basic fields
    teacher.teacherName = teacherName;
    teacher.teacherPhoneNumber = teacherPhoneNumber;
    teacher.subjectName = subjectName;
    teacher.teacherFees = teacherFees;

    // Update schedule
    if (schedule && Array.isArray(schedule)) {
      const formattedSchedule = schedule.reduce((acc, slot) => {
        const { day, startTime, endTime, roomID } = slot;
        if (!acc[day]) acc[day] = [];
        acc[day].push({ startTime, endTime, roomID });
        return acc;
      }, {});

      teacher.schedule = formattedSchedule;
    }

    await teacher.save();
    res.status(200).json({ message: 'Teacher updated successfully', teacher });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};



// ======================================== End Teacher ======================================== //

// ======================================== Attendance ======================================== //

const getAttendance = (req, res) => {
  const employee = req.employee;
  console.log(employee.device);
    res.render('employee/attendance', {
        title: 'Attendance',
        path: '/employee/attendance',
        device : employee.device
    });
}

const getDeviceData = async (req, res) => {
  const employee = req.employee;
  res.send({ device: employee.device });
};

function getDateTime() {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo', // Egypt's time zone
    }).format(new Date());
    return today;
}

const attendStudent = async (req, res) => {
  const { searchStudent } = req.body;

  try {
  
   
    // Find student based on barcode or phone number
    const student = await Student.findOne({
      $or: [{ barCode: searchStudent }, { studentCode: searchStudent }],
    }).populate('studentTeacher', 'teacherName subjectName teacherFees');

    if (!student) {
      return res.status(404).json({ message: 'هذا الطالب غير موجود' });
    }

    // Use upsert to find or create today's attendance in one step
    const attendance = await Attendance.findOneAndUpdate(
      { date: getDateTime() }, // Find today's attendance
      {
        $setOnInsert: {
          date: getDateTime(),
          studentsPresent: [],
          employees: [],
        },
      },
      { new: true, upsert: true } // Return the updated or created document
    );

    // Check if the student is already marked as present
    if (attendance.studentsPresent.includes(student._id)) {
      return res.status(400).json({ message: 'تم تسجيل حضور الطالب بالفعل' });
    }

    // Update attendance with the student's ID and the employee ID (if not already included)
    const updateOps = {
      $push: { studentsPresent: student._id },
    };

    if (!attendance.employees.includes(req.employeeId)) {
      updateOps.$push.employees = req.employeeId;
    }

    // Apply the updates to the attendance record
    await Attendance.updateOne({ _id: attendance._id }, updateOps);

    // Populate only after updating to minimize in-memory operations
    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'studentsPresent',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName',
        },
      })
      .populate('employees');

    res.status(201).json({
      message: 'تم تسجيل الحضور ',
      studentData : student,
      students: updatedAttendance.studentsPresent, // Populated student data with teacher details
    });

    console.log(updatedAttendance.studentsPresent);
  } catch (error) {
    console.error('Error attending student:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};


const getAttendedStudents = async (req, res) => {
  try {
     
        // console.log(today);
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      date: getDateTime(),
    }).populate({
      path: 'studentsPresent', // Populate student details
      populate: {
        path: 'studentTeacher', // Populate the teacher field for each student
        select: 'teacherName subjectName teacherFees paymentType', // Include teacher fees
      },
    });

  // console.log(attendance);

    if (!attendance) {
      return res.status(404).json({ message: 'لا يوجد حضور ' });
    }

    let totalAmountFromAllStudents = 0; // Total collected from all students
    let totalFeesFromAllTeachers = 0; // Sum of fees for all teachers
    let teacherData = {}; // Object to store per-teacher data

    // Iterate over students to calculate totals
    for (const student of attendance.studentsPresent) {
      const teacher = student.studentTeacher;

   
      if (!teacher) {
        continue; // Skip if no teacher data is available
      }

     
      const teacherId = teacher._id.toString();

      // Initialize teacher's data if not already present
      if (!teacherData[teacherId]) {
        teacherData[teacherId] = {
          teacherId: teacher._id,
          teacherName: teacher.teacherName,
          subjectName: teacher.subjectName,
          paymentType: teacher.paymentType,
          totalAmount: 0, // Total actual amount collected from students
          totalFees: 0, // Total calculated fees for the teacher
          netProfit: 0, // Net profit (calculated later)
          totalStudents: 0, // Number of students
        };
      }
      console.log(teacher.paymentType);
      if (teacher.paymentType == 'perSession') {
        // Add the student's amount to the overall total
        totalAmountFromAllStudents += student.studentAmount;

        // Add the student's amount to the teacher's total amount
        teacherData[teacherId].totalAmount += student.studentAmount;

        // Calculate the teacher's fees (number of students * teacher fees)
        teacherData[teacherId].totalFees += teacher.teacherFees;

        // Add to the overall total fees
        totalFeesFromAllTeachers += teacher.teacherFees;

      }
      // Increment the number of students for the teacher
      teacherData[teacherId].totalStudents += 1;

    }

    // Calculate net profit for each teacher
    for (const teacherId in teacherData) {
      const teacher = teacherData[teacherId];
      teacher.netProfit = teacher.totalAmount - teacher.totalFees;
    }

    // Convert the teacher data into an array for easier frontend usage
    const teachersSummary = Object.values(teacherData);
    console.log(teachersSummary);
    res.send({
      students: attendance.studentsPresent,
      message: 'حضور اليوم',
      totalAmount: totalAmountFromAllStudents, // Overall total amount
      totalFees: totalFeesFromAllTeachers, // Overall total fees
      teachersSummary, // Detailed breakdown per teacher
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send({ message: ' يبدو ان هناك مشكله ما حاول مره اخري ' });
  }
};


const deleteAttendStudent = async (req, res) => {
  const { id } = req.params;

  try {
    // Attempt to remove the student directly using $pull
    const updateResult = await Attendance.updateOne(
      { date: getDateTime() }, // Match the attendance record for today
      { $pull: { studentsPresent: id } } // Remove the student from the array
    );

    // If no records were modified, the student was not found
    if (updateResult.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: 'Student not found in attendance' });
    }

    // Fetch the updated attendance record to return the remaining students
    const attendance = await Attendance.findOne({
      date: getDateTime(),
    }).populate({
      path: 'studentsPresent', // Populate student details
      populate: {
        path: 'studentTeacher', // Populate teacher details
        select: 'teacherName subjectName', // Select specific fields
      },
    });

    res.send({
      message: 'Student removed from attendance',
      students: attendance.studentsPresent,
    });
  } catch (error) {
    console.error('Error deleting student from attendance:', error);
    res.status(500).json({
      message: 'An error occurred while deleting the student from attendance',
    });
  }
};

const downloadAttendanceExcel = async (req, res) => {
  try {

    console.log(getDateTime());
    const attendance = await Attendance.findOne({
      date: getDateTime(),
    }).populate({
      path: 'studentsPresent',
      populate: {
        path: 'studentTeacher',
        select: 'teacherName subjectName teacherFees paymentType', // Include teacher details
      },
    });

    if (!attendance) {
      
      return res.status(404).json({ message: 'No attendance record found' });
    }

    console.log(attendance);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define new styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 14 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const columnHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const totalRowStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5733' } }, // Bright orange for totals
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Add a prominent header row with the date
    worksheet.mergeCells('A1:E1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report - ${new Date().toDateString()}`;
    worksheet.getCell('A1').style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    };

    let rowIndex = 2;

    const teacherData = {};
    let overallTotalAmount = 0;
    let overallTotalFees = 0;
    let overallTotalProfit = 0;

    // Organize students by teacher
    for (const student of attendance.studentsPresent) {
      const teacherName = student.studentTeacher.teacherName;
      const studentName = student.studentName;
      const studentPhoneNumber = student.studentPhoneNumber;
      const studentAmount = student.studentAmount;
      const teacherFees = student.studentTeacher.teacherFees;
      const amountRemaining = student.amountRemaining;
      if (!teacherData[teacherName]) {
        teacherData[teacherName] = {
          students: [],
          paymentType: student.studentTeacher.paymentType,
          totalAmount: 0,
          totalAmountRemaining: 0,
          totalFees: 0,
          totalProfit: 0,
        };
      }

      teacherData[teacherName].students.push({
        studentName,
        studentPhoneNumber,
        studentAmount,
        teacherFees,
        amountRemaining,
        netProfit: studentAmount - teacherFees,
      });
      teacherData[teacherName].totalAmount += studentAmount;
      teacherData[teacherName].totalAmountRemaining += amountRemaining;
      teacherData[teacherName].totalFees += teacherFees;
      teacherData[teacherName].totalProfit += studentAmount - teacherFees;
      if (student.paymentType == 'perSession') {
        overallTotalAmount += studentAmount;
        overallTotalFees += teacherFees;
        overallTotalProfit += studentAmount - teacherFees;
      }
    }

    // Populate data by teacher
    for (const teacherName in teacherData) {
      // Add teacher name as a header
      worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = teacherName;
      worksheet.getCell(`A${rowIndex}`).style = headerStyle;
      rowIndex++;
      const isTeacherPerSession = teacherData[teacherName].paymentType == 'perSession';
      // Column headers for student data
      worksheet.getRow(rowIndex).values = [
        'Student Name',
        'Phone Number',
        'Amount (EGP)',
        isTeacherPerSession ? 'Center Fees (EGP)' : 'Amount Remaining (EGP)',
        isTeacherPerSession ?'Teacher Fees (EGP)':'',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = columnHeaderStyle));
      rowIndex++;
    
      // Add student data rows
      teacherData[teacherName].students.forEach((student) => {
          console.log(student.studentAmount);
        worksheet.getRow(rowIndex).values = [
          student.studentName,
          student.studentPhoneNumber,
          student.studentAmount,
          isTeacherPerSession ? student.teacherFees : student.studentAmount,
          isTeacherPerSession ? student.netProfit:'',
        ];
        worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = cellStyle));
        rowIndex++;
      });

      // Add totals for the teacher
      worksheet.getRow(rowIndex).values = [
        `Total for ${teacherName}`,
        '',
        teacherData[teacherName].totalAmount,
        isTeacherPerSession
          ? teacherData[teacherName].totalFees
          : teacherData[teacherName].totalAmountRemaining,
        isTeacherPerSession ? teacherData[teacherName].totalProfit:'',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = totalRowStyle));
      rowIndex++;
    }

    // Overall totals
    worksheet.mergeCells(`A${rowIndex+1}:B${rowIndex+1}`);
    worksheet.getCell(`A${rowIndex+1}`).value = 'Overall Total';
    worksheet.getCell(`A${rowIndex+1}`).style = totalRowStyle;
    worksheet.getCell(`C${rowIndex+1}`).value = overallTotalAmount;
    worksheet.getCell(`C${rowIndex+1}`).style = totalRowStyle;
    worksheet.getCell(`D${rowIndex+1}`).value = overallTotalFees;
    worksheet.getCell(`D${rowIndex+1}`).style = totalRowStyle;
    worksheet.getCell(`E${rowIndex+1}`).value = overallTotalProfit;
    worksheet.getCell(`E${rowIndex+1}`).style = totalRowStyle;

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount
      { width: 20 }, // Fees
      { width: 20 }, // Net Profit
    ];

    // Export the Excel file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Attendance_Report_${new Date().toDateString()}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating attendance Excel:', error);
    console.log(error);
    res.status(500).json({ message: 'Error generating attendance Excel' });
  }
};


const downloadAndSendExcelForTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const attendance = await Attendance.findOne({
      date: getDateTime(),
    }).populate({ path: 'studentsPresent', populate: 'studentTeacher' });

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found' });
    }

    const teacher = attendance.studentsPresent.find(
      (student) =>
        student.studentTeacher && student.studentTeacher._id.toString() === id
    )?.studentTeacher;

    if (!teacher) {
      return res
        .status(404)
        .json({ message: 'No teacher found for the given ID' });
    }

    const teacherName = teacher.teacherName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const teacherPhoneNumber = teacher.teacherPhoneNumber;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 14 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const columnHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const totalRowStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5733' } }, // Bright orange
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Add header
    worksheet.mergeCells('A1:F1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report for ${new Date().toDateString()}`;
    worksheet.getCell('A1').style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    };
    const isTeacherSession = teacher.paymentType == 'perSession';
    // Add column headers
    worksheet.getRow(2).values = [
      'Student Name',
      'Phone Number',
      'Amount (EGP)',
      isTeacherSession ? `Center Fees (EGP)` : 'Amount Remaining (EGP)',
      isTeacherSession ? 'Teacher Fees (EGP)' : '',
      'Total Students',
    ];
    worksheet.getRow(2).eachCell((cell) => (cell.style = columnHeaderStyle));

    let totalAmount = 0;
    let totalAmountRemaining =0
    let totalFees = 0;
    let totalProfit = 0;
    let rowIndex = 3;

    // Add student data rows
    for (const student of attendance.studentsPresent) {
      if (
        !student.studentTeacher ||
        student.studentTeacher._id.toString() !== id
      ) {
        continue;
      }

      const studentAmount = student.studentAmount;
      const teacherFees = student.studentTeacher.teacherFees;
      const studentAmountRemaining = student.amountRemaining;
      worksheet.getRow(rowIndex).values = [
        student.studentName,
        student.studentPhoneNumber,
        studentAmount,
        isTeacherSession ? teacherFees : student.amountRemaining,
        isTeacherSession? studentAmount - teacherFees :'',
      ];
      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = cellStyle));

      totalAmount += studentAmount;
      totalAmountRemaining += studentAmountRemaining;
      totalFees += teacherFees;
      totalProfit += studentAmount - teacherFees;

      rowIndex++;
    }

    // Add totals
    worksheet.getRow(rowIndex).values = [
      'Total',
      '',
      totalAmount,
      isTeacherSession ? totalFees :totalAmountRemaining ,
      isTeacherSession ? totalProfit : '',
      attendance.studentsPresent.filter(student => student.studentTeacher._id.toString() === id).length,
    ];
    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = totalRowStyle));

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount
      { width: 20 }, // Fees
      { width: 20 }, // Net Profit
      { width: 20 }, // Total Students
    ];
// Create the Excel workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64'); // Convert the Excel buffer to a Base64 string

    const fileName = `Attendance_Report_${teacherName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Send the file via WhatsApp API
    // await waapi.postInstancesIdClientActionSendMedia(
    //   {
    //     mediaBase64: base64Excel, // Base64-encoded Excel file
    //     chatId: `2${teacherPhoneNumber}@c.us`,
    //     mediaName: fileName,
    //     mediaCaption: `Attendance Report for ${teacherName} - ${new Date().toDateString()}`,
    //   },
    //   { id: '3421302' } // Replace with actual instance ID if required
    // );
    console.log('Excel file sent via WhatsApp');

    // Export the Excel file as a downloadable attachment
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Attendance_Report_${new Date().toDateString()}.xlsx"`
    );
    
    // Write the Excel file to the response stream
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error processing the Excel file:', error);
    // Send a response only once, in case of an error
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing the Excel file' });
    }
  }

};




// ======================================== End Attendance ======================================== //



// ======================================== handel Attendace ======================================== //

const handelAttendance = async (req, res) => {
  res.render('employee/handelAttendance', {
    title: 'Handel Attendance',
    path: '/employee/handel-attendance',
  });
}
const getAttendanceByDate = async (req, res) => {
  const { date  } = req.query;
  try {
    // console.log(today);
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      date: date,
    }).populate({
      path: 'studentsPresent', // Populate student details
      populate: {
        path: 'studentTeacher', // Populate the teacher field for each student
        select: 'teacherName subjectName teacherFees paymentType', // Include teacher fees
      },
    });

    // console.log(attendance);

    if (!attendance) {
      return res.status(404).json({ message: 'لا يوجد حضور ' });
    }

    let totalAmountFromAllStudents = 0; // Total collected from all students
    let totalFeesFromAllTeachers = 0; // Sum of fees for all teachers
    let teacherData = {}; // Object to store per-teacher data

    // Iterate over students to calculate totals
    for (const student of attendance.studentsPresent) {
      const teacher = student.studentTeacher;

      if (!teacher) {
        continue; // Skip if no teacher data is available
      }

      const teacherId = teacher._id.toString();

      // Initialize teacher's data if not already present
      if (!teacherData[teacherId]) {
        teacherData[teacherId] = {
          teacherId: teacher._id,
          teacherName: teacher.teacherName,
          subjectName: teacher.subjectName,
          paymentType: teacher.paymentType,
          totalAmount: 0, // Total actual amount collected from students
          totalFees: 0, // Total calculated fees for the teacher
          netProfit: 0, // Net profit (calculated later)
          totalStudents: 0, // Number of students
        };
      }
      console.log(teacher.paymentType);
      if (teacher.paymentType == 'perSession') {
        // Add the student's amount to the overall total
        totalAmountFromAllStudents += student.studentAmount;

        // Add the student's amount to the teacher's total amount
        teacherData[teacherId].totalAmount += student.studentAmount;

        // Calculate the teacher's fees (number of students * teacher fees)
        teacherData[teacherId].totalFees += teacher.teacherFees;

        // Add to the overall total fees
        totalFeesFromAllTeachers += teacher.teacherFees;
      }
      // Increment the number of students for the teacher
      teacherData[teacherId].totalStudents += 1;
    }

    // Calculate net profit for each teacher
    for (const teacherId in teacherData) {
      const teacher = teacherData[teacherId];
      teacher.netProfit = teacher.totalAmount - teacher.totalFees;
    }

    // Convert the teacher data into an array for easier frontend usage
    const teachersSummary = Object.values(teacherData);
    console.log(teachersSummary);
    res.send({
      students: attendance.studentsPresent,
      message: 'حضور اليوم',
      totalAmount: totalAmountFromAllStudents, // Overall total amount
      totalFees: totalFeesFromAllTeachers, // Overall total fees
      teachersSummary, // Detailed breakdown per teacher
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send({ message: ' يبدو ان هناك مشكله ما حاول مره اخري ' });
  }

}

const downloadAttendanceExcelByDate = async (req, res) => {
  const { date } = req.query;
  try {
    console.log(getDateTime());
    const attendance = await Attendance.findOne({
      date: date,
    }).populate({
      path: 'studentsPresent',
      populate: {
        path: 'studentTeacher',
        select: 'teacherName subjectName teacherFees paymentType', // Include teacher details
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found' });
    }

    console.log(attendance);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define new styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 14 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const columnHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const totalRowStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5733' } }, // Bright orange for totals
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Add a prominent header row with the date
    worksheet.mergeCells('A1:E1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report - ${new Date().toDateString()}`;
    worksheet.getCell('A1').style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    };

    let rowIndex = 2;

    const teacherData = {};
    let overallTotalAmount = 0;
    let overallTotalFees = 0;
    let overallTotalProfit = 0;

    // Organize students by teacher
    for (const student of attendance.studentsPresent) {
      const teacherName = student.studentTeacher.teacherName;
      const studentName = student.studentName;
      const studentPhoneNumber = student.studentPhoneNumber;
      const studentAmount = student.studentAmount;
      const teacherFees = student.studentTeacher.teacherFees;
      const amountRemaining = student.amountRemaining;
      if (!teacherData[teacherName]) {
        teacherData[teacherName] = {
          students: [],
          paymentType: student.studentTeacher.paymentType,
          totalAmount: 0,
          totalAmountRemaining: 0,
          totalFees: 0,
          totalProfit: 0,
        };
      }

      teacherData[teacherName].students.push({
        studentName,
        studentPhoneNumber,
        studentAmount,
        teacherFees,
        amountRemaining,
        netProfit: studentAmount - teacherFees,
      });
      teacherData[teacherName].totalAmount += studentAmount;
      teacherData[teacherName].totalAmountRemaining += amountRemaining;
      teacherData[teacherName].totalFees += teacherFees;
      teacherData[teacherName].totalProfit += studentAmount - teacherFees;
      if (student.paymentType == 'perSession') {
        overallTotalAmount += studentAmount;
        overallTotalFees += teacherFees;
        overallTotalProfit += studentAmount - teacherFees;
      }
    }

    // Populate data by teacher
    for (const teacherName in teacherData) {
      // Add teacher name as a header
      worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = teacherName;
      worksheet.getCell(`A${rowIndex}`).style = headerStyle;
      rowIndex++;
      const isTeacherPerSession =
        teacherData[teacherName].paymentType == 'perSession';
      // Column headers for student data
      worksheet.getRow(rowIndex).values = [
        'Student Name',
        'Phone Number',
        'Amount (EGP)',
        isTeacherPerSession ? 'Center Fees (EGP)' : 'Amount Remaining (EGP)',
        isTeacherPerSession ? 'Teacher Fees (EGP)' : '',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = columnHeaderStyle));
      rowIndex++;

      // Add student data rows
      teacherData[teacherName].students.forEach((student) => {
        console.log(student.studentAmount);
        worksheet.getRow(rowIndex).values = [
          student.studentName,
          student.studentPhoneNumber,
          student.studentAmount,
          isTeacherPerSession ? student.teacherFees : student.studentAmount,
          isTeacherPerSession ? student.netProfit : '',
        ];
        worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = cellStyle));
        rowIndex++;
      });

      // Add totals for the teacher
      worksheet.getRow(rowIndex).values = [
        `Total for ${teacherName}`,
        '',
        teacherData[teacherName].totalAmount,
        isTeacherPerSession
          ? teacherData[teacherName].totalFees
          : teacherData[teacherName].totalAmountRemaining,
        isTeacherPerSession ? teacherData[teacherName].totalProfit : '',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = totalRowStyle));
      rowIndex++;
    }

    // Overall totals
    worksheet.mergeCells(`A${rowIndex + 1}:B${rowIndex + 1}`);
    worksheet.getCell(`A${rowIndex + 1}`).value = 'Overall Total';
    worksheet.getCell(`A${rowIndex + 1}`).style = totalRowStyle;
    worksheet.getCell(`C${rowIndex + 1}`).value = overallTotalAmount;
    worksheet.getCell(`C${rowIndex + 1}`).style = totalRowStyle;
    worksheet.getCell(`D${rowIndex + 1}`).value = overallTotalFees;
    worksheet.getCell(`D${rowIndex + 1}`).style = totalRowStyle;
    worksheet.getCell(`E${rowIndex + 1}`).value = overallTotalProfit;
    worksheet.getCell(`E${rowIndex + 1}`).style = totalRowStyle;

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount
      { width: 20 }, // Fees
      { width: 20 }, // Net Profit
    ];

    // Export the Excel file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Attendance_Report_${new Date().toDateString()}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating attendance Excel:', error);
    console.log(error);
    res.status(500).json({ message: 'Error generating attendance Excel' });
  }
}

const downloadAndSendExcelForTeacherByDate = async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;
  try {
    const attendance = await Attendance.findOne({
      date: date,
    }).populate({ path: 'studentsPresent', populate: 'studentTeacher' });

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found' });
    }

    const teacher = attendance.studentsPresent.find(
      (student) =>
        student.studentTeacher && student.studentTeacher._id.toString() === id
    )?.studentTeacher;

    if (!teacher) {
      return res
        .status(404)
        .json({ message: 'No teacher found for the given ID' });
    }

    const teacherName = teacher.teacherName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const teacherPhoneNumber = teacher.teacherPhoneNumber;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 14 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const columnHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const totalRowStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5733' } }, // Bright orange
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Add header
    worksheet.mergeCells('A1:F1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report for ${new Date().toDateString()}`;
    worksheet.getCell('A1').style = {
      font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    };
    const isTeacherSession = teacher.paymentType == 'perSession';
    // Add column headers
    worksheet.getRow(2).values = [
      'Student Name',
      'Phone Number',
      'Amount (EGP)',
      isTeacherSession ? `Center Fees (EGP)` : 'Amount Remaining (EGP)',
      isTeacherSession ? 'Teacher Fees (EGP)' : '',
      'Total Students',
    ];
    worksheet.getRow(2).eachCell((cell) => (cell.style = columnHeaderStyle));

    let totalAmount = 0;
    let totalAmountRemaining = 0;
    let totalFees = 0;
    let totalProfit = 0;
    let rowIndex = 3;

    // Add student data rows
    for (const student of attendance.studentsPresent) {
      if (
        !student.studentTeacher ||
        student.studentTeacher._id.toString() !== id
      ) {
        continue;
      }

      const studentAmount = student.studentAmount;
      const teacherFees = student.studentTeacher.teacherFees;
      const studentAmountRemaining = student.amountRemaining;
      worksheet.getRow(rowIndex).values = [
        student.studentName,
        student.studentPhoneNumber,
        studentAmount,
        isTeacherSession ? teacherFees : student.amountRemaining,
        isTeacherSession ? studentAmount - teacherFees : '',
      ];
      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = cellStyle));

      totalAmount += studentAmount;
      totalAmountRemaining += studentAmountRemaining;
      totalFees += teacherFees;
      totalProfit += studentAmount - teacherFees;

      rowIndex++;
    }

    // Add totals
    worksheet.getRow(rowIndex).values = [
      'Total',
      '',
      totalAmount,
      isTeacherSession ? totalFees : totalAmountRemaining,
      isTeacherSession ? totalProfit : '',
      attendance.studentsPresent.filter(
        (student) => student.studentTeacher._id.toString() === id
      ).length,
    ];
    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = totalRowStyle));

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount
      { width: 20 }, // Fees
      { width: 20 }, // Net Profit
      { width: 20 }, // Total Students
    ];
    // Create the Excel workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64'); // Convert the Excel buffer to a Base64 string

    const fileName = `Attendance_Report_${teacherName}_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;

    // Send the file via WhatsApp API
    await waapi.postInstancesIdClientActionSendMedia(
      {
        mediaBase64: base64Excel, // Base64-encoded Excel file
        chatId: `2${teacherPhoneNumber}@c.us`,
        mediaName: fileName,
        mediaCaption: `Attendance Report for ${teacherName} - ${new Date().toDateString()}`,
      },
      { id: '3421302' } // Replace with actual instance ID if required
    );
    console.log('Excel file sent via WhatsApp');

    // Export the Excel file as a downloadable attachment
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Attendance_Report_${new Date().toDateString()}.xlsx"`
    );

    // Write the Excel file to the response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error processing the Excel file:', error);
    // Send a response only once, in case of an error
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing the Excel file' });
    }
  }
}


// ======================================== End handel Attendace ======================================== //






// ======================================== LogOut ======================================== //


const logOut = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = {
    dashboard,
    teacherSechdule,
    // Billing
    billing_Get,
    addBill,
    getAllBills,

    // Add Student
    getAddStudent,
    getAllStudents,
    getStudent,
    updateStudent,
    addStudent,
    getDeviceData,
    searchStudent,

    // Teacher
    
    teacher_Get,
    addTeacher,
    getTeachers,
    getTeacher,
    updateTeacher,


    // Attendance

    getAttendance,
    attendStudent,
    getAttendedStudents,
    deleteAttendStudent,
    downloadAttendanceExcel,
    downloadAndSendExcelForTeacher,

    // handel Attendance
    handelAttendance,
    getAttendanceByDate,
    downloadAttendanceExcelByDate,
    downloadAndSendExcelForTeacherByDate,

    logOut,
}
