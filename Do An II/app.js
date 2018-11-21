var express = require('express');
var path = require('path');
var mongojs = require('mongojs');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var session = require('express-session');
var User = require('./model/user');
const Nexmo = require('nexmo');
var flash = require('connect-flash');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var LocalStrategy = require('passport-local').Strategy;
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var scanf = require("sscanf");
// set database
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

// init app

const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');
app.use(methodOverride('_method'));

var loi;

// set the views
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set public
app.use(express.static(path.join(__dirname,'public')));

// thiết lập  Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));


const mongoURI = 'mongodb://localhost:27017/uploadfiles';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});
// middleware được gọi ở từng request, kiểm tra session lấy ra passport.user nếu chưa có thì tạo rỗng.
app.use(passport.initialize());
// lấy thông tin user rồi gắn vào req.user 
app.use(passport.session());

  // Connect Flash
  app.use(flash());

//global vars
app.use(function(req,res,next){
//  res.locals.success_msg = req.flash('success_msg');
  //res.locals.error_msg = req.flash('error_msg');
  //res.locals.error = req.flash('error');
    res.locals.errors = null;
    res.locals.user = req.user || null;
    res.locals.mail = req.mail || null;
    res.locals.phone = req.phone || null;  
    next();
});
// Express Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;
  
      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    }
  }));


// register
app.get('/register',function(req,res){
    res.render('register');
    });

//Nexmo

const nexmo = new Nexmo({
    apiKey: '5e555a5e',
    apiSecret: 'i5xyaslqhHZwW00z'
  }, { debug: true });

// Catch form submit
var code,code1 ;
var name1;
var username1;
var email1;
var password1;
var PhoneNumber1;
app.post('/register', (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var PhoneNumber = req.body.PhoneNumber;
    var password = req.body.password;
name1 = name;
username1 = username;
email1 = email;
password1 = password;
PhoneNumber1 = PhoneNumber;
    // Validation
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('PhoneNumber','PhoneNumber is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
    var errors = req.validationErrors();
    if (errors) {
        res.render('register', {
            errors: errors
        });
    }else {
        //checking for email and username are already taken
        User.findOne({ username: { 
            "$regex": "^" + username + "\\b", "$options": "i"
        }}, function (err, user) {
            User.findOne({ email: { 
                "$regex": "^" + email1 + "\\b", "$options": "i"
        }}, function (err, mail) {
            User.findOne({PhoneNumber: {
                "$regex": "^" + PhoneNumber + "\\b","$options": "i"
            }},function(err,phone){

                if (user || mail ||phone) {
                    res.render('register', {
                        user: user,
                        mail: mail,
                        phone: phone
                    });
                }
                else {
                    var number = req.body.PhoneNumber;
                    var text = parseInt(Math.random()*(9999-1000)+1000);
                    code = text;
                    nexmo.message.sendSms(
                      '841664925036', number, text, { type: 'unicode' },
                      (err, responseData) => {
                        if(err) {
                          console.log(err);
                        } else {
                          const { messages } = responseData;
                          const { ['message-id']: id, ['to']: number, ['error-text']: error  } = messages[0];
                          console.dir(responseData);
                        //  const data = {id,number,error };
                          res.render("Confirm",{dt: text});
                        }
                      }
                    );
                }
            })
            });
        });
    }
  });

// xac nhan ma code tu dien thoai
app.post('/codeconfirm', function(req,res){
     var code1 = req.body.code;
    if(code == code1){
        var newUser = new User({
            name: name1,
            email: email1,
            username: username1,
            password: password1,
            PhoneNumber:PhoneNumber1
        });
        User.createUser(newUser, function (err, user) {
            if (err) throw err;
            console.log(user);
        });
        res.render('login');
    }else{
        res.render('Confirm',{dt: code})
    }

})

// forget Password
app.get('/forgetPassword',function(req,res){
    res.render("forgetPassword")
})
var phoneInput;
app.post('/forgetPassword',function(req,res){
 phoneInput = req.body.numberPhone;
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        var dbo = db.db("loginapp")
        if(err){
            console.log("connect failed!");
        }else{
            console.log("connected to database");
            dbo.collection('users').find({PhoneNumber:phoneInput}).toArray(function(err,user){
                if(err) throw err;
                if(user.length > 0){
                    var text = parseInt(Math.random()*(9999-1000)+1000);
                    code1 = text;
                    nexmo.message.sendSms(
                      '841664925036', phoneInput, text, { type: 'unicode' },
                      (err, responseData) => {
                        if(err) {
                          console.log(err);
                        } else {
                          const { messages } = responseData;
                          const { ['message-id']: id, ['to']: number, ['error-text']: error  } = messages[0];
                          console.dir(responseData);
                          //const data = {id,number,error };
                          res.render("resetPassword",{dt: text});
                        }});
                }else{
                    res.redirect('forgetPassword');
                }
               db.close(); 
             });
        }
     
       });
       
    });
      

