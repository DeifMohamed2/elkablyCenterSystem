const Admin = require('../models/admin');
const Employee = require('../models/employee');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;


const homePage = (req, res) => {
    res.render('index', { title: 'Elkably Center System' });
}; 

const singIn = async (req, res) => {
    const { phoneNumber, password ,isAdmin} = req.body;

    console.log(req.body);

    if(isAdmin){
        const admin = await Admin.findOne ({
            phoneNumber,
            password,
        });
        console.log(admin);
        if (!admin) {
            res.status(404).send({message :'Admin not found'});
            return;
        }
        const token = jwt.sign({ adminId: admin._id }, jwtSecret);
        res.cookie('token', token, { httpOnly: true });
        res.send(admin);
    }else{
        const employee = await Employee.findOne({
          employeePhoneNumber: phoneNumber,
          employeePassword: password,
        });
        console.log(employee);
        if (!employee) {
            res.status(404).send({message :'Employee not found'});
            return;
        }
        const token = jwt.sign({ employeeId: employee._id }, jwtSecret);
        res.cookie('token', token, { httpOnly: true });
        res.send(employee);
      
    }
    




    // const admin = await Admin.findOne({
    //     phoneNumber,
    //     password,
    // });
    // console.log(admin);
    // if (!admin) {
    //     res.status(404).send({message :'Admin not found'});
    //     return;
    // }
    // const token = jwt.sign({ adminId: admin._id }, jwtSecret);
    // res.cookie('token', token, { httpOnly: true });


    // res.send(admin);
};


const addAdmin = (req, res) => {
    const admin = new Admin(req.body);
    console.log(req.body);
    admin.save()
        .then((result) => {
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
        });
};


module.exports = {
  homePage,
  addAdmin,
  singIn,
};