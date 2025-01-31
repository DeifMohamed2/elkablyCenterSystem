const Employee = require('../models/employee');
const Billing = require('../models/billing');
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const qrcode = require('qrcode');
const ExcelJS = require('exceljs');


const waapi = require('@api/waapi');
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
    const allTeachers = await Teacher.find({}, { teacherName: 1 , paymentType: 1 });
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
  
  if (student.paymentType === 'perCourse') {
    if ((student.amountRemaining - installmentAmount) <= 0) {
      return res.status(200).send(student);
    }
    student.amountRemaining -= installmentAmount;
    student.paidHistory.push({
      amount: installmentAmount,
      date: new Date(),
      employee: req.employee._id,
    });

    if (installmentAmount>0) {
      const parentMessage = `
عزيزي ولي أمر الطالب ${student.studentName},
-----------------------------
نود إعلامكم بأنه تم دفع مبلغ ${installmentAmount} جنيه من إجمالي المبلغ المستحق.
المبلغ المتبقي هو ${student.amountRemaining} جنيه.
الكورس: ${student.subject}
المعلم: ${student.studentTeacher.teacherName}
التاريخ: ${new Date().toLocaleDateString()}
شكرًا لتعاونكم.
    `;

      await waapi.postInstancesIdClientActionSendMessage(
        {
          chatId: `2${student.studentParentPhone}@c.us`,
          message: parentMessage,
        },
        { id: '34202' }
      );
    }
    await student.save();
  }
 return res.send(student);
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
      amountRemaining: paymentType === 'perSession' ? 0 : studentAmount,
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