// reset password
app.post('/resetPassword',function(req,res){
    var resetPassword = req.body.resetPassword;
    var codeReset = req.body.codeReset;

    // check errors
    req.checkBody('resetPassword','Nhập mật khẩu mới!').notEmpty();
    req.checkBody('resetPassword2','Nhập lại mật khẩu yêu cầu!').notEmpty();
    req.checkBody('resetPassword2','Mật khẩu không khớp!').equals(req.body.resetPassword);
    req.checkBody('codeReset','Nhập mã code xác nhận!').notEmpty();
      //code1.toString();
    req.checkBody('codeReset','Mã xác nhận không đúng!').equals(code1.toString());
    console.log(code1);
    var errors = req.validationErrors();

    if(errors){
        res.render('resetPassword',{
            errors:errors
        })
    }else{
        var MongoClient = require('mongodb').MongoClient;
        var url = "mongodb://127.0.0.1:27017/";

        MongoClient.connect(url, function(err, db) {
         if (err) throw err;
         var dbo = db.db("loginapp");
        var password = {PhoneNumber: phoneInput}
        //bcrypt 

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(resetPassword, salt, function(err, hash) {
            var newpass = { $set: {password: hash } };
            dbo.collection("users").updateOne(password, newpass, function(err, result) {
            if (err) throw err;
            console.log("Cập nhật mật khẩu thành công");
            res.render('login');
            db.close();
        });
   });       
   });
        });
    } 
});

function change_alias(alias) {
    var str = alias;
    str = str.toLowerCase();
    str = str.replace(/ầ|ấ|ậ|ẩ|ẫ/g,"â");
    str = str.replace(/ằ|ắ|ặ|ẳ|ẵ/g,"ă");
    str = str.replace(/à|á|ạ|ả|ã|â|ă/g,"a"); 
    str = str.replace(/ề|ế|ệ|ể|ễ/g,"ê")
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ờ|ớ|ợ|ở|ỡ/g,"ơ");
    str = str.replace(/ồ|ố|ộ|ổ|ỗ/g,"ô");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ơ/g,"o"); 
    str = str.replace(/ừ|ứ|ự|ử|ữ/g,"ư");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g," ");
    str = str.replace(/ + /g," ");
    str = str.trim(); 
    return str;
}
// Hàm tìm kiếm
function search_name(X,Y){
    var X1 = X.toLowerCase();
    var Y1 = Y.toLowerCase();
    var X2 = change_alias(X1);
   var Y2 =  change_alias(Y1);
var chuoi1 = X2.split(" ");
var chuoi2 = Y2.split(" ");
    var lenX = chuoi1.length;
    var lenY = chuoi2.length;
    // for(var i=0;i<lenX ;i++){
    //     change_alias(X1[i]);
    // }
    // for(var i=0;i<lenY ;i++){
    //     change_alias(Y1[i]);
    // }
    var a = new Array(lenX+1);
    for(var i =0 ;i<lenX+1;i++){
        a[i] = new Array(lenY+1)
    }
    
    for(var i = lenX;i >= 0;i-- )
        a[i][lenY] = 0;
    
    for(var j = lenY;j >= 0;j-- ){
        a[lenX][j] = 0;
    }
    for(var i= lenX-1; i>=0; i--){
        for(var j=lenY-1;j>=0;j--){
            if(chuoi1[i]==chuoi2[j]) a[i][j] = a[i+1][j+1] + 1;
            else a[i][j] = a[i][j+1]>a[i+1][j]?a[i][j+1]:a[i+1][j];
        }
    }
    return a[0][0]
}
app.post("/search", function(req,res){
    var key = req.body.product_name;
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    var data = new Array();
    var data_num = new Array();
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  var re = {name: key};
  dbo.collection("tempSP").find().toArray( function(err, result) {
    if (err) throw err;
    for(var i = 0;i<result.length;i++){
    if(search_name(result[i].name +" "+result[i].describle, key)>0){
        data.push(result[i]);
        data_num.push(search_name(result[i].name+" "+result[i].describle, key));
    }
}
     if(data.length!=0){
        for(var i = 0; i<data.length-1;i++){
           var k2;
           var max;
        for(var j=i+1;j<data.length;j++)
        if(data_num[i]<data_num[j]){
            var k1;
            k1=data_num[i];data_num[i]=data_num[j];data_num[j]=k1;
            max = j;
            k2=data[i];data[i]=data[j];data[j]=k2;
        }
       // k2=data[i];data[i]=data[max];data[max]=k2;
    }
}
    res.render("searchpage",{kq: data})
    db.close();
  });
});
})
var tenuser;
//khi login thi chay middleware va goi den cai nay
passport.use(new LocalStrategy(
    function (username, password, done) {
        User.getUserByUsername(username, function (err, user) {
            if (err) throw err;
            if (!user) {
                return done(null, false, { message: 'Unknown User' });
            }
           if(user){
            User.comparePassword(password, user.password, function (err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    tenuser = user.username;
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Invalid password' });
                }
            });
        };
        });
    }));
