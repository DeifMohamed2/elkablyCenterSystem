const Employee = require('../models/employee');
const Teacher = require('../models/teacher');
const Billing = require('../models/billing');
const KPI = require('../models/kpi');
const excelJS = require('exceljs');
const schedule = require('node-schedule');
const path = require('path');
const waapi = require('@api/waapi');
const waapiAPI = process.env.WAAPIAPI;
waapi.auth(waapiAPI);


const dashboard = (req, res) => {
  res.render('Admin/dashboard', {
    title: 'Dashboard',
    path: '/admin/dashboard',
  });
};

const Employee_Get = (req, res) => {
  res.render('Admin/employee', {
    title: 'Add Employee',
    path: '/admin/employee',
  });
};

const addEmployee = (req, res) => {
  const {
    employeeName,
    employeePhoneNumber,
    employeeSalary,
    employeePassword,
  } = req.body;
  const employee = new Employee({
    employeeName,
    employeePhoneNumber,
    employeeSalary,
    employeePassword,
    role: 'Employee',
  });

  if (employeeSalary < 0) {
    res.status(400).send({ message: 'لازم Salary يكون اكبر من 0' });
    return;
  }

  if (employeePassword.length < 6) {
    res.status(400).send({ message: 'الباسورد لازم يكون اكتر من 6 ارقام' });
    return;
  }

  if (employeePhoneNumber.length !== 11) {
    res.status(400).send({ message: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
    return;
  }

  employee
    .save()
    .then((result) => {
      res.status(201).send(result);
    })
    .catch((err) => {
      console.log(err);
      res
        .status(400)
        .send({ message: ' رقم الهاتف موجود مسبقا او يوجد مشكله فنيه اخري' });
    });
};

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees); // Ensure you're sending JSON
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
}

const updateSalary = async (req, res) => {
  const { id } = req.params;
  const { kpi, loss } = req.body;

  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });

    // Update employee's KPIs and Losses
    if (kpi < 0 || loss < 0) {
      return res.status(400).send({ error: 'KPIs and Losses must be positive' });
    }
 
    if( kpi>0){
     employee.KPIs.push({
      kpi,
      date: new Date(),
     });
    }
    if(loss>0){
     employee.Losses.push({
      loss,
      date: new Date(),
     });
    }
    // Update totals
    employee.totalKPIs += kpi;
    employee.totalLosses += loss;
    employee.totalSalary = 
      employee.employeeSalary + employee.totalKPIs - employee.totalLosses;

    await employee.save();
    res.status(200).send(employee);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error updating employee salary' });
  }
};

const getEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });
    console.log('Employee:', employee);
    res.status(200).send(employee);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error fetching employee' });
  }
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { employeeName, employeePhoneNumber, employeeSalary } = req.body;

  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });

    // Calculate the difference in salary
    const salaryDifference = employeeSalary - employee.employeeSalary;

    // Update employee details
    employee.employeeName = employeeName;
    employee.employeePhoneNumber = employeePhoneNumber;
    employee.employeeSalary = employeeSalary;

    // Update totalSalary by adding the difference
    employee.totalSalary = (employee.totalSalary || 0) + salaryDifference;

    await employee.save();
    res.status(200).send(employee);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error updating employee' });
  }
};

// router.put('/employee/:id/update-salary', authMiddleware, async (req, res) => {

// });


// ================================= Teacher ================================ //

const teacher_Get = (req, res) => {
  res.render('Admin/teacher', { title: 'Add Teacher', path: '/admin/teacher' });
};

