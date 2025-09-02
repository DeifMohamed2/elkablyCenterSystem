const express = require('express');
const Admin = require('../models/admin');
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const adminController = require('../controllers/adminController.js');
const employeeController = require('../controllers/employeeController.js'); 


const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  console.log(token);
  if (!token) {
    res.status(401).redirect('/');
  }

  try {
    const decode = jwt.verify(token, jwtSecret);
    req.adminId = decode.adminId;
    // console.log(decode.adminId);
    await Admin.findOne({ _id: decode.adminId })

    .then((result) => {
          // console.log(result);
          req.admin = result;
      if (result.role === 'Admin') {
        next();
      } else {
        res.clearCookie('token');
        res.status(301).redirect('/');
      }
    });
  } catch (error) {
    res.status(401).redirect('/');
  }
};

router.get('/dashboard', authMiddleware, adminController.dashboard);
router.get('/dashboard-data', authMiddleware, adminController.getDashboardData);

router.get('/employee', authMiddleware, adminController.Employee_Get);

router.post('/add-employee', authMiddleware, adminController.addEmployee);

router.get('/all-employee', authMiddleware, adminController.getEmployees);

router.put('/update-salary/:id', authMiddleware, adminController.updateSalary);

router.get('/get-employee/:id', authMiddleware, adminController.getEmployee);

router.put('/get-employee/:id', authMiddleware, adminController.updateEmployee);

router.get('/employee-log/:id', authMiddleware, adminController.getEmployeeLog);

// Render employee log page
router.get('/employee-log', authMiddleware, (req, res) => {
  res.render('Admin/employeeLog', {
    title: 'Employee Log',
    path: '/admin/employee-log'
  });
});




// billing Route

router.get('/billing', authMiddleware, adminController.billing_Get);

router.get('/all-bills', authMiddleware, adminController.allBills);

router.get('/download-excel' , authMiddleware, adminController.downloadBillExcel);

// KPIs Route

router.get('/kpi', authMiddleware, adminController.kpi_Get);

router.post('/add-kpi', authMiddleware, adminController.addKpi);

router.get('/all-kpis', authMiddleware, adminController.getKPIs);

// router.get('/kpi-data', authMiddleware, adminController.kpiData);

// Billing Route

router.get('/Admin-billing', authMiddleware, adminController.admin_billing_Get);

router.post('/Admin-add-bill', authMiddleware, adminController.Admin_addBill);

router.get('/Admin-get-all-bills', authMiddleware, adminController.Admin_getAllBills);



// LogOut

router.get('/logout', authMiddleware, adminController.logOut);

// Center Fees Collection routes
router.get('/center-fees', authMiddleware, adminController.centerFees_Get);
router.get('/center-fees-data', authMiddleware, adminController.getCenterFeesData);
router.post('/collect-center-fees', authMiddleware, adminController.collectCenterFees);

// Attendance Details routes
router.get('/attendance-details', authMiddleware, adminController.attendanceDetails_Get);
router.get('/attendance-details/:id', authMiddleware, adminController.getAttendanceDetails);
router.get('/download-attendance-excel/:id', authMiddleware, adminController.downloadAttendanceExcel);

// Teachers route for filter dropdown
router.get('/teachers', authMiddleware, adminController.getTeachers);

// Teacher Report routes
router.get('/teacher-report', authMiddleware, adminController.teacherReport_Get);
router.get('/teacher-report-data', authMiddleware, adminController.getTeacherReportData);
router.get('/download-teacher-excel', authMiddleware, adminController.downloadTeacherExcel);

module.exports = router;