// ham duoc goi khi xac thực thành công để lưu thông tin user vào session
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
// giup ta lấy dữ liệu user dựa vào thông tin lưu trên session và gắn vào req.user 
passport.deserializeUser(function (id, done) {
    User.getUserById(id, function (err, user) {
        done(err, user);
    });
});

// login
app.get('/login',function(req,res){
    res.render('login');
    });

app.post('/login',
    passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login',successFlash:"Success", failureFlash: 'Invalid username or password.'}),function(req,res){
        console.log("Success");
req.flash('success', 'OK');
res.redirect('/');
    });

    //danh sach san pham da dang
app.get("/listproduct/:id", function(req, res){
    var title = req.params.id;
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      dbo.collection("tempSP").find({shop: title}).toArray(function(err, result) {
        if (err) throw err;
       res.render("listproduct",{kq: result});
        db.close();
      });
    });


})

 
// Thông tin tài khoản người dùng 
app.get("/userinformation/:id", function(req, res){
    var title = req.params.id;
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("loginapp");
      dbo.collection("users").find({username:title}).toArray(function(err, result) {
        if (err) throw err;
       res.render("userinfomation",{kq: result});
        db.close();
      });
    });
})

// chỉnh sửa thông tin người dùng
app.get('/user/modifier/:id',function(req,res){
    var title = req.params.id;
    
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        if (err) throw err;
        var dbo = db.db("loginapp");
        dbo.collection("users").find({username:title}).toArray(function(err,result){
            if(err) throw err;
            
            res.render("modifierUser",{user1:result});
            db.close();
        })
    })
})

// chỉnh sửa thông tin người dùng
app.post('/user/modifier/:id',function(req,res){
    var title = req.params.id;
    console.log(title);
        //check validator
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
     req.checkBody('username',"Họ và tên bắt buộc!").notEmpty();
    req.checkBody('email',"Email bắt buộc!").notEmpty();
    req.checkBody('phone','Số điện thoại bắt buộc!').notEmpty();
     var errors = req.validationErrors();
    if(errors){
        res.render('modifierUser',{errors:errors})
    }else{
        var MongoClient = require('mongodb').MongoClient;
        var url='mongodb://localhost:27017/';
        MongoClient.connect(url,function(err,db){
            if(err) throw err;
            var dbo = db.db("loginapp");
            var where ={username : req.body.username};
            var query={$set: {name:name,email:email,PhoneNumber:phone}};
            dbo.collection("users").updateOne(where,query,function(err,res){
                if(err) throw err;
            })
            dbo.collection("users").find({username:title}).toArray(function(err,result){
                if(err) throw err;
                res.render('userinfomation',{kq:result});
                db.close();
            })
            db.close();
        })
    }
})	
// change password
    app.get('/user/changePassword',function(req,res){
        res.render("changePassword");
    })
     app.post("/changePassword/:id",function(req,res){
        var title = req.params.id;
         var oldPassword = req.body.oldPassword;
        var newPassword = req.body.newPassword;
        
        req.checkBody('oldPassword','Nhập mật khẩu cũ').notEmpty();
        req.checkBody('newPassword','Nhập mật khẩu mới').notEmpty();
        req.checkBody('newPassword2','Nhập lại mật khẩu mới').notEmpty();
        req.checkBody('newPassword2','Xác nhận mật khẩu không khớp').equals(req.body.newPassword);
 // check errors
var errors = req.validationErrors();
    if(errors){
    res.render("changePassword",{errors:errors});
    }else{
        // truy cap de lay mat khau cu
        var MongoClient = require('mongodb').MongoClient;
        var url = "mongodb://localhost:27017";
        MongoClient.connect(url,function(err,foundUser){
            if(err) throw err;
            var dbo = foundUser.db("loginapp");
            dbo.collection("users").findOne({username: title},function(err,user){
                if(err) throw err;
                if(user){
                     User.comparePassword(oldPassword,user.password,function(err,isMatch){
                if(!isMatch) res.render("changePassword",{
                    errors: [{msg : "Mật khẩu cũ không đúng"}]
                });
                if(isMatch){
             var newPass = {username:title};
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(newPassword, salt, function(err, hash) {
                    var newpass = { $set: {password: hash } };
                    dbo.collection("users").updateOne(newPass, newpass, function(err, result) {
                    if (err) throw err;
                    console.log("Cập nhật mật khẩu thành công");
                    res.render('login');
                    foundUser.close();
                });
           });      
           });
        }
     })
     }
    })
    })
}
     });