const sendWa = async (req, res) => {
  const { teacher, message } = req.query;
  try {
  const students = await Student.find({ studentTeacher: teacher }).populate(
    'studentTeacher',
    'teacherName subjectName'
  );

  for (const student of students) {
    const waNumber = `2${student.studentParentPhone}@c.us`;

    const messageUpdate = `
عزيزي ولي امر الطالب ${student.studentName}
هذه الرساله من كورس ${student.studentTeacher.subjectName} بتاريخ ${new Date().toLocaleDateString()}
والذي يقوم بتدريسه المدرس ${student.studentTeacher.teacherName}
${message}
--------------------------
ويرجي العلم انهو تم سداد حتي الان ${student.studentAmount - student.amountRemaining} من اجمالي المبلغ
والباقي ${student.amountRemaining} جنيه
تحياتنا
`;

    await waapi
      .postInstancesIdClientActionSendMessage(
        {
          chatId: waNumber,
          message: messageUpdate,
        },
        { id: '34202' }
      )
      .then((response) => {
        console.log('Message sent:', response.data);
      })
      .catch((error) => {
        console.error('Error sending message:', error);
      });

    // Random delay between 1 to 3 seconds between each message
    const delay = Math.floor(Math.random() * 3000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  res.status(200).send({ message: 'Messages sent successfully' });
} catch (error) {
  console.error('Error sending messages:', error);
  res.status(500).send({ error: 'An error occurred while sending messages' });
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
  console.time('attendStudentExecutionTime'); // Start timer

  const { searchStudent } = req.body;
  const employeeId = req.employeeId; // Assuming employee ID is available in the request

  try {
    // Find the student based on barcode or student code
    const student = await Student.findOne({
      $or: [{ barCode: searchStudent }, { studentCode: searchStudent }],
    }).populate('studentTeacher', 'teacherName subjectName teacherFees');

    if (!student) {
      return res.status(404).json({ message: 'هذا الطالب غير موجود' });
    }

    // Find or create today's attendance record
    const todayDate = getDateTime(); // Cache date for consistency
    let attendance = await Attendance.findOne({ date: todayDate });

    if (!attendance) {
      attendance = new Attendance({ date: todayDate, studentsPresent: [] });
    }

    // Check if the student is already marked present
    const isStudentPresent = attendance.studentsPresent.some(
      (entry) => entry.student.toString() === student._id.toString()
    );

    if (isStudentPresent) {
      return res.status(400).json({ message: 'تم تسجيل حضور الطالب بالفعل' });
    }

    // Calculate payment details for "perSession" students
    const isPerSession = student.paymentType === 'perSession';
    const amountPaid = isPerSession ? student.studentAmount : 0;
    const feesApplied = isPerSession ? student.studentTeacher.teacherFees : 0;
    const teacherProfit = isPerSession ? amountPaid - feesApplied : 0;

    // Add the student to the attendance record
    attendance.studentsPresent.push({
      student: student._id,
      addedBy: employeeId,
      amountPaid,
      feesApplied,
    });

    // Update totals for "perSession" students
    if (isPerSession) {
      attendance.totalAmount += amountPaid;
      attendance.totalFees += feesApplied;

      // Add or update the teacher's profit
      const teacherId = student.studentTeacher._id.toString();
      const existingProfitEntry = attendance.netProfitToTeachers.find(
        (entry) => entry.teacher.toString() === teacherId
      );

      if (existingProfitEntry) {
        existingProfitEntry.amount += teacherProfit;
        existingProfitEntry.feesAmount += feesApplied;
      } else {
        attendance.netProfitToTeachers.push({
          teacher: teacherId,
          amount: teacherProfit,
          feesAmount: feesApplied,
        });
      }
    }

    // Save the attendance record
    await attendance.save();

    // Populate updated attendance data
    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName'); // Populate employee details if needed

    console.timeEnd('attendStudentExecutionTime'); // End timer
    // Respond with updated data
    res.status(201).json({
      message: 'تم تسجيل الحضور',
      studentData: student,
      students: updatedAttendance.studentsPresent,
    });
  } catch (error) {
    console.error('Error attending student:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};


const getAttendedStudents = async (req, res) => {
  try {
    // Fetch today's attendance record
    const attendance = await Attendance.findOne({
      date: getDateTime(),
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName');

    if (!attendance) {
      return res.status(404).json({ message: 'لا يوجد حضور ' });
    }

    let totalAmountFromAllStudents = 0;
    let totalFeesFromAllTeachers = 0;

    // Helper maps for teachers and employees
    const teacherData = {};
    const employeeData = {};

    // Iterate over attendance records
    for (const {
      student,
      addedBy,
      amountPaid,
      feesApplied,
    } of attendance.studentsPresent) {
      if (!student || !student.studentTeacher) continue;

      const teacher = student.studentTeacher;
      const teacherId = teacher._id.toString();
      const employeeId = addedBy._id.toString();

      // Update teacher data
      if (!teacherData[teacherId]) {
        teacherData[teacherId] = {
          teacherId: teacher._id,
          teacherName: teacher.teacherName,
          subjectName: teacher.subjectName,
          paymentType: teacher.paymentType,
          totalAmount: 0,
          totalFees: 0,
          netProfit: 0,
          totalStudents: 0,
        };
      }

      teacherData[teacherId].totalAmount += amountPaid;
      teacherData[teacherId].totalFees += feesApplied;
      teacherData[teacherId].totalStudents += 1;
      console.log(amountPaid, feesApplied);
      totalAmountFromAllStudents += amountPaid;
      totalFeesFromAllTeachers += feesApplied;

      // Update employee data
      if (!employeeData[employeeId]) {
        employeeData[employeeId] = {
          employeeId: employeeId,
          employeeName: addedBy.employeeName,
          count: 0,
          totalAmount: 0,
          percentage: 0,
        };
      }

      employeeData[employeeId].count += 1;
      employeeData[employeeId].totalAmount += amountPaid;
    }

    // Calculate net profits for teachers
    for (const teacherId in teacherData) {
      const teacher = teacherData[teacherId];
      teacher.netProfit = teacher.totalAmount - teacher.totalFees;
    }

    // Calculate percentages for employees
    for (const employeeId in employeeData) {
      employeeData[employeeId].percentage = (
        (employeeData[employeeId].totalAmount / totalAmountFromAllStudents) *
        100
      ).toFixed(2);
    }
    // console.log(totalAmountFromAllStudents);
    // console.log('Employee student count:', Object.values(employeeData));

    attendance.totalAmount = totalAmountFromAllStudents;
    attendance.totalFees = totalFeesFromAllTeachers;
    await attendance.save();

    res.status(200).json({
      students: attendance.studentsPresent,
      message: 'حضور اليوم',
      totalAmount: totalAmountFromAllStudents,
      totalFees: totalFeesFromAllTeachers,
      teachersSummary: Object.values(teacherData),
      employeesSummary: Object.values(employeeData),
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};


const deleteAttendStudent = async (req, res) => {
  const { id } = req.params;

  try {
    console.log('Deleting student:', id);

    // Find the attendance record for today and the student being removed
    const attendance = await Attendance.findOne(
      { date: getDateTime(), 'studentsPresent._id': id },
      { 'studentsPresent.$': 1 } // Fetch only the matching student
    );

    if (!attendance || !attendance.studentsPresent.length) {
      return res
        .status(404)
        .json({ message: 'Student not found in attendance' });
    }

    const studentEntry = attendance.studentsPresent[0];
    const { amountPaid, feesApplied, student: studentId } = studentEntry;

    // Fetch the student to get the teacher details
    const student = await Student.findById(studentId).populate(
      'studentTeacher',
      'teacherFees'
    );

    if (!student) {
      return res.status(404).json({ message: 'Student details not found' });
    }

    const teacherId = student.studentTeacher._id;
    const teacherFees = student.studentTeacher.teacherFees;

    // Update the attendance record
    const updateResult = await Attendance.updateOne(
      { date: getDateTime() },
      {
        $pull: { studentsPresent: { _id: id } },
        $inc: {
          totalAmount: -amountPaid,
          totalFees: -feesApplied,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ message: 'Failed to remove student' });
    }

    // Update the teacher's profit in netProfitToTeachers
    const profitReduction = amountPaid - teacherFees;
    await Attendance.updateOne(
      {
        date: getDateTime(),
        'netProfitToTeachers.teacher': teacherId,
      },
      {
        $inc: { 'netProfitToTeachers.$.amount': -profitReduction , 'netProfitToTeachers.$.feesAmount': -feesApplied },
      }
    );

    // Fetch updated attendance to return the remaining students
    const updatedAttendance = await Attendance.findOne({
      date: getDateTime(),
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName');

    res.status(200).json({
      message: 'Student removed from attendance',
      students: updatedAttendance.studentsPresent,
    });
  } catch (error) {
    console.error('Error deleting student from attendance:', error);
    res.status(500).json({
      message: 'An error occurred while deleting the student from attendance',
    });
  }
};

const editStudentAmountRemaining = async (req, res) => {
  const { id } = req.params;
  const { amountRemainingSessions } = req.body;

  try {
    console.log(
      'Updating student amount remaining:',
      id,
      amountRemainingSessions
    );
    const student = await Student.findById(id).populate('studentTeacher', 'teacherFees');
    console.log('Student:', student);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update the amount paid in the attendance record
    const todayDate = getDateTime();
    const attendance = await Attendance.findOne({
      date: todayDate,
      'studentsPresent.student': id,
    })

    if (attendance) {
      const studentAttendance = attendance.studentsPresent.find(
        (entry) => entry.student.toString() === id
      );
      console.log('Student attendance:', studentAttendance);
      if (studentAttendance) {
      
       studentAttendance.amountPaid += (student.amountRemainingSessions - amountRemainingSessions);
       if (studentAttendance.amountPaid<=0){
        studentAttendance.amountPaid = 0;
        studentAttendance.feesApplied=0;
       }
       console.log( student.studentTeacher.teacherFees);
      if (studentAttendance.amountPaid > 0) {
         studentAttendance.feesApplied = student.studentTeacher.teacherFees||0;
      }
       await attendance.save();
      }
    }
    // Update the student's amount remaining
    student.amountRemainingSessions = amountRemainingSessions;

    await student.save();

    res
      .status(200)
      .json({ message: 'Student amount remaining updated', student });
  } catch (error) {
    console.error('Error updating student amount remaining:', error);
    res.status(500).json({
      message: 'An error occurred while updating student amount remaining',
    });

  }
};

const downloadAttendanceExcel = async (req, res) => {
  try {
    // Fetch today's attendance record
    const attendance = await Attendance.findOne({
      date: getDateTime(),
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName');

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Styles for the sheet
    const styles = {
      header: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      columnHeader: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      totalRow: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
      },
    };

    // Sheet title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report - ${new Date().toDateString()}`;
    worksheet.getCell('A1').style = styles.header;

    let rowIndex = 2;

    const teacherData = {};
    const employeeData = {};
    let totalAmount = 0;
    let totalFees = 0;

    // Aggregate attendance data
    for (const {
      student,
      addedBy,
      amountPaid,
      feesApplied,
    } of attendance.studentsPresent) {
      if (!student || !student.studentTeacher) continue;

      const teacher = student.studentTeacher;
      const teacherId = teacher._id.toString();
      const employeeId = addedBy._id.toString();

      // Aggregate teacher data
      if (!teacherData[teacherId]) {
        teacherData[teacherId] = {
          teacherName: teacher.teacherName,
          subjectName: teacher.subjectName,
          totalAmount: 0,
          totalFees: 0,
          netProfit: 0,
          students: [],
        };
      }

      teacherData[teacherId].totalAmount += amountPaid;
      teacherData[teacherId].totalFees += feesApplied;
      teacherData[teacherId].students.push({
        studentName: student.studentName,
        phoneNumber: student.studentPhoneNumber,
        amountPaid,
        feesApplied,
        netProfit: amountPaid - feesApplied,
        addedBy: addedBy.employeeName,
      });

      totalAmount += amountPaid;
      totalFees += feesApplied;

      // Aggregate employee data
      if (!employeeData[employeeId]) {
        employeeData[employeeId] = {
          employeeName: addedBy.employeeName,
          totalAmount: 0,
          count: 0,
        };
      }

      employeeData[employeeId].totalAmount += amountPaid;
      employeeData[employeeId].count++;
    }

    // Add Employee Summary Section
    worksheet.getRow(rowIndex).values = ['Employee Summary'];
    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.header));
    rowIndex++;

    worksheet.getRow(rowIndex).values = [
      'Employee Name',
      'Students Added',
      'Total Amount (EGP)',
      'Contribution (%)',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.columnHeader));
    rowIndex++;

    for (const employeeId in employeeData) {
      const employee = employeeData[employeeId];
      const contributionPercentage = (
        (employee.totalAmount / totalAmount) *
        100
      ).toFixed(2);

      worksheet.getRow(rowIndex).values = [
        employee.employeeName,
        employee.count,
        employee.totalAmount,
        `${contributionPercentage}%`,
      ];
      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));
      rowIndex++;
    }

    rowIndex++; // Add space before teacher data

    // Populate Teacher Data
    for (const teacherId in teacherData) {
      const teacher = teacherData[teacherId];

      // Add teacher header
      worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = teacher.teacherName;
      worksheet.getCell(`A${rowIndex}`).style = styles.header;
      rowIndex++;

      // Column headers for student data
      worksheet.getRow(rowIndex).values = [
        'Student Name',
        'Phone Number',
        'Amount (EGP)',
        'Net Profit (EGP)',
        'Fees Applied (EGP)',
        'Added By',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = styles.columnHeader));
      rowIndex++;

      // Add student rows
      teacher.students.forEach((student) => {
        worksheet.getRow(rowIndex).values = [
          student.studentName,
          student.phoneNumber,
          student.amountPaid,
          student.netProfit,
          student.feesApplied,
          student.addedBy,
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.cell));
        rowIndex++;
      });

      // Add teacher totals and percentage
      const teacherNetProfit = teacher.totalAmount - teacher.totalFees;
      const teacherProfitPercentage = (
        (teacherNetProfit / (totalAmount - totalFees)) *
        100
      ).toFixed(2);

      worksheet.getRow(rowIndex).values = [
        `Total for ${teacher.teacherName}`,
        '',
        teacher.totalAmount,
        teacherNetProfit,
        teacher.totalFees,
        `${teacherProfitPercentage}%`,
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = styles.totalRow));
      rowIndex++;
    }

    // Add overall totals
    worksheet.mergeCells(`A${rowIndex+1}:B${rowIndex+1}`);
    worksheet.getCell(`A${rowIndex+1}`).value = 'Overall Total';
    worksheet.getCell(`A${rowIndex+1}`).style = styles.totalRow;
    worksheet.getCell(`C${rowIndex+1}`).value = totalAmount;
    worksheet.getCell(`C${rowIndex+1}`).style = styles.totalRow;
    worksheet.getCell(`D${rowIndex+1}`).value = totalAmount - totalFees;
    worksheet.getCell(`D${rowIndex+1}`).style = styles.totalRow;
    worksheet.getCell(`E${rowIndex+1}`).value = totalFees;
    worksheet.getCell(`E${rowIndex+1}`).style = styles.totalRow;

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount
      { width: 20 }, // Teacher Fees
      { width: 20 }, // Net Profit
      { width: 20 }, // Added By
    ];

    // Export Excel file
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
    res.status(500).json({ message: 'Error generating attendance Excel' });
  }
};

const downloadAndSendExcelForTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const attendance = await Attendance.findOne({ date: getDateTime() })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select:
            'teacherName subjectName teacherPhoneNumber teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName'); // Populate employee (addedBy)

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found' });
    }

    // Filter students associated with the given teacher
    const teacherRelatedStudents = attendance.studentsPresent.filter(
      (entry) =>
        entry.student.studentTeacher &&
        entry.student.studentTeacher._id.toString() === id
    );

    if (teacherRelatedStudents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No students found for the given teacher' });
    }

    const teacher = teacherRelatedStudents[0].student.studentTeacher;
    const teacherName = teacher.teacherName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const teacherPhoneNumber = teacher.teacherPhoneNumber;
    const isPerSession = teacher.paymentType === 'perSession';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define reusable styles
    const styles = {
      header: {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      columnHeader: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      totalRow: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      studentCountRow: {
        font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4CAF50' },
        }, // Green color for visibility
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
    };

    // Add report title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report for ${teacher.teacherName}`;
    worksheet.getCell('A1').style = styles.header;

    // Add column headers
    worksheet.getRow(2).values = [
      'Student Name',
      'Phone Number',
      'Amount Paid (EGP)',
      isPerSession ? 'Center Fees (EGP)' : 'Amount Remaining (EGP)',
      isPerSession ? 'Total Amount (EGP)' : '',
      'Added By',
    ];
    worksheet.getRow(2).eachCell((cell) => (cell.style = styles.columnHeader));

    let totalAmountPaid = 0;
    let totalRemaining = 0;
    let totalFees = 0;
    let totalProfit = 0;
    let rowIndex = 3;

    // Keep track of who added students
    const addedByMap = {};

    // Add student data rows for related students
    teacherRelatedStudents.forEach(
      ({ student, amountPaid, feesApplied, addedBy }) => {
        const studentName = student.studentName;
        const studentPhoneNumber = student.studentPhoneNumber;
        const teacherFees = student.studentTeacher.teacherFees;
        const addedByName = addedBy ? addedBy.employeeName : 'Unknown'; // Fallback to 'Unknown' if no addedBy info

        // Track who added this student
        if (!addedByMap[addedByName]) {
          addedByMap[addedByName] = { totalAdded: 0, studentCount: 0 };
        }
        addedByMap[addedByName].totalAdded += amountPaid;
        addedByMap[addedByName].studentCount++;

        worksheet.getRow(rowIndex).values = [
          studentName,
          studentPhoneNumber,
          amountPaid,
          isPerSession ? feesApplied : amountPaid - feesApplied, // Center Fees or Remaining Amount
          isPerSession ? amountPaid - feesApplied : '', // Teacher Fees (for perSession)
          addedByName, // Added By
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.cell));

        totalAmountPaid += amountPaid;
        totalRemaining += amountPaid - feesApplied || 0;
        totalFees += feesApplied || 0;
        totalProfit += amountPaid - feesApplied || 0;
        rowIndex++;
      }
    );

    // Add totals row
    worksheet.getRow(rowIndex).values = [
      'Total',
      '',
      totalAmountPaid,
      isPerSession ? totalFees : totalRemaining,
      isPerSession ? totalProfit : '',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.totalRow));

    // Add total student count for the teacher-related students
    rowIndex++; // Move to the next row after the totals
    worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`); // Merge all cells for the student count row
    worksheet.getCell(
      `A${rowIndex}`
    ).value = `Total Students for ${teacher.teacherName}: ${teacherRelatedStudents.length}`;
    worksheet.getCell(`A${rowIndex}`).style = styles.studentCountRow;

    // Adjust column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount Paid
      { width: 20 }, // Center Fees / Amount Remaining
      { width: 20 }, // Teacher Fees / Net Profit
      { width: 20 }, // Added By
    ];

    // Export the Excel file to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64');

    // File name for download and WhatsApp
    const fileName = `Attendance_Report_${teacherName}_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;

    // Send file via WhatsApp API
    await waapi
      .postInstancesIdClientActionSendMedia(
        {
          mediaBase64: base64Excel,
          chatId: `2${teacherPhoneNumber}@c.us`,
          mediaName: fileName,
          mediaCaption: `Attendance Report for ${teacherName} - ${new Date().toDateString()}`,
        },
        { id: '34241402' }
      )
      .then((response) => {
        console.log('WhatsApp response:', response.data);
      })
      .catch((error) => {
        console.error('Error sending Excel file via WhatsApp:', error);
      });

    console.log('Excel file sent via WhatsApp');

    // Send the file as an attachment
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating and sending attendance report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing the request' });
    }
  }
};

