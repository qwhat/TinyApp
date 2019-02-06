const express = require("express");
const app = express();
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const uuidv4 = require("uuid/v4");
const bcrypt = require("bcrypt");

//declares port number where the app will run
const PORT = 3001;

//encrypts the cookie values
app.use(cookieSession({
  name: "session",
  //these are very easy keys but will do for this project
  keys: ["key1", "key2"]
}));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));

/* -------------------------------------------------------------- CUSTOM FUNCTIONS -------------------------------------------------------------- */

//uses the uuid dependency to generate a random 6 character string
function generateRandomString() {
  return uuidv4().substr(0, 6);
};

//creates a filtered version of the urlDatabase for user who's id matches the userID in the url object
function urlsForUser(id) {
  let filtered = {};
  for (url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      filtered[url] = urlDatabase[url]
    }
  }
  return filtered;
};

//checks if the users email AND password in the user database
function signInCheck(email, password) {
  for (let user in users) {
    if (users[user].email === email) {
      //compare the input password with our hashed password using the bcrypt dependency
      if (bcrypt.compareSync(password, users[user].hashedPassword)) {
        return users[user].id;
      }
      return false;
    }
  }
  return false;
};

//checks if the email exists in our database
function uniqueEmail(email) {
  for (let user in users) {
    //if the given email(during signup) exists in our database
    if (users[user].email === email) {
      //give false (not unique)
      return false;
    }
  }
  //give true (unique)
  return true;
};

/* -------------------------------------------------------------- DATABASES -------------------------------------------------------------- */

//hardcoded user database
const users = {
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

//hardcoded url database
const urlDatabase = {
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

//gets the "/" page(just a redirect)
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

//gets the urls_index.ejs "home" page
app.get("/urls", (req, res) => {
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

//gets the urls_new.ejs page to create new shortURLS
app.get("/urls/new", (req, res) => {
  let templateVars = {
    users: users,
    user: users[req.session.user_id],
    urls: urlsForUser(req.session.user_id),
  };
  if (req.session.user_id) {
    res.render("urls_new", templateVars);
  } else {
    //the project requirements want this to be the only page that redirects to login instead of giving an error message
    res.redirect("/login");
  }
});

//gets the urls_show.ejs page, :id is equal to whatever shortURL comes after /urls/ in the address bar
app.get("/urls/:id", (req, res) => {

  //checks if shortURL exists in our database AND if it belongs to the current user
  if (urlDatabase[req.params.id] && req.session.user_id === urlDatabase[req.params.id].userID) {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id].longURL,
      urls: urlsForUser(req.session.user_id),
    };
    res.render("urls_show", templateVars);
    //checks if the shortURL does NOT exist in our database
  } else if (!urlDatabase[req.params.id]){
    res.status(404).send("Error 404: Page does not exist");
    //checks if the shortURL exists AND does NOT belong to the current user
  }  else if (req.session.user_id && req.session.user_id !== urlDatabase[req.params.id].userID){
    res.status(403).send("Error 403: You do not have access to this page!");
  } else if (!req.session.user_id){
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {
    res.status(500).send("Error 500: Great, you broke it.");
  }
});

//gets the /u/:id page (which is a redirect)
app.get("/u/:id", (req, res) => {
  //checks if shortURL does NOT exist in our database
  if (!urlDatabase[req.params.id]) {
    res.status(404).send("Error 404: Page does not exist");
  } else {
    let longURL = urlDatabase[req.params.id].longURL;
    //redirects ANY user to the actual page associated to the longURL
    res.redirect(longURL);
  }
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    let longURL = req.body.longURL;
    let id = generateRandomString();
    let userID = req.session.user_id;
    //creates new url with the variables defined above
    let newURL = {
      "userID": userID,
      "shortURL": id,
      "longURL": longURL,
    };
    //adds the new url to the url database
    urlDatabase[id] = newURL;
    res.redirect("/urls/" + id);
  } else {
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  }
});

//edit the longURL
app.post("/urls/:id", (req, res) => {
  //checks if current user is associated to the shortURL
  if (req.session.user_id === urlDatabase[req.params.id].userID) {
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

//delete the url and all its keys from the database
app.post("/urls/:id/delete", (req, res) => {
  if (req.session.user_id === urlDatabase[req.params.id].userID) {
    //deletes the shortURL object and all its keys from urlDatabase
    delete urlDatabase[req.params.id]
    res.redirect("/urls");
  } else if (!req.session.user_id){
    res.status(403).send("<html><body>you must be logged in, please <a href= '/login'>log in</a></body></html>");
  } else {
    res.status(403).send("Error 403: You do not have access to this page!");
  }
});

//gets the login page
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    };
  res.render("login", templateVars);
  }
});

//gets the register page
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    };
    res.render("register", templateVars);
  }
});

//executes when the form on the "/login" page is submitted
app.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  //declares variable associated to a function defined above with 2 arguments
  let loginID = signInCheck(email, password);
  if (loginID) {
    req.session.user_id = loginID;
    res.redirect("/urls");
  } else {
    res.status(403).send("Error 403 Email or Password do not match");
  }
});

//executes when form is submitted on the "/register" page
app.post("/register", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let user_ID = "user" + generateRandomString();
  //hashes the given password to make it harder to "hack"
  let hashedPass = bcrypt.hashSync(password, 10);
  if (!password || !email ) {
     res.status(400);
     res.send("Empty form");
   } else if (uniqueEmail(email) === false) {
     res.status(400);
     res.send("Email in use!");
   } else {
     const newUser = {
       id: user_ID,
       email: email,
       password: password,
       hashedPassword: hashedPass
     };
     //adds the new registered user to the user database
     users[user_ID] = newUser;
     req.session.user_id = user_ID;
     res.redirect("/urls");
   }
});

//executes when the logout button in the header is submitted
app.post("/logout", (req, res) => {
  //clears the cookie
  req.session = null;
  //redirects to login page, which then gives an error, dont ask me why, it's what they want in the requirements
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`tinyApp listening on port ${PORT}`);
});