const addTeacher = async (req, res) => {
  try {
    const {
      teacherName,
      teacherPhoneNumber,
      subjectName,
      schedule,
      teacherFees,
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

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
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
  const { teacherName, teacherPhoneNumber, subjectName, teacherFees } = req.body;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    teacher.teacherName = teacherName;
    teacher.teacherPhoneNumber = teacherPhoneNumber;
    teacher.subjectName = subjectName;
    teacher.teacherFees = teacherFees;

    await teacher.save();
    res.status(200).json(teacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};


// ================================= Billing ================================ //


const billing_Get = async (req, res) => {
  const employees =await Employee.find({},{employeeName:1});
  console.log(employees);
  res.render('Admin/billing', {
    title: 'Billing',
    path: '/admin/billing',
    employees: employees,
  });
}



const allBills = async (req, res) => {
  const { startDate, endDate, employee } = req.query;

  try {
    // Initialize the query object for filtering
    const query = {};

    if (startDate && !isNaN(new Date(startDate))) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(new Date(endDate))) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = endOfDay;
    }
    if (employee) {
      query.employee = employee;
    }

    // Common date calculations
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const weekEnd = new Date(todayEnd);

    const monthStart = new Date(todayStart);
    monthStart.setUTCDate(1);
    const monthEnd = new Date(todayEnd);

    // Fetch filtered results
    const filteredBills = await Billing.find(query).populate(
      'employee',
      'employeeName'
    ).sort({ createdAt: -1 });

    // Fetch grouped bills
    const billsToday = await Billing.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const billsThisWeek = await Billing.find({
      createdAt: { $gte: weekStart, $lte: weekEnd },
    });

    const billsThisMonth = await Billing.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    })

    const allBills = await Billing.find({}).populate('employee', 'employeeName').sort({ createdAt: -1 });

    // Compute totals
    const computeTotal = (bills) =>
      bills.reduce((sum, bill) => sum + bill.billAmount, 0);

    res.status(200).send({
      filtered: {
        count: filteredBills.length,
        total: computeTotal(filteredBills),
        bills: filteredBills,
      },
      today: {
        count: billsToday.length,
        total: computeTotal(billsToday),
        bills: billsToday,
      },
      week: {
        count: billsThisWeek.length,
        total: computeTotal(billsThisWeek),
        bills: billsThisWeek,
      },
      month: {
        count: billsThisMonth.length,
        total: computeTotal(billsThisMonth),
        bills: billsThisMonth,
      },
      all: {
        count: allBills.length,
        total: computeTotal(allBills),
        bills: allBills,
      },
    });
    
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).send({ error: 'An error occurred while fetching bills' });
  }
};


const downloadBillExcel = async (req, res) => {
  const { startDate, endDate, employee } = req.query;

  try {
    // Prepare the query for filtering
    const query = {};
    if (startDate)
      query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: endOfDay };
    }
    if (employee) query.employee = employee;

    // Fetch bills from the database
    const bills = await Billing.find(query).populate(
      'employee',
      'employeeName'
    ).sort({ createdAt: -1 });

    // Create a new workbook and worksheet
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bills');

    // Add headers with styling
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Product Name', key: 'billName', width: 30 },
      { header: 'Amount', key: 'billAmount', width: 15 },
      { header: 'Notes', key: 'billNote', width: 40 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add rows with alternating styles
    bills.forEach((bill, index) => {
      const row = worksheet.addRow({
        date: new Date(bill.createdAt).toLocaleString(),
        employeeName: bill.employee?.employeeName || 'N/A',
        billName: bill.billName,
        billAmount: bill.billAmount,
        billNote: bill.billNote,
      });

      // Apply alternating row background color
      const bgColor = index % 2 === 0 ? 'F3F6FB' : 'FFFFFF'; // Light grey for alternate rows
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Optional: Add a total row
    const totalAmount = bills.reduce((sum, bill) => sum + bill.billAmount, 0);
    const totalRow = worksheet.addRow({
      date: 'Total',
      billAmount: totalAmount,
    });
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber === 4) {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D9EAD3' }, // Light green
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF' },
        };
      }
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=bills.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.status(200);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Error generating Excel file');
  }
};


