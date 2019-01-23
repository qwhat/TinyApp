var express = require("express");
var app = express();
var cookieParser = require('cookie-parser');
var PORT = 3001;
const uuidv4 = require('uuid/v4');

app.use(cookieParser());
app.set("view engine", "ejs");

const users = {
  "bruceWayne": {
    id: "bruceWayne",
    email: "batman@hotmail.com",
    password: "imBatman"
  },
 "clarkKent": {
    id: "clarkKent",
    email: "superman@hotmail.com",
    password: "imSuperman"
  }
}

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
  "cd11e9": "http://www.youtube.ca"
};

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", (req, res) => {
  res.send("IT\'S ALIVE!!!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});


app.post("/urls/:id/delete", (req, res) => {
  let urlId = req.params.id
  delete urlDatabase[req.params.id]
  res.redirect("/urls")
});

app.get("/urls", (req, res) => {
  let templateVars = {
    user: req.cookies["user_id"],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: req.cookies["user_id"],
    urls: urlDatabase
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    user: req.cookies["user_id"],
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
  };

  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = req.params.id;
  urlDatabase[shortURL] = longURL
  res.redirect("/urls")
});

app.post("/urls", (req, res) => {
  let longURL = req.body.longURL
  let shortURL = generateRandomString()
  urlDatabase[shortURL] = longURL;
  res.redirect('/urls/' + shortURL);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/login", (req, res) => {
  let templateVars = {
    user: req.cookies["user_id"],
    urls: urlDatabase
  };
  res.render("urls_login", templateVars)
})

app.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let loginID = signInCheck();
  if (loginID) {
    res.cookie("user_id", loginID).redirect('/urls');
  } else {
    res.status(403).send('Error 403 somethings wrong :(');
  }


  function signInCheck() {
    for (let user in users) {
      if (users[user].email === email) {
        if (users[user].password === password) {
          return users[user].id;
        }
        return false;
      }
    }
    return false;
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
})

app.get("/register", (req, res) => {
  let templateVars = {
    user: req.cookies["user_id"],
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
  };
  res.render("urls_register", templateVars)
})

app.post("/register", (req, res) => {
  let email = req.body.email
  let password = req.body.password
  let ident = "user" + generateRandomString()
  const newUser = {
    "id": ident,
    "email": email,
    "password": password,
  }
  if (!password || !email ) {
     res.status(400);
     res.send('Empty form');
   } else if (uniqueEmail() === false) {
     res.status(400);
     res.send('Email in use!');
   } else {
     users[ident] = newUser;
     res.cookie("user_id", ident);
     res.redirect(`/urls`);
   }

   function uniqueEmail() {
     for (let user in users) {
       if (users[user].email === email) {
         return false;
       }
     }
     return true;
   }
});

function generateRandomString() {
  return uuidv4().substr(0, 6)
}