const downloadAndSendExcelForEmployee = async (req, res) => {
  const { id } = req.params;
  
  try {
    const attendance = await Attendance.findOne({ date: getDateTime() })
      .populate({ path: 'studentsPresent.student', populate: { path: 'studentTeacher', select: 'teacherName subjectName teacherPhoneNumber teacherFees paymentType ' } })
      .populate('studentsPresent.addedBy', 'employeeName employeePhoneNumber');

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found' });
    }

    // Filter students added by the given employee

    const employeeRelatedStudents = attendance.studentsPresent.filter(
      (entry) => entry.addedBy._id.toString() === id
    );

    if (employeeRelatedStudents.length === 0) {
      return res.status(404).json({ message: 'No students found for the given employee' });
    }

    const employee = employeeRelatedStudents[0].addedBy;
    const employeeName = employee.employeeName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const employeePhoneNumber = employee.employeePhoneNumber;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define reusable styles
    const styles = {
      header: {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
      },

      columnHeader: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } },
      },

      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      },

      totalRow: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5733' } },
      },

      studentCountRow: {
        font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4CAF50' } }, // Green color for visibility
      },
    };


    // Add report title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = `Attendance Report for ${employee.employeeName}`;
    worksheet.getCell('A1').style = styles.header;

    // Add column headers

    worksheet.getRow(2).values = ['Student Name', 'Phone Number', 'Amount Paid (EGP)', 'Fees Applied (EGP)', 'Added By'];

    worksheet.getRow(2).eachCell((cell) => (cell.style = styles.columnHeader));

    let totalAmountPaid = 0;
    let totalFees = 0;
    let rowIndex = 3;

    // Add student data rows for related students

    employeeRelatedStudents.forEach(({ student, amountPaid, feesApplied }) => {
      const studentName = student.studentName;
      const studentPhoneNumber = student.studentPhoneNumber;
      
      worksheet.getRow(rowIndex).values = [studentName, studentPhoneNumber, amountPaid, feesApplied, employee.employeeName];

      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));

      totalAmountPaid += amountPaid;

      totalFees += feesApplied;

      rowIndex++;

    });

    // Add totals row

    worksheet.getRow(rowIndex).values = ['Total', '', totalAmountPaid, totalFees, ''];

    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.totalRow));

    // Add total student count for the employee-related students

    rowIndex++; // Move to the next row after the totals

    worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`); // Merge all cells for the student count row

    worksheet.getCell(`A${rowIndex}`).value = `Total Students for ${employee.employeeName}: ${employeeRelatedStudents.length}`;

    worksheet.getCell(`A${rowIndex}`).style = styles.studentCountRow;

    // Adjust column widths

    worksheet.columns = [  
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount Paid
      { width: 20 }, // Fees Applied
      { width: 20 }, // Added By
    ];

    // Export the Excel file to buffer

    const buffer = await workbook.xlsx.writeBuffer();

    const base64Excel = buffer.toString('base64');

    // File name for download and WhatsApp

    const fileName = `Attendance_Report_${employeeName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Send file via WhatsApp API

    await waapi
      .postInstancesIdClientActionSendMedia(
        {
          mediaBase64: base64Excel,
          chatId: `2${employeePhoneNumber}@c.us`,
          mediaName: fileName,
          mediaCaption: `Attendance Report for ${employeeName} - ${new Date().toDateString()}`,
        },
        { id: '34241402' }
      )
      .then((response) => {
        console.log('WhatsApp response:', response.data);
      })

      .catch((error) => {
        console.error('Error sending Excel file via WhatsApp:', error);
      });

    console.log('Excel file sent via WhatsApp');

    // Send the file as an attachment

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);

    res.end();

  } catch (error) {
    console.error('Error generating and sending attendance report:', error);

    if (!res.headersSent) {

      res.status(500).json({ message: 'Error processing the request' });

    }

  }

};

