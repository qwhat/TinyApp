const express = require("express");             // require the express node module
const app = express();
const cookieSession = require("cookie-session");// require the cookie session node module
const bodyParser = require("body-parser");      // require the body parser node module
const uuidv4 = require("uuid/v4");              // require the uuidv4 node module
const bcrypt = require("bcrypt");               // require the bcrypt node module

const PORT = 3001;                              //declares port number where the app will run

app.use(cookieSession({                         //encrypts the cookie values
  name: "session",
  keys: ["key1", "key2"]                        //these are very easy keys but will do for this project
}));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));

/* -------------------------------------------------------------- CUSTOM FUNCTIONS -------------------------------------------------------------- */

function generateRandomString() {
  return uuidv4().substr(0, 6);                                       //uses the uuid dependency to generate a random 6 character string
};

function urlsForUser(id) {                                            //creates a filtered version of the urlDatabase for user who's id matches the userID in the url object
  let filtered = {};
  for (url in urlDatabase) {                                          //loops through the urlDatabase
    if (urlDatabase[url].userID === id) {                             //if the userID matches the id of the user that was passed as the argument
      filtered[url] = urlDatabase[url];                               //adds the url from urlDatabase to our filtered version
    }
  }
  return filtered;                                                    //sends back our filtered list
};

function signInCheck(email, password) {                               //checks if the users email AND password in the user database
  for (let user in users) {                                           //loops through each user
    if (users[user].email === email) {                                //checks if the email exists in our database
      if (bcrypt.compareSync(password, users[user].hashedPassword)) { //compares the input password with our hashed password using the bcrypt deendency
        return users[user].id;                                        //if both email and hashedpassword match, then send the users id back
      }
      return false;                                                   //returns false
    }
  }
  return false;                                                       //returns false
};

function uniqueEmail(email) {                                         //checks if the email exists in our database
  for (let user in users) {                                           //loops through each user in our database
    if (users[user].email === email) {                                //if the given email(during signup) exists in our database
      return false;                                                   //give true (not unique)
    }
  }
  return true;                                                        //give true (unique)
};

/* -------------------------------------------------------------- DATABASES -------------------------------------------------------------- */

const users = {                                 //hardcoded user database
  "bruceWayne": {
    id: "bruceWayne",
    email: "batman@hotmail.com",
    password: "imBatman",
    hashedPassword:bcrypt.hashSync("imBatman", 10)
  },
  "clarkKent": {
    id: "clarkKent",
    email: "superman@hotmail.com",
    password: "imSuperman",
    hashedPassword: bcrypt.hashSync("imSuperman", 10)
  }
};

const urlDatabase = {                           //hardcoded url database
  "b2xVn2": {
    userID: "bruceWayne",
    shortURL: "b2xVn2",
    longURL: "http://www.lighthouselabs.ca",
  },
  "9sm5xK": {
    userID: "bruceWayne",
    shortURL: "9sm5xK",
    longURL:"http://www.google.com",
  },
  "cd11e9": {
    userID: "clarkKent",
    shortURL: "cd11e9",
    longURL:"http://www.youtube.ca"
  },
};

/* -------------------------------------------------------------- CODE -------------------------------------------------------------- */

app.get("/", (req, res) => {                                                                    //gets the "/" page(just a redirect)
  if (req.session.user_id) {                                                                    //if the app detects our cookie
    res.redirect("/urls");                                                                      //redirect the user to their url page
  } else {                                                                                      //otherwise
    res.redirect("/login");                                                                     //redirect them to the login page
  }
});

app.get("/urls", (req, res) => {                                                                //gets the urls_index.ejs "home" page
  if (req.session.user_id) {
    let templateVars = {                                                                        //declares an object that pulls the information from our cookie
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),                                                   //assigns the result of a function to urls, see above for the associated function
    }
    res.render("urls_index", templateVars);                                                     //displays our urls_index.ejs file and gives it access to our templateVars object
  } else {                                                                                      //gives the proper error message if the user is not logged in
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>"); // /login must be in singlequotes or it cuts off the sent string
  }
});

app.get("/urls/new", (req, res) => {                                                            //gets the urls_new.ejs page to create new shortURLS
  let templateVars = {
    users: users,
    user: users[req.session.user_id],
    urls: urlsForUser(req.session.user_id),
  };
  if (req.session.user_id) {
    res.render("urls_new", templateVars);                                                       //displays our urls_new.ejs file and gives it access to our templateVars object
  } else {
    res.redirect("/login");                                                                     //the project requirements want this to be the only page that redirects to login instead of giving an error message
  }
});

app.get("/urls/:id", (req, res) => {                                                            //gets the urls_show.ejs page, :id is equal to whatever shortURL comes after /urls/ in the address bar,

  if (urlDatabase[req.params.id] && req.session.user_id === urlDatabase[req.params.id].userID) {//checks if shortURL exists in our database AND if it belongs to the current user
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id].longURL,
      urls: urlsForUser(req.session.user_id),
    };
    res.render("urls_show", templateVars);                                                      //shows the urls_show.ejs page associated to the shortURL and gives it acces to the templateVars object
  } else if (!urlDatabase[req.params.id]){                                                      //checks if the shortURL does NOT exist in our database
    res.status(404).send("Error 404: Page does not exist");                                     //error message for if the shortURL does not exist
  }  else if (req.session.user_id && req.session.user_id !== urlDatabase[req.params.id].userID){//checks if the shortURL exists AND does NOT belong to the current user
    res.status(403).send("Error 403: You do not have access to this page!");                    //error message for if the shortURL does not belong to the current user
  } else if (!req.session.user_id){
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {                                                                                      //if somehow,user does not satisfy ANY of the above conditions
    res.status(500).send("Error 500: Great, you broke it.");                                    //return appropriate error message
  }
});