const sendDailyBillExcel = async () => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    const query = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    const bills = await Billing.find(query).populate(
      'employee',
      'employeeName'
    );

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bills');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Product Name', key: 'billName', width: 30 },
      { header: 'Amount', key: 'billAmount', width: 15 },
      { header: 'Notes', key: 'billNote', width: 40 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    bills.forEach((bill, index) => {
      const row = worksheet.addRow({
        date: new Date(bill.createdAt).toLocaleString(),
        employeeName: bill.employee?.employeeName || 'N/A',
        billName: bill.billName,
        billAmount: bill.billAmount,
        billNote: bill.billNote,
      });

      const bgColor = index % 2 === 0 ? 'F3F6FB' : 'FFFFFF';
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const totalAmount = bills.reduce((sum, bill) => sum + bill.billAmount, 0);
    const totalRow = worksheet.addRow({
      date: 'Total',
      billAmount: totalAmount,
    });
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber === 4) {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D9EAD3' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF' },
        };
      }
    });

    const fileName = `daily-bill-report-${
      new Date().toISOString().split('T')[0]
    }.xlsx`;
    const filePath = path.join(__dirname, fileName);
    await workbook.xlsx.writeFile(filePath);

    const fileUrl = `http://localhost:8400//download-bill-excel/${fileName}`;
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64');

    await waapi.postInstancesIdClientActionSendMedia(
      {
        mediaUrl: fileUrl,
        chatId: '2' + '01156012078' + '@c.us',
        mediaBase64: base64Excel,
        mediaName: fileName,
        mediaCaption: `Bill Report for ${new Date().toLocaleDateString()}`,
      },
      { id: '24954' }
    );

    console.log('Daily bill report sent successfully.');

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error sending daily bill report:', error);
  }
};

// schedule.scheduleJob('45 21 * * *', sendDailyBillExcel);


// ================================= END Billing ================================ //


// ================================= KPIs ================================ //

const kpi_Get = async (req, res) => {
  const employees = await Employee.find();
  res.render('Admin/KPIs', {
    title: 'KPIs',
    path: '/admin/kpi',
    employees,
  });
};


const addKpi = async(req,res) =>{
    const {employee,kpiName , kpiNote } = req.body;
    try{
    const kpi = new KPI({
        employee,
        kpiName,
        kpiNote,
    });

    await kpi.save();

    res.status(201).send({  message: 'KPI added successfully', kpi });
  }catch(error){
    console.error('Error adding KPI:', error);
    res.status(302).send({ message: 'Error adding KPI' });
  }


} 

const getKPIs = async (req, res) => {
  const { startDate, endDate, employee } = req.query;

  try {
    // Initialize the query object for filtering
    const query = {};

    if (startDate && !isNaN(new Date(startDate))) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(new Date(endDate))) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = endOfDay;
    }
    if (employee) {
      query.employee = employee;
    }

    // Fetch filtered results
    const filteredKPIs = await KPI.find(query).populate(
      'employee',
      'employeeName'
    ).sort({ createdAt: -1 });

    const allKPIs = await KPI.find({}).populate('employee', 'employeeName').sort({ createdAt: -1 });

    res.status(200).send({
      filtered: filteredKPIs,
      KPIs: allKPIs,
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).send({ error: 'An error occurred while fetching KPIs' });
  }

}


// ================================= END KPIs ================================ //

// ================================= Billing ================================ //

const admin_billing_Get = async (req, res) => {
     res.render('admin/adminBilling', {
       title: 'Billing',
       path: '/admin/Admin-billing',
     });
};


const Admin_addBill = (req, res) => {
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
      employee: '674f4a6658bf4795e24ab04a',
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


const Admin_getAllBills = async (req, res) => {
  try {
    const allBills = await Billing.find({ employee: '674f4a6658bf4795e24ab04a' }).sort({
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


// ================================= LogOut ================================ //






const logOut = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = {
  dashboard,
  Employee_Get,
  addEmployee,
  getEmployees,
  updateSalary,
  getEmployee,
  updateEmployee,

  teacher_Get,
  addTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,

  billing_Get,
  allBills,
  downloadBillExcel,

  kpi_Get,
  addKpi,
  getKPIs,

  admin_billing_Get,
  Admin_addBill,
  Admin_getAllBills,
  // logOut,
  logOut,
};