// log out
app.get('/logout', function (req, res) {
    req.logout();

    req.flash('success_msg', 'You are logged out');

    res.redirect('/');
});

//dell products
app.get('/Maytinh/dell',function(req,res){
    var MongoClient = require("mongodb").MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        if(err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("máy tính").find({label:"Dell"}).toArray(function(err,result){
            if(err) throw err;
            res.render("dellComputer",{data:result}); 
            db.close();
                })
    })
})
// asus products
app.get('/Maytinh/asus',function(req,res){
    var MongoClient = require("mongodb").MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        if(err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("máy tính").find({label:"Asus"}).toArray(function(err,result){
            if(err) throw err;
            res.render("asusComputer",{data:result}); 
            db.close();
                })
    })
})
// lenovo products
app.get('/Maytinh/lenovo',function(req,res){
    var MongoClient = require("mongodb").MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        if(err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("máy tính").find({label:"Lenovo"}).toArray(function(err,result){
            if(err) throw err;
            res.render("lenovoComputer",{data:result}); 
            db.close();
                })
    })
})

// HP products
app.get('/Maytinh/hp',function(req,res){
    var MongoClient = require("mongodb").MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        if(err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("máy tính").find({label:"HP"}).toArray(function(err,result){
            if(err) throw err;
            res.render("hpComputer",{data:result}); 
            db.close();
                })
    })
})

// Acer products
app.get('/Maytinh/acer',function(req,res){
    var MongoClient = require("mongodb").MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        if(err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("máy tính").find({label:"Acer"}).toArray(function(err,result){
            if(err) throw err;
            res.render("acerComputer",{data:result}); 
            db.close();
                })
    })
})
// filter theo product
app.post("/maytinhdell/filter",function(req,res){
    //tao bien de luu gia tri nguoi dung chon de loc
    var filterMinPrice = req.body.filterMinPrice;
    var filterMaxPrice = req.body.filterMaxPrice;
    var filterState = req.body.filterState;
    var filterWeight = req.body.filterWeight;
    var filterRam = req.body.filterRam;
    var filterHarddisk = req.body.filterHarddisk;
    var filterTypeharddisk = req.body.filterTypeharddisk;
    var filterCard = req.body.filterCard;
    var filterChip = req.body.filterChip;
    var MongoClient = require("mongodb").MongoClient;
     var url = "mongodb://localhost:27017";
  var data1 =" ";

var weight = "'" + filterWeight +"'"; 
var state = "'" + filterState +"'"; 
var card = "'" + filterCard +"'";
var chip = "'" + filterChip +"'";
var ram = "'" + filterRam +"'";
var harddisk = "'" + filterHarddisk +"'";
var typeharddisk = "'" + filterTypeharddisk +"'";
  if(filterWeight != "lckhac") data1 +="weight : "+weight+",";
  if(filterState != "lckhac") data1 +="state : "+state+",";
  if(filterCard != "lckhac") data1 +="card : "+card+",";
 if(filterChip != "lckhac") data1+="chip :"+chip+",";
 if(filterRam != "lckhac") data1+="ram :"+ram+",";
 if(filterHarddisk != "lckhac") data1+="harddisk :"+harddisk+",";
 if(filterTypeharddisk != "lckhac") data1+="typeharddisk :"+typeharddisk+",";
 var check = data1.slice(0,data1.length-1);
 
 var test = "{"+check+"}";
 MongoClient.connect(url,function(err,db){
    if(err) throw err;
    var dbo = db.db("mydb");
    
    var quety = JSON.stringify(eval('('+test+')'));
    quety=JSON.parse(quety)
    console.log(quety)
    dbo.collection("máy tính").find(quety).toArray(function(err,result){
        if(err) throw err;
        var data =[];
        for(var i=0;i<result.length;i++){
            if(result[i].label == "Dell")
            data.push(result[i]);
                }
        var data2=[];
        for(var i=0;i<data.length;i++){
            if((parseInt(data[i].price) >= parseInt(filterMinPrice[0])) && (parseInt(data[i].price) <= parseInt(filterMaxPrice[0]))){
                data2.push(data[i]);
            }
        }
            res.render("filterdellProducts",{data:data2});
            db.close();
       
    })
})
})

