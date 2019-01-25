const express = require("express");
const app = express();
const PORT = 3001;
const bodyParser = require("body-parser");
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');


app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));

app.listen(PORT, () => {
  console.log(`tinyApp listening on port ${PORT}`);
});

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


app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {
  if (req.session.user_id) {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      urls: urlsForUser(req.session.user_id),
    }
    res.render("urls_index", templateVars);
  } else {
    res.status(403).send('<html><body>you must be logged in, please <a href= "/login">log in</a></body></html>');
  }
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    users: users,
    user: users[req.session.user_id],
    urls: urlsForUser(req.session.user_id),
  };
  if (req.session.user_id) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:id", (req, res) => {

  if (urlDatabase[req.params.id] && req.session.user_id === urlDatabase[req.params.id].userID) {
    let templateVars = {
      users: users,
      user: users[req.session.user_id],
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id].longURL,
      urls: urlsForUser(req.session.user_id),
    };
    res.render("urls_show", templateVars);
  } else if (!urlDatabase[req.params.id]){
    res.status(404).send('Error 404: Page does not exist');
  }  else if (req.session.user_id && req.session.user_id !== urlDatabase[req.params.id].userID){
    res.status(403).send('Error 403: You do not have access to this page!');
  } else if (!req.session.user_id){
    res.status(403).send('<html><body>you must be logged in, please <a href= "/login">log in</a></body></html>');
  } else {
    res.status(500).send('Error 500: Great, you broke it.');
  }
});

app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    res.status(404).send('Error 404: Page does not exist');
  } else {
    let longURL = urlDatabase[req.params.id].longURL;
    res.redirect(longURL);
  }
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    let longURL = req.body.longURL;
    let id = generateRandomString();
    let userID = req.session.user_id;
    let newURL = {
      "userID": userID,
      "shortURL": id,
      "longURL": longURL,
    };
    urlDatabase[id] = newURL;
    res.redirect('/urls/' + id);
  } else {
    res.status(403).send('<html><body>you must be logged in, please <a href= "/login">log in</a></body></html>');
  }
});

app.post("/urls/:id", (req, res) => {
  if (req.session.user_id === urlDatabase[req.params.id].userID) {
    let longURL = req.body.longURL;
    let shortURL = req.params.id;
    urlDatabase[shortURL].longURL = longURL
    res.redirect("/urls");
  } else if (!req.session.user_id){
    res.status(403).send('<html><body>you must be logged in, please <a href= "/login">log in</a></body></html>');
  } else {
    res.status(403).send('Error 403: You do not have access to this page!');
  }
});

app.post("/urls/:id/delete", (req, res) => {
  if (req.session.user_id === urlDatabase[req.params.id].userID) {
    delete urlDatabase[req.params.id]
    res.redirect("/urls");
  } else if (!req.session.user_id){
    res.status(403).send('<html><body>you must be logged in, please <a href= "/login">log in</a></body></html>');
  } else {
    res.status(403).send('Error 403: You do not have access to this page!');
  }
});

app.get("/login", (req, res) => {
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

app.get("/register", (req, res) => {
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

app.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let loginID = signInCheck(email, password);
  if (loginID) {
    req.session.user_id = loginID;
    res.redirect('/urls');
  } else {
    res.status(403).send('Error 403 Email or Password do not match');
  }
});

app.post("/register", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let ident = "user" + generateRandomString();
  let hashedPass = bcrypt.hashSync(password, 10);
  if (!password || !email ) {
     res.status(400);
     res.send('Empty form');
   } else if (uniqueEmail(email) === false) {
     res.status(400);
     res.send('Email in use!');
   } else {
     const newUser = {
       id: ident,
       email: email,
       password: password,
       hashedPassword: hashedPass
     };
     users[ident] = newUser;
     req.session.user_id = ident;
     res.redirect(`/urls`);
   }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

function generateRandomString() {
  return uuidv4().substr(0, 6);
};
function urlsForUser(id) {
  let filtered = {};
  for (url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      filtered[url] = urlDatabase[url];
    }
  }
  return filtered;
};
function signInCheck(email, password) {
  for (let user in users) {
    if (users[user].email === email) {
      if (bcrypt.compareSync(password, users[user].hashedPassword)) {
        return users[user].id;
      }
      return false;
    }
  }
  return false;
};
function uniqueEmail(email) {
  for (let user in users) {
    if (users[user].email === email) {
      return false;
    }
  }
  return true;
};
