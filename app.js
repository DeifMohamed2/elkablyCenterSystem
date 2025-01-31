require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const cors = require('cors');

const mainRoute = require('./routes/mainRoute');
const adminRoute = require('./routes/adminRoute');
const employeeRoute = require('./routes/employeeRoute');

// express app
const app = express();
app.use(express.json());

// CONECT to mongodb
// let io
å;
const dbURI = 'mongodb://localhost:27017/ElkablyCenter';
// const dbURI ='mongodb+srv://3devWay:1qaz2wsx@cluster0.5orkagp.mongodb.net/elkablyCenter?retryWrites=true&w=majority&appName=Cluster0';
mongoose
  .connect(dbURI)
  .then((result) => {
    app.listen(8600);

    console.log('connected to db and listening on port 8600');
  })
  .catch((err) => {
    console.log(err);
  });

// register view engine
app.set('view engine', 'ejs');
// listen for requests

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// let uri = ""; // Declare the 'uri' variable

app.use(
  session({
    secret: 'Keybord',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: dbURI,
    }),
  })
);

// Custom middlfsdfeware to make io accessible in all routes

// Serve the digital certificate
app.get('/assets/signing/digital-certificate.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/signing/digital-certificate.txt'));
});

app.use('/', mainRoute);
app.use('/admin', adminRoute);
app.use('/employee', employeeRoute);

app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});
