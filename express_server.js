var express = require("express");
var app = express();
var cookieParser = require('cookie-parser');
var PORT = 3001;
const uuidv4 = require('uuid/v4');

app.use(cookieParser());
app.set("view engine", "ejs");

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
    username: req.cookies["username"],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    username: req.cookies["username"],
    urls: urlDatabase
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    username: req.cookies["username"],
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

app.post("/login", (req, res) => {
  let user = req.body.username
  res.cookie("username", user)
  res.redirect('/urls')
})

app.post("/logout", (req, res) => {
  res.clearCookie("username");
  res.redirect("/urls");
})


function generateRandomString() {
  return uuidv4().substr(0, 6)
}