app.post("/maytinhasus/filter",function(req,res){
    //tao bien de luu gia tri nguoi dung chon de loc
    var filterMinPrice = req.body.filterMinPrice;
    var filterMaxPrice = req.body.filterMaxPrice;
    var filterState = req.body.filterState;
    var filterWeight = req.body.filterWeight;
    var filterRam = req.body.filterRam;
    var filterHarddisk = req.body.filterHarddisk;
    var filterTypeharddisk = req.body.filterTypeharddisk;
    var filterCard = req.body.filterCard;
    var filterChip = req.body.filterChip;
    var MongoClient = require("mongodb").MongoClient;
     var url = "mongodb://localhost:27017";
  var data1 =" ";

var weight = "'" + filterWeight +"'"; 
var state = "'" + filterState +"'"; 
var card = "'" + filterCard +"'";
var chip = "'" + filterChip +"'";
var ram = "'" + filterRam +"'";
var harddisk = "'" + filterHarddisk +"'";
var typeharddisk = "'" + filterTypeharddisk +"'";
  if(filterWeight != "lckhac") data1 +="weight : "+weight+",";
  if(filterState != "lckhac") data1 +="state : "+state+",";
  if(filterCard != "lckhac") data1 +="card : "+card+",";
 if(filterChip != "lckhac") data1+="chip :"+chip+",";
 if(filterRam != "lckhac") data1+="ram :"+ram+",";
 if(filterHarddisk != "lckhac") data1+="harddisk :"+harddisk+",";
 if(filterTypeharddisk != "lckhac") data1+="typeharddisk :"+typeharddisk+",";
 var check = data1.slice(0,data1.length-1);
 
 var test = "{"+check+"}";
 MongoClient.connect(url,function(err,db){
    if(err) throw err;
    var dbo = db.db("mydb");
    
    var quety = JSON.stringify(eval('('+test+')'));
    quety=JSON.parse(quety)
    console.log(quety)
    dbo.collection("máy tính").find(quety).toArray(function(err,result){
        if(err) throw err;
        var data =[];
        for(var i=0;i<result.length;i++){
            if(result[i].label == "Asus")
            data.push(result[i]);
                }
        var data2=[];
        for(var i=0;i<data.length;i++){
            if((parseInt(data[i].price) >= parseInt(filterMinPrice[0])) && (parseInt(data[i].price) <= parseInt(filterMaxPrice[0]))){
                data2.push(data[i]);
            }
        }
            res.render("filterasusProducts",{data:data2});
            db.close();
       
    })
})
})

app.post("/maytinhhp/filter",function(req,res){
    //tao bien de luu gia tri nguoi dung chon de loc
    var filterMinPrice = req.body.filterMinPrice;
    var filterMaxPrice = req.body.filterMaxPrice;
    var filterState = req.body.filterState;
    var filterWeight = req.body.filterWeight;
    var filterRam = req.body.filterRam;
    var filterHarddisk = req.body.filterHarddisk;
    var filterTypeharddisk = req.body.filterTypeharddisk;
    var filterCard = req.body.filterCard;
    var filterChip = req.body.filterChip;
    var MongoClient = require("mongodb").MongoClient;
     var url = "mongodb://localhost:27017";
  var data1 =" ";

var weight = "'" + filterWeight +"'"; 
var state = "'" + filterState +"'"; 
var card = "'" + filterCard +"'";
var chip = "'" + filterChip +"'";
var ram = "'" + filterRam +"'";
var harddisk = "'" + filterHarddisk +"'";
var typeharddisk = "'" + filterTypeharddisk +"'";
  if(filterWeight != "lckhac") data1 +="weight : "+weight+",";
  if(filterState != "lckhac") data1 +="state : "+state+",";
  if(filterCard != "lckhac") data1 +="card : "+card+",";
 if(filterChip != "lckhac") data1+="chip :"+chip+",";
 if(filterRam != "lckhac") data1+="ram :"+ram+",";
 if(filterHarddisk != "lckhac") data1+="harddisk :"+harddisk+",";
 if(filterTypeharddisk != "lckhac") data1+="typeharddisk :"+typeharddisk+",";
 var check = data1.slice(0,data1.length-1);
 
 var test = "{"+check+"}";
 MongoClient.connect(url,function(err,db){
    if(err) throw err;
    var dbo = db.db("mydb");
    
    var quety = JSON.stringify(eval('('+test+')'));
    quety=JSON.parse(quety)
    console.log(quety)
    dbo.collection("máy tính").find(quety).toArray(function(err,result){
        if(err) throw err;
        var data =[];
        for(var i=0;i<result.length;i++){
            if(result[i].label == "HP")
            data.push(result[i]);
                }
        var data2=[];
        for(var i=0;i<data.length;i++){
            if((parseInt(data[i].price) >= parseInt(filterMinPrice[0])) && (parseInt(data[i].price) <= parseInt(filterMaxPrice[0]))){
                data2.push(data[i]);
            }
        }
            res.render("filterhpProducts",{data:data2});
            db.close();
       
    })
})
})

