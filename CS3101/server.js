var mysql = require('mysql');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
//Defining routes
var app = express();
console.log("running...");
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.get('/home', displayHome);
app.get('/query1', query1);
app.get('/query2', query2);
app.get('/query3', query3);
app.get('/query4', query4);
app.get('/query5', query5);
app.get('/make_purchase', makePurchase);
app.get('/register', displayRegisterPage);
app.post('/register_user', registerUser);
app.post('/process_purchase', processPurchase);
app.listen(8080);
//Builds connection
function makeConnection() {
  return mysql.createConnection({
    host: "ljw26.host.cs.st-andrews.ac.uk",
    user: "ljw26",
    password: "fBJ7p3v69.7puX",
    database: "ljw26_cs3101_p1_db"
  });
};
//Renders home page
function displayHome(req, res) {
  res.render('home.ejs');
};
//Performs query 1 and renders result page
function query1(req, res) {
  var con = makeConnection();
  con.query("SELECT title, price, age_rating FROM audio_book", function (err, result) {
    if (err) throw err;
    console.log("query1");
    res.render('query1.ejs', {results: result});
  });
};
//Performs query 2 and renders result page
function query2(req, res) {
  var con = makeConnection();
  var sql = "SELECT CONCAT(contributor.first_name, ' ', contributor.last_name) AS author_name, GROUP_CONCAT(' ', audio_book.title) AS title " +
    "FROM contributor, audio_book, book_authors WHERE contributor.contributor_id = book_authors.author_id " +
    "AND audio_book.ISBN = book_authors.ISBN " +
    "GROUP BY CONCAT(contributor.first_name, ' ', contributor.last_name)";

  con.query(sql, function(err, result) {
    if (err) throw err;

    var title = [];
    var author = [];
    for (var i = 0; i < result.length; i++) {
      title.push(result[i].title);
      author.push(result[i].author_name);
    }
    console.log("query2");
    res.render('query2.ejs', {
      titles: title,
      authors: author
    });
  });
};
//Performs query 3 and renders results page
function query3(req, res) {
  var con = makeConnection();
  var sql = "SELECT audio_book.title, AVG(book_reviews.rating) AS rating, GROUP_CONCAT(' \"', book_reviews.comments, '\"') AS comments " +
    "FROM audio_book, book_reviews " +
    "WHERE audio_book.ISBN = book_reviews.ISBN " +
    "GROUP BY audio_book.title";

  con.query(sql, function(err, result) {
    if (err) throw err;

    var titles = [];
    var ratings = [];
    var comments = [];
    for (var i = 0; i < result.length; i++) {
      titles.push(result[i].title);
      ratings.push(result[i].rating);
      comments.push(result[i].comments);
    }
    console.log("query3");
    res.render('query3.ejs', {
      titles: titles,
      ratings: ratings,
      comments: comments
    });
  });
};
//Performs query 4 and renders result page
function query4(req, res) {
  var con = makeConnection();
  var sql = "SELECT audio_book.title, COUNT(*) as amount_of_purchases " +
    "FROM audio_book, purchase_log " +
    "WHERE audio_book.ISBN = purchase_log.ISBN " +
    "GROUP BY audio_book.title " +
    "ORDER BY COUNT(*) DESC"

  con.query(sql, function(err, result) {
    if (err) throw err;

    var titles = [];
    var purchases = [];
    for (var i = 0; i < result.length; i++) {
      titles.push(result[i].title);
      purchases.push(result[i].amount_of_purchases);
    }
    console.log("query4");
    res.render('query4.ejs', {
      titles: titles,
      purchases: purchases
    })
  });
};
//Renders login page
function query5(req, res) {
  res.render('make_purchase.ejs');
};
//Checks user exists before logging them in and rendering book selection page
function makePurchase(req, res) {
  var email = req.query.email;
  var con = makeConnection();
  var sql = "SELECT * FROM customer WHERE customer.email_address = ?";
  con.query(sql, [email], function(err, result) {
    if (err) throw err;

    if (result.length == 0) {
      res.render('user_not_found.ejs', {
        email: email
      });
    }
  });

  con.query("SELECT title FROM audio_book", function (err, result) {
    if (err) throw err;
    res.render('book_selection.ejs', {
      email: email,
      titles: result
    });
  });
};
//Render registration page
function displayRegisterPage(req, res) {
  var email = req.query.email;
  res.render('register_user.ejs', {
    email: email
  });
};
//Attempts to register new user
function registerUser(req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email;
  var dob = req.body.dob;

  var con1 = makeConnection();
  con1.query("SELECT * FROM customer WHERE email_address = ?", [email], function (err, result1) {
    if (err) throw err;
    if (result1.length > 0) {
      res.render('email_already_taken.ejs', {
        fname: fname,
        lname: lname,
        email: email,
        dob: dob
      })
    } else {
      var con2 = makeConnection();
      var sql = "INSERT INTO customer (first_name, last_name, email_address, date_of_birth) " +
        "VALUES (?, ?, ?, ?)";
      con2.query(sql, [fname, lname, email, dob], function(err, result2) {
        if (err) throw err;
        console.log("customer added.");
        res.render('welcome_new_user.ejs', {
          fname: fname,
          lname: lname
        });
      });
    };
  });
};
//Attempts to process book purchase
function processPurchase(req, res) {
  var title = req.body.book;
  var email = req.body.email;
  var con1 = makeConnection();
  con1.query("SELECT ISBN, age_rating FROM audio_book WHERE title = ?", [title], function(err, result1) {
    if (err) throw err;
    var con2 = makeConnection();
    con2.query("SELECT customer_id, FLOOR(DATEDIFF(CURDATE(), date_of_birth)/365.25) AS age FROM customer WHERE email_address = ?", [email], function(err, result2) {
      if (err) throw err;
      if (result2[0].age < result1[0].age_rating) {
        con4 = makeConnection();
        con4.query("SELECT title FROM audio_book", function (err, result4) {
          res.render('not_old_enough.ejs', {
            email: email,
            titles: result4
          });
        });
      } else {
        var currDate = new Date();
        var con3 = makeConnection();
        con3.query("INSERT INTO purchase_log (customer_id, ISBN, date_of_purchase) VALUES (?, ?, ?)", [result2[0].customer_id, result1[0].ISBN, currDate], function(err, result) {
          console.log("purchase made");
          res.render('purchase_successful.ejs', {
            book: title
          });
        });
      };
    });
  });
};