const selectDevice = async (req, res) => {
  const {deviceId} = req.params;

  console.log('Device ID:', deviceId, req.employee._id);
  try{
    const employee = await Employee.findByIdAndUpdate(req.employee._id, {
    device :  deviceId
    }, {new: true});

    res.status(200).json({ message: 'Device selected successfully', employee });
  }catch (error) {
    console.error('Error selecting device:', error);
    res.status(500).json({ message: 'Error selecting device' });
  }
      
}

// ======================================== End Attendance ======================================== //



// ======================================== handel Attendace ======================================== //

const handelAttendance = async (req, res) => {
  res.render('employee/handelAttendance', {
    title: 'Handel Attendance',
    path: '/employee/handel-attendance',
  });
}

const getAttendanceByDate = async (req, res) => {
  const { startDate, endDate } = req.query; // Accept date range from query params
  console.log('Date range:', startDate, endDate);
  try {
    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'يرجى تقديم تاريخ بداية ونهاية صالحين.' });
    }

    // Fetch attendance records within the date range
    const attendances = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName');

      // console.log(attendances);

    if (!attendances.length) {
      return res.status(404).json({ message: 'لا يوجد حضور في النطاق الزمني المحدد.' });
    }

    let totalAmountFromAllStudents = 0;
    let totalFeesFromAllTeachers = 0;

    const teacherData = {};
    const employeeData = {};

    // Process each attendance record
    for (const attendance of attendances) {
      for (const {
        student,
        addedBy,
        amountPaid,
        feesApplied,
      } of attendance.studentsPresent) {
        if (!student || !student.studentTeacher) continue;

        const teacher = student.studentTeacher;
        const teacherId = teacher._id.toString();
        const employeeId = addedBy._id.toString();

        // Update teacher data
        if (!teacherData[teacherId]) {
          teacherData[teacherId] = {
            teacherId: teacher._id,
            teacherName: teacher.teacherName,
            subjectName: teacher.subjectName,
            paymentType: teacher.paymentType,
            totalAmount: 0,
            totalFees: 0,
            netProfit: 0,
            percentage: 0,
            totalStudents: 0,
          };
        }

        teacherData[teacherId].totalAmount += amountPaid;
        teacherData[teacherId].totalFees += feesApplied;
        teacherData[teacherId].totalStudents += 1;

        totalAmountFromAllStudents += amountPaid;
        totalFeesFromAllTeachers += feesApplied;

        // Update employee data
        if (!employeeData[employeeId]) {
          employeeData[employeeId] = {
            employeeId: employeeId,
            employeeName: addedBy.employeeName,
            count: 0,
            totalAmount: 0,
            percentage: 0,
          };
        }

        employeeData[employeeId].count += 1;
        employeeData[employeeId].totalAmount += amountPaid;
      }
    }

    // Calculate net profits for teachers
    for (const teacherId in teacherData) {
      const teacher = teacherData[teacherId];
      teacher.netProfit = teacher.totalAmount - teacher.totalFees;
      teacher.percentage = ( (teacher.totalAmount / totalAmountFromAllStudents) * 100 ).toFixed(2);
    }

    // Calculate percentages for employees
    for (const employeeId in employeeData) {
      employeeData[employeeId].percentage = (
        (employeeData[employeeId].totalAmount / totalAmountFromAllStudents) *
        100
      ).toFixed(2);
    }
    console.log('Teacher data:', teacherData);
    console.log('Employee data:', employeeData);
    console.log('Total amount:', totalAmountFromAllStudents);
    console.log('Total fees:', totalFeesFromAllTeachers);
    console.log('Attendance records:', attendances);
    res.status(200).json({
      message: 'بيانات الحضور للنطاق الزمني',
      totalAmount: totalAmountFromAllStudents,
      totalFees: totalFeesFromAllTeachers,
      teachersSummary: Object.values(teacherData),
      employeesSummary: Object.values(employeeData),
      attendanceRecords: attendances, // Return the raw records if needed
    });
  } catch (error) {
    console.error('Error fetching attendance by date range:', error);
    res.status(500).json({ message: 'يبدو ان هناك مشكله ما حاول مره اخري' });
  }
};