app.post("/maytinhlenovo/filter",function(req,res){
    //tao bien de luu gia tri nguoi dung chon de loc
    var filterMinPrice = req.body.filterMinPrice;
    var filterMaxPrice = req.body.filterMaxPrice;
    var filterState = req.body.filterState;
    var filterWeight = req.body.filterWeight;
    var filterRam = req.body.filterRam;
    var filterHarddisk = req.body.filterHarddisk;
    var filterTypeharddisk = req.body.filterTypeharddisk;
    var filterCard = req.body.filterCard;
    var filterChip = req.body.filterChip;
    var MongoClient = require("mongodb").MongoClient;
     var url = "mongodb://localhost:27017";
  var data1 =" ";

var weight = "'" + filterWeight +"'"; 
var state = "'" + filterState +"'"; 
var card = "'" + filterCard +"'";
var chip = "'" + filterChip +"'";
var ram = "'" + filterRam +"'";
var harddisk = "'" + filterHarddisk +"'";
var typeharddisk = "'" + filterTypeharddisk +"'";
  if(filterWeight != "lckhac") data1 +="weight : "+weight+",";
  if(filterState != "lckhac") data1 +="state : "+state+",";
  if(filterCard != "lckhac") data1 +="card : "+card+",";
 if(filterChip != "lckhac") data1+="chip :"+chip+",";
 if(filterRam != "lckhac") data1+="ram :"+ram+",";
 if(filterHarddisk != "lckhac") data1+="harddisk :"+harddisk+",";
 if(filterTypeharddisk != "lckhac") data1+="typeharddisk :"+typeharddisk+",";
 var check = data1.slice(0,data1.length-1);
 
 var test = "{"+check+"}";
 MongoClient.connect(url,function(err,db){
    if(err) throw err;
    var dbo = db.db("mydb");
    
    var quety = JSON.stringify(eval('('+test+')'));
    quety=JSON.parse(quety)
    console.log(quety)
    dbo.collection("máy tính").find(quety).toArray(function(err,result){
        if(err) throw err;
        var data =[];
        for(var i=0;i<result.length;i++){
            if(result[i].label == "Lenovo")
            data.push(result[i]);
                }
        var data2=[];
        for(var i=0;i<data.length;i++){
            if((parseInt(data[i].price) >= parseInt(filterMinPrice[0])) && (parseInt(data[i].price) <= parseInt(filterMaxPrice[0]))){
                data2.push(data[i]);
            }
        }
            res.render("filterlenovoProducts",{data:data2});
            db.close();
       
    })
})
})

app.post("/maytinhacer/filter",function(req,res){
    //tao bien de luu gia tri nguoi dung chon de loc
    var filterMinPrice = req.body.filterMinPrice;
    var filterMaxPrice = req.body.filterMaxPrice;
    var filterState = req.body.filterState;
    var filterWeight = req.body.filterWeight;
    var filterRam = req.body.filterRam;
    var filterHarddisk = req.body.filterHarddisk;
    var filterTypeharddisk = req.body.filterTypeharddisk;
    var filterCard = req.body.filterCard;
    var filterChip = req.body.filterChip;
    var MongoClient = require("mongodb").MongoClient;
     var url = "mongodb://localhost:27017";
  var data1 =" ";

var weight = "'" + filterWeight +"'"; 
var state = "'" + filterState +"'"; 
var card = "'" + filterCard +"'";
var chip = "'" + filterChip +"'";
var ram = "'" + filterRam +"'";
var harddisk = "'" + filterHarddisk +"'";
var typeharddisk = "'" + filterTypeharddisk +"'";
  if(filterWeight != "lckhac") data1 +="weight : "+weight+",";
  if(filterState != "lckhac") data1 +="state : "+state+",";
  if(filterCard != "lckhac") data1 +="card : "+card+",";
 if(filterChip != "lckhac") data1+="chip :"+chip+",";
 if(filterRam != "lckhac") data1+="ram :"+ram+",";
 if(filterHarddisk != "lckhac") data1+="harddisk :"+harddisk+",";
 if(filterTypeharddisk != "lckhac") data1+="typeharddisk :"+typeharddisk+",";
 var check = data1.slice(0,data1.length-1);
 
 var test = "{"+check+"}";
 MongoClient.connect(url,function(err,db){
    if(err) throw err;
    var dbo = db.db("mydb");
    
    var quety = JSON.stringify(eval('('+test+')'));
    quety=JSON.parse(quety)
    console.log(quety)
    dbo.collection("máy tính").find(quety).toArray(function(err,result){
        if(err) throw err;
        var data =[];
        for(var i=0;i<result.length;i++){
            if(result[i].label == "Acer")
            data.push(result[i]);
                }
        var data2=[];
        for(var i=0;i<data.length;i++){
            if((parseInt(data[i].price) >= parseInt(filterMinPrice[0])) && (parseInt(data[i].price) <= parseInt(filterMaxPrice[0]))){
                data2.push(data[i]);
            }
        }
            res.render("filteracerProducts",{data:data2});
            db.close();
       
    })
})
})

