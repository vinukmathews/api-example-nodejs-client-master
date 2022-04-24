

var bodyParser = require('body-parser');


const express = require('express');
const app = express();
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

const api = require("./api.js")

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:false}));
const cookieSession = require('cookie-session');

app.use(cookieSession({
  name: 'session',
  keys: ['oauth2Token', 'caller'],
  maxAge: 10 * 60 * 60 * 1000 // 10 hours
}));


app.get("/userCall", api.hmrcapi)
app.post("/hmrcapi",api.hmrcrequest)

app.get('/oauth20/callback', api.hmrcauth)


// Helper functions


app.listen(8080, () => {
  console.log('Started at http://localhost:8080');
});