const downloadAttendanceExcelByDate = async (req, res) => {
  const { startDate, endDate } = req.query; // Get start and end date from query parameters
  try {
    // Fetch attendance records within the date range
    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select: 'teacherName subjectName teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName');

    if (!attendances || attendances.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found for the given date range',
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Styles for the sheet
    const styles = {
      header: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      columnHeader: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      totalRow: {
        font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
      },
    };

    // Sheet title
    worksheet.mergeCells('A1:G1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report - ${startDate} to ${endDate}`;
    worksheet.getCell('A1').style = styles.header;

    let rowIndex = 0;

    // Data structures for employee and teacher summaries
    const employeeData = {};
    const teacherData = {};
    let totalAmount = 0;
    let totalFees = 0;

    // Iterate over each attendance record and organize by date
    for (const attendance of attendances) {

      rowIndex++;

      // Aggregate attendance data for this specific date
      for (const {
        student,
        addedBy,
        amountPaid,
        feesApplied,
      } of attendance.studentsPresent) {
        if (!student || !student.studentTeacher) continue;

        const teacher = student.studentTeacher;
        const teacherId = teacher._id.toString();
        const employeeId = addedBy._id.toString();

        // Aggregate teacher data
        if (!teacherData[teacherId]) {
          teacherData[teacherId] = {
            teacherName: teacher.teacherName,
            subjectName: teacher.subjectName,
            totalAmount: 0,
            totalFees: 0,
            netProfit: 0,
            students: [],
          };
        }

        teacherData[teacherId].totalAmount += amountPaid;
        teacherData[teacherId].totalFees += feesApplied;
        teacherData[teacherId].students.push({
          studentName: student.studentName,
          phoneNumber: student.studentPhoneNumber,
          amountPaid,
          feesApplied,
          netProfit: amountPaid - feesApplied,
          addedBy: addedBy.employeeName,
        });

        totalAmount += amountPaid;
        totalFees += feesApplied;

        // Aggregate employee data
        if (!employeeData[employeeId]) {
          employeeData[employeeId] = {
            employeeName: addedBy.employeeName,
            totalAmount: 0,
            count: 0,
          };
        }

        employeeData[employeeId].totalAmount += amountPaid;
        employeeData[employeeId].count++;
      }

      rowIndex++; // Add space before next date
    }

    // Employee Summary Section
    worksheet.getRow(rowIndex).values = ['Employee Summary'];
    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.header));
    rowIndex++;

    worksheet.getRow(rowIndex).values = [
      'Employee Name',
      'Students Added',
      'Total Amount (EGP)',
      'Contribution (%)',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.columnHeader));
    rowIndex++;

    // Employee data rows
    for (const employeeId in employeeData) {
      const employee = employeeData[employeeId];
      const contributionPercentage = (
        (employee.totalAmount / totalAmount) *
        100
      ).toFixed(2);

      worksheet.getRow(rowIndex).values = [
        employee.employeeName,
        employee.count,
        employee.totalAmount,
        `${contributionPercentage}%`,
      ];
      worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));
      rowIndex++;
    }

    rowIndex++; // Add space before teacher data

    // Teacher Data Section
    for (const teacherId in teacherData) {
      const teacher = teacherData[teacherId];

      // Add teacher header
      worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
      worksheet.getCell(`A${rowIndex}`).value = teacher.teacherName;
      worksheet.getCell(`A${rowIndex}`).style = styles.header;
      rowIndex++;

      // Column headers for student data
      worksheet.getRow(rowIndex).values = [
        'Student Name',
        'Phone Number',
        'Amount (EGP)',
        'Net Profit (EGP)',
        'Fees Applied (EGP)',
        'Added By',
        'Contribution (%)',
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = styles.columnHeader));
      rowIndex++;

      // Add student rows
      teacher.students.forEach((student) => {
        worksheet.getRow(rowIndex).values = [
          student.studentName,
          student.phoneNumber,
          student.amountPaid,
          student.netProfit,
          student.feesApplied,
          student.addedBy,
          '', // Contribution will be calculated for the teacher's total row
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.cell));
        rowIndex++;
      });

      // Add teacher totals and percentages
      const teacherNetProfit = teacher.totalAmount - teacher.totalFees;

      // Contribution based on total amount (net profit)
      const teacherProfitContribution = (
        (teacherNetProfit / (totalAmount - totalFees)) *
        100
      ).toFixed(2);

      // Contribution based on total fees
      const teacherFeesContribution = (
        (teacher.totalFees / totalFees) *
        100
      ).toFixed(2);

      worksheet.getRow(rowIndex).values = [
        `Total for ${teacher.teacherName}`,
        '',
        teacher.totalAmount,
        teacherNetProfit,
        teacher.totalFees,
        '',
        `${teacherProfitContribution}% (Profit), ${teacherFeesContribution}% (Fees)`, // Display both contributions
      ];
      worksheet
        .getRow(rowIndex)
        .eachCell((cell) => (cell.style = styles.totalRow));
      rowIndex++;
    }

    // Add overall totals for the entire report
    worksheet.mergeCells(`A${rowIndex + 1}:B${rowIndex + 1}`);
    worksheet.getCell(`A${rowIndex + 1}`).value = 'Overall Total';
    worksheet.getCell(`A${rowIndex + 1}`).style = styles.totalRow;
    worksheet.getCell(`C${rowIndex + 1}`).value = totalAmount;
    worksheet.getCell(`C${rowIndex + 1}`).style = styles.totalRow;
    worksheet.getCell(`D${rowIndex + 1}`).value = totalAmount - totalFees;
    worksheet.getCell(`D${rowIndex + 1}`).style = styles.totalRow;
    worksheet.getCell(`E${rowIndex + 1}`).value = totalFees;
    worksheet.getCell(`E${rowIndex + 1}`).style = styles.totalRow;

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount
      { width: 20 }, // Net Profit
      { width: 20 }, // Fees Applied
      { width: 20 }, // Added By
      { width: 30 }, // Contribution (%)
    ];

    // Export Excel file
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
    res.status(500).json({ message: 'Error generating attendance Excel' });
  }
};

