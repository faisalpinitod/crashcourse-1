const express = require("express");
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');

const connection = mongoose.connect(
  "mongodb+srv://Faisalpinitod:faisal@cluster0.y2f7t.mongodb.net/crashcourse-1?retryWrites=true&w=majority");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number,
});
const User = mongoose.model("User", userSchema);

const app = express();
app.use(express.json());



app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Authentication middleware
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, 'MASAI', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        req.user = user;
        next();
    });
};




// CRUD routes
app.post('/api/users', (req, res) => {
    const newUser = new User(req.body);
    newUser.save((err, user) => {
        if (err) {
            return res.status(400).json(err);
        }
        res.status(201).json(user);
    });
});

app.get('/api/users', authenticateJWT, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    User.find()
        .skip(skip)
        .limit(limit)
        .exec((err, users) => {
            if (err) {
                return res.status(500).json(err);
            }
            res.json(users);
        });
});

app.get('/api/users/:userId', authenticateJWT, (req, res) => {
    User.findById(req.params.userId, (err, user) => {
        if (err) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    });
});

app.put('/api/users/:userId', authenticateJWT, (req, res) => {
    User.findByIdAndUpdate(req.params.userId, req.body, { new: true }, (err, user) => {
        if (err) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    });
});

app.delete('/api/users/:userId', authenticateJWT, (req, res) => {
    User.findByIdAndDelete(req.params.userId, (err, user) => {
        if (err) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(204).end();
    });
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await connection;
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
  console.log(`Server is running on port ${PORT}`);
});
