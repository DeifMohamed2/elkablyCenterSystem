
const express = require('express');
const Employee = require('../models/employee');
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const employeeController = require('../controllers/employeeController.js'); 


const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;
    // console.log(token);
    if (!token) {
      res.status(401).redirect('/');
    }
  
    try {
      const decode = jwt.verify(token, jwtSecret);
      req.employeeId = decode.employeeId;
      // console.log(decode.adminId);
      await Employee.findOne({ _id: decode.employeeId })
  
      .then((result) => {
          req.employee = result;
        if (result.role === 'Employee') {
          next();
        } else {
          res.clearCookie('token');
          res.status(301).redirect('/');
        }
      });
    } catch (error) {
      res.status(401).redirect('/');
    }
}


router.get('/dashboard', authMiddleware, employeeController.dashboard);

router.get('/teacher-sechdule', authMiddleware, employeeController.teacherSechdule);

// Billing Route

router.get('/billing', authMiddleware, employeeController.billing_Get);

router.post('/add-bill', authMiddleware, employeeController.addBill);

router.get('/all-bills', authMiddleware, employeeController.getAllBills);


// ADD Student

router.get('/add-student', authMiddleware, employeeController.getAddStudent);

router.get('/all-students', authMiddleware, employeeController.getAllStudents);

router.get('/get-student/:id', authMiddleware, employeeController.getStudent);

router.put('/update-student/:id', authMiddleware, employeeController.updateStudent);

router.post('/add-student', authMiddleware, employeeController.addStudent);

router.get('/search-student', authMiddleware, employeeController.searchStudent);

router.get('/send-wa', authMiddleware, employeeController.sendWa);

router.delete('/delete-student/:id', authMiddleware, employeeController.deleteStudent);

// Teahcer 
router.get('/teacher', authMiddleware, employeeController.teacher_Get);

router.post('/add-teacher', authMiddleware, employeeController.addTeacher);

router.get('/all-teachers', authMiddleware, employeeController.getTeachers);

router.get('/get-teacher/:id', authMiddleware, employeeController.getTeacher);

router.put('/update-teacher/:id', authMiddleware, employeeController.updateTeacher);



// Attendance

router.get('/attendance', authMiddleware, employeeController.getAttendance);

router.post('/attend-student', authMiddleware, employeeController.attendStudent);

router.get('/getDeviceData', authMiddleware, employeeController.getDeviceData);

router.get('/get-attended-students', authMiddleware, employeeController.getAttendedStudents);

router.delete('/delete-attend-student/:id', authMiddleware, employeeController.deleteAttendStudent);

router.get('/download-attendance-excel', authMiddleware, employeeController.downloadAttendanceExcel);

router.put('/edit-student-amount-remaining/:id', authMiddleware, employeeController.editStudentAmountRemaining);

router.put('/select-device/:deviceId', authMiddleware, employeeController.selectDevice);

router.post('/add-teacher-invoice', authMiddleware, employeeController.addTeacherInvoice);

// handel Attendance

router.get('/handel-attendance', authMiddleware, employeeController.handelAttendance);

router.get('/attendance-by-date', authMiddleware, employeeController.getAttendanceByDate);

router.get('/download-attendance-excel-by-date-range' , authMiddleware, employeeController.downloadAttendanceExcelByDate);

router.get('/download-sendExcelTeachrByDate/:teacherId', authMiddleware, employeeController.downloadAndSendExcelForTeacherByDate);

router.get('/download-sendExcelEmployeeByDate/:id', authMiddleware, employeeController.downloadAndSendExcelForEmployeeByDate);

// LogOut

router.get('/logout', authMiddleware, employeeController.logOut);


module.exports = router;