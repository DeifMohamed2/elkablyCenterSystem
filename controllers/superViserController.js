const Employee = require('../models/employee');
const Billing = require('../models/billing');
const adminController = require('./adminController');

const employee_Get = (req, res) => {
  res.render('SuperViser/employee', {
    title: 'Employees',
    path: '/superviser/employee',
  });
};

const billing_Get = async (req, res) => {
  const employees = await Employee.find({}, { employeeName: 1 });
  res.render('SuperViser/billing', {
    title: 'Billing Review',
    path: '/superviser/billing',
    employees,
  });
};

// Employee management (reuse admin controller handlers)
const addEmployee = (req, res) => adminController.addEmployee(req, res);
const getEmployees = (req, res) => adminController.getEmployees(req, res);
const getEmployee = (req, res) => adminController.getEmployee(req, res);
const updateEmployee = (req, res) => adminController.updateEmployee(req, res);
const updateSalary = (req, res) => adminController.updateSalary(req, res);
const deleteEmployee = (req, res) => adminController.deleteEmployee(req, res);

// Billing review only (no create/edit) - reuse read-only handlers
const allBills = (req, res) => adminController.allBills(req, res);
const downloadBillExcel = (req, res) => adminController.downloadBillExcel(req, res);

const logOut = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = {
  employee_Get,
  billing_Get,
  addEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  updateSalary,
  deleteEmployee,
  allBills,
  downloadBillExcel,
  logOut,
};