const downloadAndSendExcelForTeacherByDate = async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Fetch attendance records within the date range
    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'studentsPresent.student',
        populate: {
          path: 'studentTeacher',
          select:
            'teacherName subjectName teacherPhoneNumber teacherFees paymentType',
        },
      })
      .populate('studentsPresent.addedBy', 'employeeName');

    if (!attendances || attendances.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found for the given date range',
      });
    }

    // Filter students associated with the given teacher across all dates
    const teacherRelatedStudents = attendances.flatMap((attendance) =>
      attendance.studentsPresent.filter(
        (entry) =>
          entry.student.studentTeacher &&
          entry.student.studentTeacher._id.toString() === id
      )
    );

    if (teacherRelatedStudents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No students found for the given teacher' });
    }

    const teacher = teacherRelatedStudents[0].student.studentTeacher;
    const teacherName = teacher.teacherName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const teacherPhoneNumber = teacher.teacherPhoneNumber;
    const isPerSession = teacher.paymentType === 'perSession';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define reusable styles
    const styles = {
      header: {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        },
      },
      dateHeader: {
        font: { bold: true, size: 14, color: { argb: '000000' } }, // Black text for date header
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D3D3D3' }, // Light gray background for date header
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      columnHeader: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '2E75B6' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      totalRow: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF5733' },
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
      studentCountRow: {
        font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4CAF50' },
        }, // Green color for visibility
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      },
    };

    // Add report title
    worksheet.mergeCells('A1:F1');
    worksheet.getCell(
      'A1'
    ).value = `Attendance Report for ${teacher.teacherName} (${startDate} to ${endDate})`;
    worksheet.getCell('A1').style = styles.header;

    let rowIndex = 2;

    // Keep track of the last date to avoid duplicate date headers
    let lastDate = null;

    // Iterate over each attendance record and organize by date
    for (const attendance of attendances) {
      const currentDate = attendance.date;

      // Add a date header row if the date changes
      if (currentDate !== lastDate) {
        worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
        worksheet.getCell(`A${rowIndex}`).value = `Date: ${currentDate}`;
        worksheet.getCell(`A${rowIndex}`).style = styles.dateHeader;
        rowIndex++;

        // Add column headers for the new date
        worksheet.getRow(rowIndex).values = [
          'Student Name',
          'Phone Number',
          'Amount Paid (EGP)',
          isPerSession ? 'Center Fees (EGP)' : 'Amount Remaining (EGP)',
          isPerSession ? 'Total Amount (EGP)' : '',
          'Added By',
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.columnHeader));
        rowIndex++;

        lastDate = currentDate;
      }

      // Add student data rows for related students
      const studentsForDate = attendance.studentsPresent.filter(
        (entry) =>
          entry.student.studentTeacher &&
          entry.student.studentTeacher._id.toString() === id
      );

      for (const {
        student,
        amountPaid,
        feesApplied,
        addedBy,
      } of studentsForDate) {
        const studentName = student.studentName;
        const studentPhoneNumber = student.studentPhoneNumber;
        const teacherFees = student.studentTeacher.teacherFees;
        const addedByName = addedBy ? addedBy.employeeName : 'Unknown'; // Fallback to 'Unknown' if no addedBy info

        worksheet.getRow(rowIndex).values = [
          studentName,
          studentPhoneNumber,
          amountPaid,
          isPerSession ? feesApplied : amountPaid - feesApplied, // Center Fees or Remaining Amount
          isPerSession ? amountPaid - feesApplied : '', // Teacher Fees (for perSession)
          addedByName, // Added By
        ];
        worksheet
          .getRow(rowIndex)
          .eachCell((cell) => (cell.style = styles.cell));
        rowIndex++;
      }
    }

    // Add totals row
    const totalAmountPaid = teacherRelatedStudents.reduce(
      (sum, entry) => sum + entry.amountPaid,
      0
    );
    const totalFees = teacherRelatedStudents.reduce(
      (sum, entry) => sum + (entry.feesApplied || 0),
      0
    );
    const totalProfit = teacherRelatedStudents.reduce(
      (sum, entry) => sum + (entry.amountPaid - (entry.feesApplied || 0)),
      0
    );

    worksheet.getRow(rowIndex).values = [
      'Total',
      '',
      totalAmountPaid,
      isPerSession ? totalFees : totalAmountPaid - totalFees,
      isPerSession ? totalProfit : '',
    ];
    worksheet
      .getRow(rowIndex)
      .eachCell((cell) => (cell.style = styles.totalRow));

    // Add total student count for the teacher-related students
    rowIndex++; // Move to the next row after the totals
    worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`); // Merge all cells for the student count row
    worksheet.getCell(
      `A${rowIndex}`
    ).value = `Total Students for ${teacher.teacherName}: ${teacherRelatedStudents.length}`;
    worksheet.getCell(`A${rowIndex}`).style = styles.studentCountRow;

    // Adjust column widths
    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount Paid
      { width: 20 }, // Center Fees / Amount Remaining
      { width: 20 }, // Teacher Fees / Net Profit
      { width: 20 }, // Added By
    ];

    // Export the Excel file to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64');

    // File name for download and WhatsApp
    const fileName = `Attendance_Report_${teacherName}_${startDate}_to_${endDate}.xlsx`;

    // Send file via WhatsApp API
    await waapi
      .postInstancesIdClientActionSendMedia(
        {
          mediaBase64: base64Excel,
          chatId: `2${teacherPhoneNumber}@c.us`,
          mediaName: fileName,
          mediaCaption: `Attendance Report for ${teacherName} (${startDate} to ${endDate})`,
        },
        { id: '34241402' } // Replace with actual instance ID if required
      )
      .then((response) => {
        console.log('WhatsApp response:', response.data);
      })
      .catch((error) => {
        console.error('Error sending Excel file via WhatsApp:', error);
      });

    console.log('Excel file sent via WhatsApp');

    // Send the file as an attachment
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating and sending attendance report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing the request' });
    }
  }
};

const downloadAndSendExcelForEmployeeByDate = async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Fetch attendance records within the date range
    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({ path: 'studentsPresent.student', populate: { path: 'studentTeacher', select: 'teacherName subjectName teacherPhoneNumber teacherFees paymentType ' } })
      .populate('studentsPresent.addedBy', 'employeeName employeePhoneNumber');

    if (!attendances || attendances.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found for the given date range',
      });
    }

    // Filter students added by the given employee

    const employeeRelatedStudents = attendances.flatMap((attendance) => attendance.studentsPresent.filter((entry) => entry.addedBy._id.toString() === id));

    if (employeeRelatedStudents.length === 0) {
      return res.status(404).json({ message: 'No students found for the given employee' });
    }

    const employee = employeeRelatedStudents[0].addedBy;
    const employeeName = employee.employeeName.replace(/\s+/g, '_'); // Replace spaces with underscores
    const employeePhoneNumber = employee.employeePhoneNumber;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define reusable styles

    const styles = {
      header: {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
      },

      columnHeader: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } },
      },

      cell: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      },

      totalRow: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5733' } },
      },

      studentCountRow: {
        font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4CAF50' } }, // Green color for visibility
      },
    };


    // Add report title

    worksheet.mergeCells('A1:F1');

    worksheet.getCell('A1').value = `Attendance Report for ${employee.employeeName} (${startDate} to ${endDate})`;

    worksheet.getCell('A1').style = styles.header;

    // Add column headers

    worksheet.getRow(2).values = ['Student Name', 'Phone Number', 'Amount Paid (EGP)', 'Fees Applied (EGP)', 'Added By'];

    worksheet.getRow(2).eachCell((cell) => (cell.style = styles.columnHeader));

    let totalAmountPaid = 0;
    let totalFees = 0;
    let rowIndex = 3;
      
    // Add student data rows for related students

    employeeRelatedStudents.forEach(({ student, amountPaid, feesApplied }) => {

    const studentName = student.studentName;
    const studentPhoneNumber = student.studentPhoneNumber;

    worksheet.getRow(rowIndex).values = [studentName, studentPhoneNumber, amountPaid, feesApplied, employee.employeeName];
      
    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.cell));

    totalAmountPaid += amountPaid;
    totalFees += feesApplied;

    rowIndex++;

    });

    // Add totals row

    worksheet.getRow(rowIndex).values = ['Total', '', totalAmountPaid, totalFees, ''];

    worksheet.getRow(rowIndex).eachCell((cell) => (cell.style = styles.totalRow));

    // Add total student count for the employee-related students

    rowIndex++; // Move to the next row after the totals

    worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`); // Merge all cells for the student count row

    worksheet.getCell(`A${rowIndex}`).value = `Total Students for ${employee.employeeName}: ${employeeRelatedStudents.length}`;

    worksheet.getCell(`A${rowIndex}`).style = styles.studentCountRow;

    // Adjust column widths

    worksheet.columns = [
      { width: 30 }, // Student Name
      { width: 20 }, // Phone Number
      { width: 20 }, // Amount Paid
      { width: 20 }, // Fees Applied
      { width: 20 }, // Added By
    ];

    // Export the Excel file to buffer

    const buffer = await workbook.xlsx.writeBuffer();

    const base64Excel = buffer.toString('base64');

    // File name for download and WhatsApp

    const fileName = `Attendance_Report_${employeeName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Send file via WhatsApp API

    await waapi
    .postInstancesIdClientActionSendMedia(
          {
            mediaBase64: base64Excel,
            chatId: `2${employeePhoneNumber}@c.us`,
            mediaName: fileName,
            mediaCaption: `Attendance Report for ${employeeName} (${startDate} to ${endDate})`,
          },
          { id: '34241402' } // Replace with actual instance ID if required
        )
        .then((response) => {
          console.log('WhatsApp response:', response.data);
        })
        .catch((error) => {
          console.error('Error sending Excel file via WhatsApp:', error);
        });

    console.log('Excel file sent via WhatsApp');

    // Send the file as an attachment

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
        
    res.end();
        
  } catch (error) {

    console.error('Error generating and sending attendance report:', error);

    if (!res.headersSent) {
      
      res.status(500).json({ message: 'Error processing the request' });

    }

  }

};

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
    sendWa,

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
    editStudentAmountRemaining,
    downloadAttendanceExcel,
    downloadAndSendExcelForTeacher,
    downloadAndSendExcelForEmployee,
    selectDevice,

    // handel Attendance
    handelAttendance,
    getAttendanceByDate,
    downloadAttendanceExcelByDate,
    downloadAndSendExcelForTeacherByDate,
    downloadAndSendExcelForEmployeeByDate,

    logOut,
}