io.on("connection",function(socket){
socket.on("gui-comment",function(data){
    var  info = data.split("ooo");
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://127.0.0.1:27017/";
    
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      var myquery = { _id : info[1] };
      var newvalues = { $set: {comment: info[4]+":\n"+info[3]+"\n"} };
      dbo.collection("tempSP").updateOne(myquery, newvalues, function(err, res) {
        if (err) throw err;
      });
      dbo.collection(info[0]).updateOne(myquery, newvalues, function(err, res) {
        if (err) throw err;
      });
      dbo.collection("tempSP").findOne(myquery, function(err, res) {
        if (err) throw err;
        io.sockets.emit("gui-comment",res.comment);
      });
      db.close();
    });
    
})
socket.on("report",function(data){
socket.emit("report")
})
});


server.listen(8090,function(){
    console.log('server started at port 8090');
});

//pop-up-chat
//chua check log in
io.on("connection",function(socket){
    socket.on("Client-send-messages",function(data){
        socket.emit("Server-send-your-message",data)
        socket.broadcast.emit("Client-ask",data)
    })
    socket.on("Admin-send-messages",function(data){
        socket.emit("Server-send-admin-message",data)
    })
})
// Mongo URI
var  test=0;
// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        test = filename;
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });
var imageFile;
// @route GET /
// @desc Loads form
app.get('/themsanpham', (req, res) => {
  gfs.files.find({filename: test}).toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('themsanpham', { files: false ,err: [{msg: loi}]});
    } else {
        imageFile = files;
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('themsanpham', { files: files,err:[{msg: loi}] });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect('/themsanpham');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

//trang chi tiet san pham
app.get("/sp/sp/:_id",function(req,res){
    var data1;
   var mongoClient = require('mongodb').MongoClient;
   var url = "mongodb://localhost:27017/";
    var _id = req.params._id;
    var query = {_id: _id};
    mongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("tempSP").findOne(query,function(err, result) {
            if(err) throw err;
            data1=result;
            var dbo1=db.db("loginapp");
            dbo1.collection("users").findOne({username:data1.shop},function(err,result){
                if(err) throw err;
                res.render("template",{
                    data:data1,
                    udata:result
                })
                db.close();
            })
            db.close();
        });
        
});
});

app.get('/deleteandupdate/:id',function(req,res){
    var _id = req.params.id;
    var query = {_id: _id};
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    test = 1;
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      dbo.collection("tempSP").findOne(query,function(err, result) {
        if (err) throw err;
        test = result.image;
        res.render('deleteandupdate',{err: [{msg: ""}],files: 0,data: result});
        test = 0;
        db.close();
      });
    });
})

//Xóa và chỉnh sửa sản phẩm
app.delete("/delete",function(req,res){
    gfs.remove({ filename: req.body.delete, root: 'uploads' }, (err, gridStore) => {
        if (err) {
          return res.status(404).json({ err: err });
        }
      });
       var title = req.body.nameuser;
       var attached = req.body.delete1;
       var query = {image: req.body.delete}
       var MongoClient = require('mongodb').MongoClient;
       var url = "mongodb://localhost:27017/";
       
       MongoClient.connect(url, function(err, db) {
         if (err) throw err;
         var dbo = db.db("mydb");
         dbo.collection("tempSP").deleteOne(query, function(err, obj) {
           if (err) throw err;
         });
         dbo.collection(attached).deleteOne(query, function(err, obj) {
            if (err) throw err;
            
          });
          dbo.collection("tempSP").find({shop:title}).toArray(function(err, result) {
            if (err) throw err;
           res.render("listproduct",{kq: result});
            db.close();
          });
       });
})


