const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SuperViser = require('../models/superViser');

const jwtSecret = process.env.JWT_SECRET;

const superViserController = require('../controllers/superViserController');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).redirect('/');
  }
  try {
    const decode = jwt.verify(token, jwtSecret);
    req.supervisorId = decode.supervisorId;
    const user = await SuperViser.findOne({ _id: decode.supervisorId });
    req.supervisor = user;
    if (user && user.role === 'Supervisor') return next();
    res.clearCookie('token');
    return res.status(301).redirect('/');
  } catch (error) {
    return res.status(401).redirect('/');
  }
};

router.get('/employee', authMiddleware, superViserController.employee_Get);
router.get('/billing', authMiddleware, superViserController.billing_Get);

// Employee CRUD
router.post('/add-employee', authMiddleware, superViserController.addEmployee);
router.get('/all-employee', authMiddleware, superViserController.getEmployees);
router.get('/get-employee/:id', authMiddleware, superViserController.getEmployee);
router.put('/get-employee/:id', authMiddleware, superViserController.updateEmployee);
router.put('/update-salary/:id', authMiddleware, superViserController.updateSalary);
router.delete('/delete-employee/:id', authMiddleware, superViserController.deleteEmployee);

// Billing read-only
router.get('/all-bills', authMiddleware, superViserController.allBills);
router.get('/download-excel', authMiddleware, superViserController.downloadBillExcel);

// Logout
router.get('/logout', authMiddleware, superViserController.logOut);

module.exports = router;


