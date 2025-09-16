const Admin = require('../models/admin');
const Employee = require('../models/employee');
const SuperViser = require('../models/superViser');
const jwt = require('jsonwebtoken');
const waziper = require('../utils/waziper');

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
        // Try Employee first
        let user = await Employee.findOne({
          employeePhoneNumber: phoneNumber,
          employeePassword: password,
        });
        if (user) {
          const token = jwt.sign({ employeeId: user._id }, jwtSecret);
          res.cookie('token', token, { httpOnly: true });
          return res.send(user);
        }
        // Try Supervisor account
        const supervisor = await SuperViser.findOne({
          phoneNumber,
          password,
        });
        if (supervisor) {
          const token = jwt.sign({ supervisorId: supervisor._id }, jwtSecret);
          res.cookie('token', token, { httpOnly: true });
          return res.send(supervisor);
        }
        return res.status(404).send({message :'Employee not found'});
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