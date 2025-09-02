const Employee = require('../models/employee');
const Teacher = require('../models/teacher');
const Billing = require('../models/billing');
const KPI = require('../models/kpi');
const Attendance = require('../models/attendance');
const Student = require('../models/student');
const excelJS = require('exceljs');
const schedule = require('node-schedule');
const path = require('path');
const waapi = require('@api/waapi');
const waapiAPI = process.env.WAAPIAPI;
waapi.auth(waapiAPI);

// Helper function to get date range based on period
const getDateRange = (period, customStart = null, customEnd = null) => {
  const now = new Date();
  let startDate, endDate;

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else {
    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
};

const dashboard = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const { startDate: start, endDate: end } = getDateRange(period, startDate, endDate);

    // Get all analytics data
    const analytics = await getDashboardAnalytics(start, end);
    
    res.render('Admin/dashboard', {
      title: 'Dashboard',
      path: '/admin/dashboard',
      analytics,
      period,
      startDate: start,
      endDate: end
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
};

const getDashboardAnalytics = async (startDate, endDate) => {
  try {
    console.log('Dashboard Analytics - Date Range:', { startDate, endDate });
    
    // Use Promise.all to fetch data concurrently for better performance
    const [attendanceData, billingData] = await Promise.all([
      Attendance.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('teacher', 'teacherName teacherFees').lean(),
      
      Billing.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('employee', 'employeeName').lean()
    ]);

    console.log('Found billing records:', billingData.length);
    billingData.forEach(bill => {
      console.log('Bill:', bill.billName, bill.billAmount, bill.isExpense, bill.createdAt);
    });

    // Calculate center revenue from attendance fees (center fees only)
    let totalCenterRevenue = 0;
    let teacherRevenueBreakdown = {};
    let totalStudents = 0;
    let totalTeacherInvoices = 0;
    let totalCanteenIn = 0; // Add canteen income
    let totalExpenses = 0; // Initialize totalExpenses early

    attendanceData.forEach(attendance => {
      attendance.studentsPresent.forEach(student => {
        // Center revenue is only the fees applied (center's cut)
        totalCenterRevenue += student.feesApplied || 0;
        totalStudents++;
        
        const teacherId = attendance.teacher._id.toString();
        if (!teacherRevenueBreakdown[teacherId]) {
          teacherRevenueBreakdown[teacherId] = {
            teacherName: attendance.teacher.teacherName,
            totalFees: 0,
            studentCount: 0,
            totalAmount: 0,
            teacherInvoices: 0
          };
        }
        teacherRevenueBreakdown[teacherId].totalFees += student.feesApplied || 0;
        teacherRevenueBreakdown[teacherId].studentCount++;
        teacherRevenueBreakdown[teacherId].totalAmount += student.amountPaid || 0;
      });

      // Calculate teacher invoices (separate from center expenses)
      attendance.invoices.forEach(invoice => {
        totalTeacherInvoices += invoice.invoiceAmount;
        const teacherId = attendance.teacher._id.toString();
        if (teacherRevenueBreakdown[teacherId]) {
          teacherRevenueBreakdown[teacherId].teacherInvoices += invoice.invoiceAmount;
        }
      });
    });

    // Calculate canteen income from billing (canteen_in is income, not expense)
    billingData.forEach(bill => {
      if (bill.billCategory === 'canteen_in') {
        totalCanteenIn += bill.billAmount;
        totalCenterRevenue += bill.billAmount; // Add to center revenue
      }
    });

    // Get employee KPIs and add to expenses
    const employeeKPIs = await KPI.find().populate('employee', 'employeeName').lean();
    let totalEmployeeKPIs = 0;
    employeeKPIs.forEach(kpi => {
      totalEmployeeKPIs += kpi.kpi || 0;
    });
    totalExpenses += totalEmployeeKPIs; // Add KPIs to expenses

    // Get all employees with their data
    const employees = await Employee.find().lean();
    const employeePerformance = [];

    for (const employee of employees) {
      // Get employee's KPIs
      const employeeKPIList = employeeKPIs.filter(kpi => kpi.employee._id.toString() === employee._id.toString());
      const employeeTotalKPIs = employeeKPIList.reduce((sum, kpi) => sum + (kpi.kpi || 0), 0);

      // Get employee's salary history
      const employeeSalaries = billingData.filter(bill => 
        bill.salaryEmployee && bill.salaryEmployee.toString() === employee._id.toString()
      );
      const employeeTotalSalary = employeeSalaries.reduce((sum, bill) => sum + bill.billAmount, 0);

      // Get employee's attendance records
      const employeeAttendance = attendanceData.filter(attendance => 
        attendance.employee && attendance.employee.toString() === employee._id.toString()
      );
      const employeeTotalStudents = employeeAttendance.reduce((total, attendance) => {
        return total + (attendance.studentsPresent ? attendance.studentsPresent.length : 0);
      }, 0);

      const employeeTotalRevenue = employeeAttendance.reduce((total, attendance) => {
        return total + (attendance.studentsPresent ? attendance.studentsPresent.reduce((sum, student) => {
          return sum + (student.feesApplied || 0);
        }, 0) : 0);
      }, 0);

      employeePerformance.push({
        _id: employee._id,
        employeeName: employee.employeeName,
        employeePhoneNumber: employee.employeePhoneNumber,
        baseSalary: employee.employeeSalary,
        totalKPIs: employeeTotalKPIs,
        totalSalary: employeeTotalSalary,
        totalStudents: employeeTotalStudents,
        totalRevenue: employeeTotalRevenue,
        kpiCount: employeeKPIList.length
      });
    }

    // Calculate expenses by category more efficiently
    const expenseCategories = {
      salaries: 0,
      canteen_out: 0,
      government_fees: 0,
      electric_invoices: 0,
      equipments: 0,
      other: 0
    };

    // Store expense details for frontend display
    const expenseDetails = [];
    
    for (const bill of billingData) {
      // Only count expenses (exclude canteen_in from expenses)
      if (bill.billCategory !== 'canteen_in') {
        // Map old category names to new ones
        let category = bill.billCategory;
        if (!category) {
          // Handle undefined categories by mapping old category field
          if (bill.category === 'salaries_out') category = 'salaries';
          else if (bill.category === 'canteen_out') category = 'canteen_out';
          else if (bill.category === 'government_out') category = 'government_fees';
          else if (bill.category === 'electric_out') category = 'electric_invoices';
          else if (bill.category === 'equipments_out') category = 'equipments';
          else if (bill.category === 'other_out') category = 'other';
          else if (bill.category === 'income') continue; // Skip income
          else category = 'other'; // Default to other if unknown
        }
        
        if (category && category !== 'canteen_in') {
          expenseCategories[category] += bill.billAmount;
          totalExpenses += bill.billAmount;
          
          // Add to expense details for frontend
          expenseDetails.push({
            category: category,
            amount: bill.billAmount,
            date: bill.createdAt,
            billName: bill.billName
          });
          
          console.log('Expense:', category, bill.billAmount, bill.createdAt, 'Date:', new Date(bill.createdAt).toLocaleString());
        }
      }
    }

    // Calculate net profit
    const netProfit = totalCenterRevenue - totalExpenses;

    // Calculate total teacher fees for percentage calculation
    const totalTeacherFees = Object.values(teacherRevenueBreakdown).reduce((sum, teacher) => sum + teacher.totalFees, 0);

    // Calculate teacher performance percentages
    const teacherPerformance = Object.values(teacherRevenueBreakdown).map(teacher => ({
      ...teacher,
      percentage: totalTeacherFees > 0 ? (teacher.totalFees / totalTeacherFees * 100).toFixed(2) : 0,
      netRevenue: teacher.totalAmount - teacher.totalFees - teacher.teacherInvoices // Teacher's net profit: totalAmount - centerFees - teacherInvoices
    })).sort((a, b) => b.totalFees - a.totalFees);

    // Get monthly and weekly data concurrently
    const [monthlyData, weeklyData] = await Promise.all([
      getMonthlyData(),
      getWeeklyData(startDate, endDate)
    ]);

    return {
      totalCenterRevenue,
      totalExpenses,
      netProfit,
      totalStudents,
      totalTeacherInvoices,
      totalCanteenIn,
      totalEmployeeKPIs,
      expenseCategories,
      expenseDetails,
      teacherPerformance,
      employeePerformance,
      monthlyData,
      weeklyData,
      period: {
        startDate,
        endDate
      }
    };
  } catch (error) {
    console.error('Analytics error:', error);
    throw error;
  }
};

const getMonthlyData = async () => {
  const months = [];
  const now = new Date();
  
  // Create all month ranges first
  const monthRanges = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    monthRanges.push({
      monthStart,
      monthEnd,
      monthLabel: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    });
  }

  // Fetch all data in parallel for better performance
  const dataPromises = monthRanges.map(async ({ monthStart, monthEnd }) => {
    const [attendanceData, billingData] = await Promise.all([
      Attendance.find({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).select('studentsPresent.feesApplied').lean(),
      
      Billing.find({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).select('billAmount billCategory').lean()
    ]);

    let revenue = 0;
    let expenses = 0;

    // Calculate revenue
    for (const attendance of attendanceData) {
      for (const student of attendance.studentsPresent) {
        revenue += student.feesApplied || 0;
      }
    }

    // Calculate expenses (exclude canteen_in)
    for (const bill of billingData) {
      if (bill.billCategory !== 'canteen_in') {
        expenses += bill.billAmount;
      }
    }

    return { revenue, expenses, profit: revenue - expenses };
  });

  const results = await Promise.all(dataPromises);

  // Combine results with month labels
  monthRanges.forEach(({ monthLabel }, index) => {
    months.push({
      month: monthLabel,
      ...results[index]
    });
  });

  return months;
};

const getWeeklyData = async (startDate, endDate) => {
  const weeks = [];
  const currentDate = new Date(startDate);
  
  // Create all week ranges first
  const weekRanges = [];
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weekRanges.push({
      weekStart,
      weekEnd,
      weekLabel: `Week ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Fetch all data in parallel for better performance
  const dataPromises = weekRanges.map(async ({ weekStart, weekEnd }) => {
    const [attendanceData, billingData] = await Promise.all([
      Attendance.find({
        createdAt: { $gte: weekStart, $lte: weekEnd }
      }).select('studentsPresent.feesApplied').lean(),
      
      Billing.find({
        createdAt: { $gte: weekStart, $lte: weekEnd }
      }).select('billAmount billCategory').lean()
    ]);

    let revenue = 0;
    let expenses = 0;

    // Calculate revenue
    for (const attendance of attendanceData) {
      for (const student of attendance.studentsPresent) {
        revenue += student.feesApplied || 0;
      }
    }

    // Calculate expenses (exclude canteen_in)
    for (const bill of billingData) {
      if (bill.billCategory !== 'canteen_in') {
        expenses += bill.billAmount;
      }
    }

    return { revenue, expenses, profit: revenue - expenses };
  });

  const results = await Promise.all(dataPromises);

  // Combine results with week labels
  weekRanges.forEach(({ weekLabel }, index) => {
    weeks.push({
      week: weekLabel,
      ...results[index]
    });
  });

  return weeks;
};

// API endpoint for dashboard data
const getDashboardData = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const { startDate: start, endDate: end } = getDateRange(period, startDate, endDate);
    
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds timeout
    });
    
    const analyticsPromise = getDashboardAnalytics(start, end);
    
    const analytics = await Promise.race([analyticsPromise, timeoutPromise]);
    res.json(analytics);
  } catch (error) {
    console.error('Dashboard data error:', error);
    if (error.message === 'Request timeout') {
      res.status(408).json({ error: 'Request timeout - data loading took too long' });
    } else {
      res.status(500).json({ error: 'Error fetching dashboard data' });
    }
  }
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

const getEmployeeLog = async (req, res) => {
  const { id } = req.params;
  try {
    console.log('Fetching employee log for ID:', id);
    
    // Get employee details
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });
    console.log('Employee found:', employee.employeeName);
    console.log('Employee details:', {
      id: employee._id,
      name: employee.employeeName,
      phone: employee.employeePhoneNumber,
      salary: employee.employeeSalary,
      totalSalary: employee.totalSalary
    });

    // Get salary history (bills with salaryEmployee = this employee)
    const salaryHistory = await Billing.find({ 
      salaryEmployee: id,
      billCategory: 'salaries'
    }).sort({ createdAt: -1 });
    console.log('Salary history found:', salaryHistory.length, 'records');

    // Get KPI history
    const kpiHistory = await KPI.find({ employee: id }).sort({ createdAt: -1 });
    console.log('KPI history found:', kpiHistory.length, 'records');

    // Get attendance records where this employee was involved
    const attendanceHistory = await Attendance.find({ 
      $or: [
        { 'studentsPresent.addedBy': id },
        { 'studentsPresent.addedBy': id.toString() },
        { finalizedBy: id },
        { finalizedBy: id.toString() }
      ]
    }).populate('teacher', 'teacherName teacherFees').sort({ createdAt: -1 });
    console.log('Attendance history found:', attendanceHistory.length, 'records');

    // Debug: Let's also check all attendance records to see the structure
    const allAttendance = await Attendance.find({}).limit(5);
    console.log('Sample attendance records structure:', allAttendance.map(a => ({
      id: a._id,
      studentsPresent: a.studentsPresent ? a.studentsPresent.map(s => ({
        addedBy: s.addedBy,
        addedByType: typeof s.addedBy
      })) : [],
      finalizedBy: a.finalizedBy,
      finalizedByType: typeof a.finalizedBy,
      teacher: a.teacher,
      course: a.course
    })));

    // Debug: Check specific attendance records for this employee
    if (attendanceHistory.length > 0) {
      console.log('First attendance record details:', {
        id: attendanceHistory[0]._id,
        teacher: attendanceHistory[0].teacher,
        course: attendanceHistory[0].course,
        studentsPresent: attendanceHistory[0].studentsPresent ? attendanceHistory[0].studentsPresent.length : 0,
        totalAmount: attendanceHistory[0].totalAmount,
        totalFees: attendanceHistory[0].totalFees
      });
    }

    // Calculate totals
    const totalStudents = attendanceHistory.reduce((total, attendance) => {
      return total + (attendance.studentsPresent ? attendance.studentsPresent.length : 0);
    }, 0);

    const totalRevenue = attendanceHistory.reduce((total, attendance) => {
      return total + (attendance.studentsPresent ? attendance.studentsPresent.reduce((sum, student) => {
        return sum + (student.feesApplied || 0);
      }, 0) : 0);
    }, 0);

    // Calculate total salary from salary history
    const totalSalary = salaryHistory.reduce((sum, salary) => sum + salary.billAmount, 0);

    // Calculate total KPIs
    const totalKPIs = kpiHistory.reduce((sum, kpi) => sum + (kpi.kpi || 0), 0);

    // Calculate total losses (if any - for now set to 0 as there's no loss field in KPI model)
    const totalLosses = 0;

    console.log('Calculated totals:', {
      totalStudents,
      totalRevenue,
      totalSalary,
      totalKPIs,
      totalLosses
    });

    // Create enhanced employee object with calculated totals
    const enhancedEmployee = {
      ...employee.toObject(),
      totalSalary,
      totalKPIs,
      totalLosses
    };

    res.json({
      employee: enhancedEmployee,
      salaryHistory,
      kpiHistory,
      attendanceHistory,
      totalStudents,
      totalRevenue
    });
  } catch (error) {
    console.error('Error fetching employee log:', error);
    res.status(500).send({ error: 'Error fetching employee log' });
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

    // Helpers
    const mapCategory = (bill) => {
      if (bill.billCategory) return bill.billCategory;
      // legacy field mapping
      if (bill.category === 'salaries_out') return 'salaries';
      if (bill.category === 'canteen_out') return 'canteen_out';
      if (bill.category === 'government_out') return 'government_fees';
      if (bill.category === 'electric_out') return 'electric_invoices';
      if (bill.category === 'income') return 'canteen_in';
      return 'other';
    };

    const computeSummary = (bills) => {
      let income = 0;
      let expenses = 0;
      for (const bill of bills) {
        const category = mapCategory(bill);
        if (category === 'canteen_in') income += bill.billAmount;
        else expenses += bill.billAmount;
      }
      const total = bills.reduce((sum, bill) => sum + bill.billAmount, 0);
      return {
        count: bills.length,
        total,
        income,
        expenses,
        net: income - expenses,
        bills
      };
    };

    res.status(200).send({
      filtered: computeSummary(filteredBills),
      today: computeSummary(billsToday),
      week: computeSummary(billsThisWeek),
      month: computeSummary(billsThisMonth),
      all: computeSummary(allBills),
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
      { header: 'Category', key: 'billCategory', width: 20 },
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
      const categoryNames = {
        salaries: 'الرواتب',
        canteen_in: 'مقصف (داخل)',
        canteen_out: 'مقصف (خارج)',
        government_fees: 'رسوم حكومية',
        equipments: 'المعدات والأجهزة',
        electric_invoices: 'فواتير الكهرباء',
        other: 'أخرى'
      };

      const row = worksheet.addRow({
        date: new Date(bill.createdAt).toLocaleString(),
        employeeName: bill.employee?.employeeName || 'N/A',
        billName: bill.billName,
        billCategory: categoryNames[bill.billCategory] || 'غير محدد',
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
    const {employee, kpiName, kpiAmount, kpiNote } = req.body;
    try{
    const kpi = new KPI({
        employee,
        kpiName,
        kpi: parseFloat(kpiAmount) || 0,
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
    const { billName, billAmount, billNote, billPhoto, billCategory, employeeId } = req.body;

    console.log('Received bill data:', { billName, billAmount, billNote, billPhoto, billCategory, employeeId });

    if (billAmount < 0) {
        res.status(400).send({ message: 'لازم Amount يكون اكبر من 0' });
        return;
    }

    if (billName.length < 3) {
        res.status(400).send({ message: 'اسم الفاتوره لازم يكون اكتر من 3 احرف' });
        return
    }

    if (!billCategory) {
        console.log('billCategory is missing or empty:', billCategory);
        res.status(400).send({ message: 'يجب اختيار فئة الفاتورة' });
        return
    }

    // Validate employee selection for salary bills
    if (billCategory === 'salaries' && !employeeId) {
        res.status(400).send({ message: 'يجب اختيار الموظف للرواتب' });
        return
    }

    const bill = new Billing({
      billName,
      billAmount,
      billNote: billNote || '',
      billPhoto: billPhoto || '',
      billCategory,
      employee: '674f4a6658bf4795e24ab04a',
      salaryEmployee: billCategory === 'salaries' ? employeeId : undefined,
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

// ================================= Center Fees Collection ================================ //

const centerFees_Get = async (req, res) => {
  try {
    res.render('Admin/centerFees', {
      title: 'Center Fees Collection',
      path: '/admin/center-fees',
    });
  } catch (error) {
    console.error('Error loading center fees page:', error);
    res.status(500).send('Error loading center fees page');
  }
};

const getCenterFeesData = async (req, res) => {
  try {
    const { startDate, endDate, collected, teacher } = req.query;
    
    // Build query
    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (collected !== undefined) {
      query.centerFeesCollected = collected === 'true';
    }
   
   if (teacher) {
     query.teacher = teacher;
   }

    // Get attendance records with populated teacher and employee data
    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'teacherName')
      .populate('finalizedBy', 'employeeName')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('invoices.addedBy', 'employeeName')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate totals
    let totalSessions = 0;
    let totalCenterFees = 0;
    let totalCollected = 0;
    let totalPending = 0;

    const processedRecords = attendanceRecords.map(record => {
      const sessionCenterFees = record.studentsPresent.reduce((sum, student) => {
        return sum + (student.feesApplied || 0);
      }, 0);

      // Get employee name with better fallback logic
      // Collect all unique employees who participated
      const employeeIds = new Set();
      const employeeNames = [];
      
      // Add finalizedBy employee if exists
      if (record.finalizedBy?._id) {
        employeeIds.add(record.finalizedBy._id.toString());
        employeeNames.push(record.finalizedBy.employeeName);
      }
      
      // Add all employees who added students
      record.studentsPresent.forEach(student => {
        if (student.addedBy?._id) {
          const employeeId = student.addedBy._id.toString();
          if (!employeeIds.has(employeeId)) {
            employeeIds.add(employeeId);
            employeeNames.push(student.addedBy.employeeName);
          }
        }
      });
      
      // Add all employees who created invoices
      record.invoices.forEach(invoice => {
        if (invoice.addedBy?._id) {
          const employeeId = invoice.addedBy._id.toString();
          if (!employeeIds.has(employeeId)) {
            employeeIds.add(employeeId);
            employeeNames.push(invoice.addedBy.employeeName);
          }
        }
      });
      
      const employeeName = employeeNames.length > 0 ? employeeNames.join(', ') : 'Unknown';

      totalSessions++;
      totalCenterFees += sessionCenterFees;
      
      if (record.centerFeesCollected) {
        totalCollected += sessionCenterFees;
      } else {
        totalPending += sessionCenterFees;
      }

      return {
        _id: record._id,
        date: record.createdAt,
        teacherName: record.teacher?.teacherName || 'Unknown',
        employeeName: employeeName,
        employeeCount: employeeNames.length,
        studentCount: record.studentsPresent.length,
        centerFees: sessionCenterFees,
        totalAmount: record.totalAmount,
        centerFeesCollected: record.centerFeesCollected || false,
        studentsPresent: record.studentsPresent
      };
    });

    res.json({
      records: processedRecords,
      summary: {
        totalSessions,
        totalCenterFees,
        totalCollected,
        totalPending
      }
    });

  } catch (error) {
    console.error('Error fetching center fees data:', error);
    res.status(500).json({ error: 'Error fetching center fees data' });
  }
};

const collectCenterFees = async (req, res) => {
  try {
    const { attendanceIds } = req.body;
    
    if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ error: 'No attendance records selected' });
    }

    // Update all selected attendance records
    const result = await Attendance.updateMany(
      { _id: { $in: attendanceIds } },
      { $set: { centerFeesCollected: true, collectedAt: new Date() } }
    );

    res.json({
      success: true,
      message: `Successfully collected center fees for ${result.modifiedCount} sessions`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error collecting center fees:', error);
    res.status(500).json({ error: 'Error collecting center fees' });
  }
};

// ================================= END Center Fees Collection ================================ //

// ================================= Attendance Details ================================ //

const attendanceDetails_Get = async (req, res) => {
  try {
    res.render('Admin/attendanceDetails', {
      title: 'Attendance Details',
      path: '/admin/attendance-details',
    });
  } catch (error) {
    console.error('Error loading attendance details page:', error);
    res.status(500).send('Error loading attendance details page');
  }
};

const getAttendanceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id)
      .populate('teacher', 'teacherName')
      .populate('finalizedBy', 'employeeName')
      .populate('studentsPresent.student', 'studentName studentCode studentPhoneNumber studentParentPhone')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('invoices.addedBy', 'employeeName')
      .lean();
  
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
  
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance details:', error);
    res.status(500).json({ error: 'Error fetching attendance details' });
  }
};

const downloadAttendanceExcel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id)
      .populate('teacher', 'teacherName')
      .populate('finalizedBy', 'employeeName')
      .populate('studentsPresent.student', 'studentName studentCode studentPhoneNumber studentParentPhone')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('invoices.addedBy', 'employeeName')
      .lean();
  
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
  
    // Create workbook
    const workbook = new excelJS.Workbook();
    
    // Students worksheet
    const studentsWorksheet = workbook.addWorksheet('Students');
    studentsWorksheet.columns = [
      { header: '#', key: 'index', width: 5 },
      { header: 'Student Name', key: 'studentName', width: 20 },
      { header: 'Student Code', key: 'studentCode', width: 15 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Parent Phone', key: 'parentPhone', width: 15 },
      { header: 'Amount Paid', key: 'amountPaid', width: 15 },
      { header: 'Center Fees', key: 'centerFees', width: 15 },
      { header: 'Added By', key: 'addedBy', width: 20 }
    ];
  
    // Style header
    studentsWorksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' },
      };
    });
  
    // Add student data
    attendance.studentsPresent.forEach((student, index) => {
      studentsWorksheet.addRow({
        index: index + 1,
        studentName: student.student?.studentName || 'Unknown',
        studentCode: student.student?.studentCode || 'N/A',
        phoneNumber: student.student?.studentPhoneNumber || 'N/A',
        parentPhone: student.student?.studentParentPhone || 'N/A',
        amountPaid: student.amountPaid,
        centerFees: student.feesApplied || 0,
        addedBy: student.addedBy?.employeeName || 'Unknown'
      });
    });
  
    // Invoices worksheet
    const invoicesWorksheet = workbook.addWorksheet('Invoices');
    invoicesWorksheet.columns = [
      { header: 'Invoice Details', key: 'details', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'Added By', key: 'addedBy', width: 20 }
    ];
  
    // Style header
    invoicesWorksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' },
      };
    });
  
    // Add invoice data
    attendance.invoices.forEach((invoice) => {
      invoicesWorksheet.addRow({
        details: invoice.invoiceDetails,
        amount: invoice.invoiceAmount,
        time: invoice.time,
        addedBy: invoice.addedBy?.employeeName || 'Unknown'
      });
    });
  
    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=attendance-details-${attendance._id}.xlsx`);
  
    // Write to response
    await workbook.xlsx.write(res);
    res.status(200);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Error generating Excel file');
  }
};

// ================================= END Attendance Details ================================ //

// ================================= Teacher Report ================================ //

const teacherReport_Get = async (req, res) => {
  try {
    res.render('Admin/teacherReport', {
      title: 'Teacher Report',
      path: '/admin/teacher-report',
    });
  } catch (error) {
    console.error('Error loading teacher report page:', error);
    res.status(500).send('Error loading teacher report page');
  }
};

const getTeacherReportData = async (req, res) => {
  try {
    const { teacherId, startDate, endDate } = req.query;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }
    
    // Build query
    const query = { teacher: teacherId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
 
    // Get attendance records for the teacher
    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'teacherName teacherFees')
      .populate('finalizedBy', 'employeeName')
      .populate('studentsPresent.student', 'studentName studentCode studentPhoneNumber studentParentPhone')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('invoices.addedBy', 'employeeName')
      .sort({ createdAt: -1 })
      .lean();
 
    // Calculate comprehensive statistics
    let totalSessions = 0;
    let totalStudents = 0;
    let totalAmount = 0;
    let totalCenterFees = 0;
    let totalTeacherFees = 0;
    let totalInvoices = 0;
    let totalNetProfit = 0;
    let averageStudentsPerSession = 0;
    let averageAmountPerSession = 0;
    let averageCenterFeesPerSession = 0;
    let finalizedSessions = 0;
    let pendingSessions = 0;
    
    const sessionsData = [];
    const studentsData = [];
    const invoicesData = [];
 
    attendanceRecords.forEach(record => {
      totalSessions++;
      
      const sessionStudents = record.studentsPresent.length;
      const sessionAmount = record.totalAmount || 0;
      const sessionCenterFees = record.studentsPresent.reduce((sum, student) => {
        return sum + (student.feesApplied || 0);
      }, 0);
      // Calculate teacher fees based on teacher's fee rate and number of students
      const teacherFeeRate = record.teacher?.teacherFees || 0;
      const sessionTeacherFees = teacherFeeRate * sessionStudents;
      const sessionInvoices = record.invoices.reduce((sum, invoice) => {
        return sum + invoice.invoiceAmount;
      }, 0);
      // Calculate net profit: Total Amount - Center Fees - Teacher Fees - Invoices
      const sessionNetProfit = sessionAmount - sessionCenterFees - sessionTeacherFees - sessionInvoices;
      
      totalStudents += sessionStudents;
      totalAmount += sessionAmount;
      totalCenterFees += sessionCenterFees;
      totalTeacherFees += sessionTeacherFees;
      totalInvoices += sessionInvoices;
      totalNetProfit += sessionNetProfit;
      
      // Count finalized vs pending sessions
      if (record.isFinalized) {
        finalizedSessions++;
      } else {
        pendingSessions++;
      }
      
      // Collect session data
      sessionsData.push({
        _id: record._id,
        date: record.createdAt,
        course: record.course,
        students: sessionStudents,
        amount: sessionAmount,
        centerFees: sessionCenterFees,
        teacherFees: sessionTeacherFees,
        invoices: sessionInvoices,
        netProfit: sessionNetProfit,
        isFinalized: record.isFinalized,
        finalizedBy: record.finalizedBy?.employeeName || 'Unknown',
        // Add more detailed session info
        sessionDate: record.date,
        teacherFeeRate: teacherFeeRate,
        totalTeacherFees: sessionTeacherFees,
        // Calculate efficiency metrics
        efficiency: sessionStudents > 0 ? (sessionCenterFees / sessionStudents).toFixed(2) : 0,
        profitMargin: sessionAmount > 0 ? ((sessionNetProfit / sessionAmount) * 100).toFixed(2) : 0
      });
      
      // Collect students data
      record.studentsPresent.forEach(student => {
        studentsData.push({
          sessionId: record._id,
          sessionDate: record.createdAt,
          studentName: student.student?.studentName || 'Unknown',
          studentCode: student.student?.studentCode || 'N/A',
          studentPhone: student.student?.studentPhoneNumber || 'N/A',
          parentPhone: student.student?.studentParentPhone || 'N/A',
          amountPaid: student.amountPaid,
          centerFees: student.feesApplied || 0,
          addedBy: student.addedBy?.employeeName || 'Unknown',
          // Add student efficiency metrics
          efficiency: student.feesApplied > 0 ? (student.feesApplied / student.amountPaid * 100).toFixed(2) : 0
        });
      });
      
      // Collect invoices data
      record.invoices.forEach(invoice => {
        invoicesData.push({
          sessionId: record._id,
          sessionDate: record.createdAt,
          details: invoice.invoiceDetails,
          amount: invoice.invoiceAmount,
          time: invoice.time,
          addedBy: invoice.addedBy?.employeeName || 'Unknown',
          // Add invoice categorization
          category: categorizeInvoice(invoice.invoiceDetails),
          percentage: sessionAmount > 0 ? ((invoice.invoiceAmount / sessionAmount) * 100).toFixed(2) : 0
        });
      });
    });
 
    // Calculate averages
    if (totalSessions > 0) {
      averageStudentsPerSession = (totalStudents / totalSessions).toFixed(2);
      averageAmountPerSession = (totalAmount / totalSessions).toFixed(2);
      averageCenterFeesPerSession = (totalCenterFees / totalSessions).toFixed(2);
    }
 
    // Get teacher info
    const teacher = attendanceRecords.length > 0 ? attendanceRecords[0].teacher : null;
 
    res.json({
      teacher,
      summary: {
        totalSessions,
        totalStudents,
        totalAmount,
        totalCenterFees,
        totalTeacherFees,
        totalInvoices,
        totalNetProfit,
        averageStudentsPerSession,
        averageAmountPerSession,
        averageCenterFeesPerSession,
        finalizedSessions,
        pendingSessions,
        // Add efficiency metrics
        overallEfficiency: totalStudents > 0 ? (totalCenterFees / totalStudents).toFixed(2) : 0,
        profitMargin: totalAmount > 0 ? ((totalNetProfit / totalAmount) * 100).toFixed(2) : 0,
        completionRate: totalSessions > 0 ? ((finalizedSessions / totalSessions) * 100).toFixed(2) : 0
      },
      sessionsData,
      studentsData,
      invoicesData
    });
 
  } catch (error) {
    console.error('Error fetching teacher report data:', error);
    res.status(500).json({ error: 'Error fetching teacher report data' });
  }
};

// Helper function to categorize invoices
function categorizeInvoice(details) {
  const detail = details.toLowerCase();
  if (detail.includes('material') || detail.includes('book') || detail.includes('كتاب')) {
    return 'Materials';
  } else if (detail.includes('transport') || detail.includes('bus') || detail.includes('مواصلات')) {
    return 'Transportation';
  } else if (detail.includes('food') || detail.includes('meal') || detail.includes('طعام')) {
    return 'Food';
  } else if (detail.includes('extra') || detail.includes('additional') || detail.includes('إضافي')) {
    return 'Extra Services';
  } else {
    return 'Other';
  }
}

const downloadTeacherExcel = async (req, res) => {
  try {
    const { teacherId, startDate, endDate } = req.query;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }
    
    // Build query
    const query = { teacher: teacherId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
 
    // Get attendance records for the teacher
    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'teacherName')
      .populate('finalizedBy', 'employeeName')
      .populate('studentsPresent.student', 'studentName studentCode')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('invoices.addedBy', 'employeeName')
      .sort({ createdAt: -1 })
      .lean();
 
    if (attendanceRecords.length === 0) {
      return res.status(404).json({ error: 'No data found for this teacher' });
    }
 
    const teacher = attendanceRecords[0].teacher;
 
    // Create workbook
    const workbook = new excelJS.Workbook();
    
    // Summary worksheet
    const summaryWorksheet = workbook.addWorksheet('Summary');
    summaryWorksheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 }
    ];
 
    // Style header
    summaryWorksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '000000' },
      };
    });
 
    // Calculate summary data
    let totalSessions = 0;
    let totalStudents = 0;
    let totalAmount = 0;
    let totalCenterFees = 0;
    let totalInvoices = 0;
 
    attendanceRecords.forEach(record => {
      totalSessions++;
      totalStudents += record.studentsPresent.length;
      totalAmount += record.totalAmount || 0;
      totalCenterFees += record.studentsPresent.reduce((sum, student) => sum + (student.feesApplied || 0), 0);
      totalInvoices += record.invoices.reduce((sum, invoice) => sum + invoice.invoiceAmount, 0);
    });
 
    // Add summary data
    summaryWorksheet.addRow({ metric: 'Teacher Name', value: teacher?.teacherName || 'Unknown' });
    summaryWorksheet.addRow({ metric: 'Total Sessions', value: totalSessions });
    summaryWorksheet.addRow({ metric: 'Total Students', value: totalStudents });
    summaryWorksheet.addRow({ metric: 'Total Amount', value: totalAmount });
    summaryWorksheet.addRow({ metric: 'Total Center Fees', value: totalCenterFees });
    summaryWorksheet.addRow({ metric: 'Total Invoices', value: totalInvoices });
    summaryWorksheet.addRow({ metric: 'Net Profit', value: totalAmount - totalCenterFees - totalInvoices });
    summaryWorksheet.addRow({ metric: 'Average Students/Session', value: (totalStudents / totalSessions).toFixed(2) });
    summaryWorksheet.addRow({ metric: 'Average Amount/Session', value: (totalAmount / totalSessions).toFixed(2) });
 
    // Sessions worksheet
    const sessionsWorksheet = workbook.addWorksheet('Sessions');
    sessionsWorksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Course', key: 'course', width: 20 },
      { header: 'Students', key: 'students', width: 15 },
      { header: 'Total Amount', key: 'amount', width: 20 },
      { header: 'Center Fees', key: 'centerFees', width: 20 },
      { header: 'Invoices', key: 'invoices', width: 20 },
      { header: 'Net Profit', key: 'netProfit', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];
 
    // Style header
    sessionsWorksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '000000' },
      };
    });
 
    // Add sessions data
    attendanceRecords.forEach(record => {
      const sessionCenterFees = record.studentsPresent.reduce((sum, student) => sum + (student.feesApplied || 0), 0);
      const sessionInvoices = record.invoices.reduce((sum, invoice) => sum + invoice.invoiceAmount, 0);
      
      sessionsWorksheet.addRow({
        date: new Date(record.createdAt).toLocaleDateString(),
        course: record.course,
        students: record.studentsPresent.length,
        amount: record.totalAmount || 0,
        centerFees: sessionCenterFees,
        invoices: sessionInvoices,
        netProfit: (record.totalAmount || 0) - sessionCenterFees - sessionInvoices,
        status: record.isFinalized ? 'Finalized' : 'Pending'
      });
    });
 
    // Students worksheet
    const studentsWorksheet = workbook.addWorksheet('Students');
    studentsWorksheet.columns = [
      { header: 'Session Date', key: 'sessionDate', width: 20 },
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Student Code', key: 'studentCode', width: 15 },
      { header: 'Amount Paid', key: 'amountPaid', width: 20 },
      { header: 'Center Fees', key: 'centerFees', width: 20 },
      { header: 'Added By', key: 'addedBy', width: 20 }
    ];
 
    // Style header
    studentsWorksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '000000' },
      };
    });
 
    // Add students data
    attendanceRecords.forEach(record => {
      record.studentsPresent.forEach(student => {
        studentsWorksheet.addRow({
          sessionDate: new Date(record.createdAt).toLocaleDateString(),
          studentName: student.student?.studentName || 'Unknown',
          studentCode: student.student?.studentCode || 'N/A',
          amountPaid: student.amountPaid,
          centerFees: student.feesApplied || 0,
          addedBy: student.addedBy?.employeeName || 'Unknown'
        });
      });
    });
 
    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=teacher-report-${teacher?.teacherName || 'unknown'}.xlsx`);
 
    // Write to response
    await workbook.xlsx.write(res);
    res.status(200);
  } catch (error) {
    console.error('Error generating teacher Excel file:', error);
    res.status(500).send('Error generating Excel file');
  }
};

// ================================= END Teacher Report ================================ //

module.exports = {
  dashboard,
  getDashboardData,
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
  getEmployeeLog,
  centerFees_Get,
  getCenterFeesData,
  collectCenterFees,
  attendanceDetails_Get,
  getAttendanceDetails,
  downloadAttendanceExcel,
  teacherReport_Get,
  getTeacherReportData,
  downloadTeacherExcel,
};