app.get("/u/:id", (req, res) => {                                                               //gets the /u/:id page (which is a redirect)
  if (!urlDatabase[req.params.id]) {                                                            //checks if shortURL does NOT exist in our database
    res.status(404).send("Error 404: Page does not exist");
  } else {
    let longURL = urlDatabase[req.params.id].longURL;                                           //just declaring a variable so that the code is easier to read
    res.redirect(longURL);                                                                      //redirects ANY user to the actual page associated to the longURL
  }
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    let longURL = req.body.longURL;
    let id = generateRandomString();                                                            //does what the name says, see function above to see exactly what it does
    let userID = req.session.user_id;
    let newURL = {                                                                              //creates new user with the variables defined above
      "userID": userID,
      "shortURL": id,
      "longURL": longURL,
    };
    urlDatabase[id] = newURL;                                                                   //adds the new url to the url database
    res.redirect("/urls/" + id);                                                                //brings you to the urls_show.ejs associated to the new shortURL
  } else {
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  }
});

app.post("/urls/:id", (req, res) => {                                                           //edit the longURL
  if (req.session.user_id === urlDatabase[req.params.id].userID) {                              //checks if current user is associated to the shortURL
    let longURL = req.body.longURL;                                                             //assigns a variable to the text in the textarea of the urls_show.ejs form
    let shortURL = req.params.id;                                                               //assigns a temporary variable to the shortURL in the address bar
    urlDatabase[shortURL].longURL = longURL                                                     //assigns the new edited longURL to the shortURL from the address bar
    res.redirect("/urls");                                                                      //redirects the user to the "home" page
  } else if (!req.session.user_id){                                                             //checks if not logged in
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {                                                                                      //checks if user does NOT own the shortURL
    res.status(403).send("Error 403: You do not have access to this page!");
  }
});

app.post("/urls/:id/delete", (req, res) => {                                                    //delete the url and all its keys from the database
  if (req.session.user_id === urlDatabase[req.params.id].userID) {
    delete urlDatabase[req.params.id]                                                           //deletes the shortURL object and all its keys from urlDatabase
    res.redirect("/urls");                                                                      //then "refreshes" the page
  } else if (!req.session.user_id){                                                             //checks if user is logged in
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {                                                                                      //otherwise (if the user is logged in but does not own the url)
    res.status(403).send("Error 403: You do not have access to this page!");
  }
});

app.get("/login", (req, res) => {                                                               //gets the login page
  if (req.session.user_id) {                                                                    //if the user is already logged in
    res.redirect("/urls");                                                                      //bring them to the "home" page
  } else {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    };
  res.render("urls_login", templateVars);                                                       //display the urls_login.ejs page and let it access the templateVars object
  }
});

app.get("/register", (req, res) => {                                                            //gets the register page
  if (req.session.user_id) {                                                                    //if the user is already logged in
    res.redirect("/urls");                                                                      //bring them to the "home" page
  } else {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    };
    res.render("urls_register", templateVars);                                                  //display the urls_register.ejs page and let it access the templateVars object
  }
});

app.post("/login", (req, res) => {                                                              //executes when the form on the "/login" page is submitted
  let email = req.body.email;                                                                   //pulls email from the form
  let password = req.body.password;                                                             //pulls the password from the form
  let loginID = signInCheck(email, password);                                                   //declares variable associated to a function defined above with 2 arguments
  if (loginID) {                                                                                //if variable is a user(true)
    req.session.user_id = loginID;                                                              //set the cookie for this user
    res.redirect("/urls");
  } else {                                                                                      //otherwise
    res.status(403).send("Error 403 Email or Password do not match");                           //return appropriate error message (uses same error message for email and password so that it's harder to "hack")
  }
});

app.post("/register", (req, res) => {                                                           //executes when form is submitted on the "/register" page
  let email = req.body.email;                                                                   //pulls email from the form
  let password = req.body.password;                                                             //pulls password from the form
  let ident = "user" + generateRandomString();                                                  //assigns a random "id" to the user with function defined above
  let hashedPass = bcrypt.hashSync(password, 10);                                               //hashes the given password to make it harder to "hack"
  if (!password || !email ) {                                                                   //checks if one of the text areas are blank
     res.status(400);
     res.send("Empty form");
   } else if (uniqueEmail(email) === false) {                                                   //checks if email already exists with function defined above
     res.status(400);
     res.send("Email in use!");
   } else {
     const newUser = {                                                                          //declares a new user object
       id: ident,
       email: email,
       password: password,
       hashedPassword: hashedPass
     };
     users[ident] = newUser;                                                                    //adds the new registered user to the user database
     req.session.user_id = ident;                                                               //assigns cookie for this user
     res.redirect("/urls");                                                                     //brings user to the "home" page
   }
});

app.post("/logout", (req, res) => {                                                             //executes when the logout button in the header is submitted
  req.session = null;                                                                           //clears the cookie
  res.redirect("/urls");                                                                        //redirects to login page, which then gives an error, dont ask me why, it's what they want in the requirements
});

app.listen(PORT, () => {                                                                        //logs the port when the server is started
  console.log(`tinyApp listening on port ${PORT}`);                                             //has to use back tick
});
