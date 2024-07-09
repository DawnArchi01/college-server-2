const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require('dotenv')
dotenv.config({ path: './config.env'})
const corsOptions = require('./config/corsOptions')
app.use(express.json());
const cors = require("cors");

app.use(cors(corsOptions))

const bcrypt = require("bcryptjs");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use("/files", express.static("files"))


const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_KEY
const mongoUrl = process.env.MONGO_URL
// console.log(mongoUrl)

mongoose.set('strictQuery', false)
mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true
    // tlsAllowInvalidCertificates: true,
  })
  .then(() => {
    console.log("Connected to database");
  })
  .catch((e) => console.log(e));

app.listen(5000, () => {
    console.log("Server Started");
  });

require("./userDetails");

const User = mongoose.model("UserInfo");

const multer = require('multer') ;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './files')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now()
    cb(null, uniqueSuffix+file.originalname)
  }
})

const upload = multer({ storage: storage })

app.post("/register", upload.single("file"), async (req, res) => {
  const { fname, lname, email, password, userType } = req.body;

  const pdf = req.file? req.file.filename : null

  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.json({ error: "User Exists" });
    }
    await User.create({
      fname,
      lname,
      email,
      password: encryptedPassword,
      userType,
      pdf: pdf
    });
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error" });
  }
});

app.post("/login-user", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ error: "User Not found" });
  }
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ email: user.email }, JWT_SECRET, {
      expiresIn: "15m",
    });

    if (res.status(201)) {
      return res.json({ status: "ok", data: token });
    } else {
      return res.json({ error: "error" });
    }
  }
  res.json({ status: "error", error: "Invalid Password" });
});

app.post("/userData", async (req, res) => {
  const { token } = req.body;
  try {
    const user = jwt.verify(token, JWT_SECRET, (err, res) => {
      if (err) {
        return "token expired";
      }
      return res;
    });
    console.log(user);
    if (user === "token expired") {
      return res.send({ status: "error", data: "token expired" });
    }

    const useremail = user.email;
    User.findOne({ email: useremail })
      .then((data) => {
        res.send({ status: "ok", data: data });
      })
      .catch((error) => {
        res.send({ status: "error", data: error });
      });
  } catch (error) { }
});


app.get("/getAllUser", async (req, res) => {
  try {
    const allUser = await User.find({});
    res.send({ status: "ok", data: allUser });
  } catch (error) {
    console.log(error);
  }
});

app.post("/deleteUser", async (req, res) => {
  const { userid } = req.body;
  try {
    User.deleteOne({ _id: userid }, function (err, result) {
      if (err) {
        console.log(err);
        return res.status(500).json({ status: "Error", data: "Internal Server Error" });
      }
      
      console.log(result);
      res.send({ status: "Ok", data: "Deleted Successfully" });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});


app.post("/updateUser", upload.single("file"), async (req, res) => {
  const { id, fname, lname } = req.body;

  const pdf = req.file ? req.file.filename : null

  try {

    await User.updateOne({ _id: id }, {
      $set:{
        fname: fname,
        lname: lname,
        pdf: pdf
      }
    });
    return res.json({ status: "ok", data: "updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", data: error });
  }
});




