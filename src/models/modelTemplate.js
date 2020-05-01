const mongoose = require('mongoose');

const ModelNameSchema = new mongoose.Schema({
    propertyOne: String,
    propertyTwo: Boolean
}, {
    collection: 'ModelName'
});

const ModelName = mongoose.model('ModelName', ModelNameSchema);
module.exports = ModelName;