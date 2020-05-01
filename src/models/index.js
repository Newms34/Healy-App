const mongoose = require('mongoose');
require('./users');

//ADD_MODELS

console.log('Node Environment:', process.env.NODE_ENV || '(unknown)');
mongoose.connect(process.env.NODE_ENV && process.env.NODE_ENV == 'production' ? process.env.MONGODB_URI : 'mongodb://localhost:27017/MY-AWESOME-APP', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (e) {
    console.log('Database connected!');
});