app.post("/updatesp",function(req,res){
    
    var name = req.body.nameproduct;
    var title = req.body.nameuser;
    var describle = req.body.describleproduct;
    var attached = req.body.attached;
    var label = req.body.label;
    var chip = req.body.chip;
    var weight = req.body.weight;
    var ram = req.body.ram;
    var harddisk = req.body.harddisk;
    var typeharddisk = req.body.typeharddisk;
    var card = req.body.card;
    var state = req.body.state;
    var price = req.body.price;
    var errors=0;
if(!name || !price || !describle)
      errors = [{msg: "Bạn nhập thiếu dữ liệu"}];
   if(errors){
    res.render('deleteandupdate',{err: errors,data: {image: test,_id: req.body.filename, name: name,price: price,shop: title,label: label,chip:chip, weight: weight,ram:ram,harddisk:harddisk,typeharddisk:typeharddisk,card:card,state: state,attached:attached,describle:describle}});
   }else{
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    var where = {_id: req.body.filename }
var query = {$set: {name: name,price: price,shop: title,label: label,chip:chip, weight: weight,ram:ram,harddisk:harddisk,typeharddisk:typeharddisk,card:card,state: state,attached:attached,describle:describle}};
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  dbo.collection(attached).updateOne(where,query, function(err, res) {
    if (err) throw err;
  });
  dbo.collection("tempSP").updateOne(where,query, function(err, res) {
    if (err) throw err;
  });

  dbo.collection("tempSP").find({shop: title}).toArray(function(err, result) {

    if (err) throw err;
   res.render("listproduct",{kq: result});
   db.close();
  }); 
  db.close();
});

}
})



// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
test=0;
    res.redirect('/themsanpham');
  });
});


app.delete('/deleteimage/:id', (req, res) => {
    gfs.remove({ filename: req.params.id, root: 'uploads' }, (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
      test=0;
      res.redirect('/deleteandupdate');
    });
  });
  



// Thêm sản phẩm
app.post("/themsanpham",function(req,res){
    if(!test){
        res.render('themsanpham',{files: imageFile,err: [{msg:"Bạn chưa tải ảnh"}]});
    }else{
    var name = req.body.nameproduct;
    var describle = req.body.describleproduct;
    var attached = req.body.attached;
    var label = req.body.label;
    var chip = req.body.chip;
    var weight = req.body.weight;
    var ram = req.body.ram;
    var harddisk = req.body.harddisk;
    var typeharddisk = req.body.typeharddisk;
    var card = req.body.card;
    var state = req.body.state;
    var price = req.body.price;
    var filename = test;
    var title = req.body.nameuser;
    var errors=0;
if(!name || !price || !describle)
      errors = [{msg: "Bạn nhập thiếu dữ liệu"}];
   if(errors){
    res.render('themsanpham',{files: imageFile,err: errors});
   }else{
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";

   var query = {_id: filename.toString().substring(0,filename.length-4),image: filename,name: name,price: price,shop: title,label: label,chip:chip, weight: weight,ram:ram,harddisk:harddisk,typeharddisk:typeharddisk,card:card,state: state,attached:attached,describle:describle,comment:""};
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  dbo.collection(attached).insertOne(query, function(err, res) {
    if (err) throw err;
  });
  dbo.collection("tempSP").insertOne(query, function(err, res) {
    if (err) throw err;
  });
  db.close();
  test=0;
  imageFile = 0;
  res.render('themsanpham',{files: imageFile, err: [{msg: "Thêm sản phẩm thành công"}]})
 io.sockets.emit("add-product");
});
   }
    }
})
app.get("/",function(req,res){
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var data;
var res2,res3,res4;
 
var MongoClient1 = require('mongodb').MongoClient;
MongoClient1.connect(url, function(err, db) {
var db1 = db.db("mydb");
db1.collection("tempSP").find({label : "Lenovo"}).toArray(function(err,r){
    res2=r;
})  
db1.collection("tempSP").find({label : "Acer"}).toArray(function(err,r){
    res3=r;
})
db1.collection("tempSP").find({label : "HP"}).toArray(function(err,r){
    res4=r;
})
db.close();
MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    dbo.collection("máy tính").find({label : "Dell"}).toArray(function(err, result) {
      if (err) throw err;
      dbo.collection("máy tính").find({label : "Asus"}).toArray(function(err, res1){
        if (err) throw err;
                    db.close();
                    res.render('homepage',{
                        MayTinh: result.reverse(),
                        Chuot: res1.reverse(),
                        Banphim:res2.reverse(),
                        Tainghe:res3.reverse(),
                        Ocung:res4.reverse(),
                    })                  
      })
    });
  });
})
});
