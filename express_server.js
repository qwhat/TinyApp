const express = require("express");
const app = express();
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const uuidv4 = require("uuid/v4");
const bcrypt = require("bcrypt");

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
  for (url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      filtered[url] = urlDatabase[url]
    }
  }
  return filtered;
};

function signInCheck(email, password) {                               //checks if the users email AND password in the user database
  for (let user in users) {
    if (users[user].email === email) {
      if (bcrypt.compareSync(password, users[user].hashedPassword)) { //compares the input password with our hashed password using the bcrypt deendency
        return users[user].id;
      }
      return false;
    }
  }
  return false;
};

function uniqueEmail(email) {                                         //checks if the email exists in our database
  for (let user in users) {
    if (users[user].email === email) {                                //if the given email(during signup) exists in our database
      return false;                                                   //give false (not unique)
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
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {                                                                //gets the urls_index.ejs "home" page
  if (req.session.user_id) {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    }
    res.render("urls_index", templateVars);
  } else {
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  }
});

app.get("/urls/new", (req, res) => {                                                            //gets the urls_new.ejs page to create new shortURLS
  let templateVars = {
    users: users,
    user: users[req.session.user_id],
    urls: urlsForUser(req.session.user_id),
  };
  if (req.session.user_id) {
    res.render("urls_new", templateVars);
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
    res.render("urls_show", templateVars);
  } else if (!urlDatabase[req.params.id]){                                                      //checks if the shortURL does NOT exist in our database
    res.status(404).send("Error 404: Page does not exist");
  }  else if (req.session.user_id && req.session.user_id !== urlDatabase[req.params.id].userID){//checks if the shortURL exists AND does NOT belong to the current user
    res.status(403).send("Error 403: You do not have access to this page!");
  } else if (!req.session.user_id){
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {
    res.status(500).send("Error 500: Great, you broke it.");
  }
});

app.get("/u/:id", (req, res) => {                                                               //gets the /u/:id page (which is a redirect)
  if (!urlDatabase[req.params.id]) {                                                            //checks if shortURL does NOT exist in our database
    res.status(404).send("Error 404: Page does not exist");
  } else {
    let longURL = urlDatabase[req.params.id].longURL;
    res.redirect(longURL);                                                                      //redirects ANY user to the actual page associated to the longURL
  }
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    let longURL = req.body.longURL;
    let id = generateRandomString();
    let userID = req.session.user_id;
    let newURL = {                                                                              //creates new url with the variables defined above
      "userID": userID,
      "shortURL": id,
      "longURL": longURL,
    };
    urlDatabase[id] = newURL;                                                                   //adds the new url to the url database
    res.redirect("/urls/" + id);
  } else {
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  }
});

app.post("/urls/:id", (req, res) => {                                                           //edit the longURL
  if (req.session.user_id === urlDatabase[req.params.id].userID) {                              //checks if current user is associated to the shortURL
    let longURL = req.body.longURL;
    let shortURL = req.params.id;
    urlDatabase[shortURL].longURL = longURL
    res.redirect("/urls");
  } else if (!req.session.user_id){
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {
    res.status(403).send("Error 403: You do not have access to this page!");
  }
});

app.post("/urls/:id/delete", (req, res) => {                                                    //delete the url and all its keys from the database
  if (req.session.user_id === urlDatabase[req.params.id].userID) {
    delete urlDatabase[req.params.id]                                                           //deletes the shortURL object and all its keys from urlDatabase
    res.redirect("/urls");
  } else if (!req.session.user_id){
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {
    res.status(403).send("Error 403: You do not have access to this page!");
  }
});

app.get("/login", (req, res) => {                                                               //gets the login page
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    };
  res.render("urls_login", templateVars);
  }
});

app.get("/register", (req, res) => {                                                            //gets the register page
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    };
    res.render("urls_register", templateVars);
  }
});

app.post("/login", (req, res) => {                                                              //executes when the form on the "/login" page is submitted
  let email = req.body.email;
  let password = req.body.password;
  let loginID = signInCheck(email, password);                                                   //declares variable associated to a function defined above with 2 arguments
  if (loginID) {
    req.session.user_id = loginID;
    res.redirect("/urls");
  } else {
    res.status(403).send("Error 403 Email or Password do not match");
  }
});

app.post("/register", (req, res) => {                                                           //executes when form is submitted on the "/register" page
  let email = req.body.email;
  let password = req.body.password;
  let ident = "user" + generateRandomString();
  let hashedPass = bcrypt.hashSync(password, 10);                                               //hashes the given password to make it harder to "hack"
  if (!password || !email ) {
     res.status(400);
     res.send("Empty form");
   } else if (uniqueEmail(email) === false) {
     res.status(400);
     res.send("Email in use!");
   } else {
     const newUser = {
       id: ident,
       email: email,
       password: password,
       hashedPassword: hashedPass
     };
     users[ident] = newUser;                                                                    //adds the new registered user to the user database
     req.session.user_id = ident;
     res.redirect("/urls");
   }
});

app.post("/logout", (req, res) => {                                                             //executes when the logout button in the header is submitted
  req.session = null;                                                                           //clears the cookie
  res.redirect("/urls");                                                                        //redirects to login page, which then gives an error, dont ask me why, it's what they want in the requirements
});

app.listen(PORT, () => {
  console.log(`tinyApp listening on port ${PORT}`);
});
