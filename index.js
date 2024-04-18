const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const rateLimit = require('express-rate-limit');
const expressSwagger = require('express-swagger-generator');
const cache = require('memory-cache');

const connection = mongoose.connect(
  "mongodb+srv://Faisalpinitod:faisal@cluster0.y2f7t.mongodb.net/crashcourse-1?retryWrites=true&w=majority");

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    createdAt: { type: Date, default: Date.now }
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

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);


const cacheMiddleware = (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = cache.get(key);
    if (cachedBody) {
        res.send(cachedBody);
        return;
    } else {
        res.sendResponse = res.send;
        res.send = (body) => {
            cache.put(key, body);
            res.sendResponse(body);
        };
        next();
    }
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


app.get('/api/analytics', authenticateJWT, async (req, res) => {
    try {
        const pipeline = [
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            }
        ];

        const analyticsData = await User.aggregate(pipeline);
        const formattedData = analyticsData.map(item => ({
            month: moment({ year: item._id.year, month: item._id.month - 1 }).format('MMMM YYYY'),
            count: item.count
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



const options = {
    swaggerDefinition: {
        info: {
            description: 'User API documentation',
            title: 'User API',
            version: '1.0.0'
        },
        host: `localhost:${PORT}`,
        basePath: '/',
        produces: ['application/json'],
        schemes: ['http']
    },
    basedir: __dirname, // App absolute path
    files: ['./inex.js'] // Path to the API handle folder
};
expressSwagger(options);



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


