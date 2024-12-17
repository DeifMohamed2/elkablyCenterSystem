const express = require('express');
const Admin = require('../models/admin');
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const adminController = require('../controllers/adminController.js');

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

router.get('/employee', authMiddleware, adminController.Employee_Get);

router.post('/add-employee', authMiddleware, adminController.addEmployee);

router.get('/all-employee', authMiddleware, adminController.getEmployees);

router.put('/update-salary/:id', authMiddleware, adminController.updateSalary);

router.get('/get-employee/:id', authMiddleware, adminController.getEmployee);

router.put('/get-employee/:id', authMiddleware, adminController.updateEmployee);




// billing Route

router.get('/billing', authMiddleware, adminController.billing_Get);

router.get('/all-bills', authMiddleware, adminController.allBills);

router.get('/download-excel' , authMiddleware, adminController.downloadBillExcel);

// KPIs Route

router.get('/kpi', authMiddleware, adminController.kpi_Get);

router.post('/add-kpi', authMiddleware, adminController.addKpi);

router.get('/all-kpis', authMiddleware, adminController.getKPIs);

// router.get('/kpi-data', authMiddleware, adminController.kpiData);



// LogOut

router.get('/logout', authMiddleware, adminController.logOut);

module.exports = router;