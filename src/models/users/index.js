const mongoose = require('mongoose'),
    crypto = require('crypto');

const usrSchema = new mongoose.Schema({
    user: String, //(user)name of the user,
    displayName: { type: String, default: null },//the name they wanna be called by (if not null)
    pass: String,
    salt: String,
    email: String,
    googleId: String,
    lastAction: { type: Number, default: Date.now() },
    lastLogin: { type: Number, default: 0 },
    oldLastLogin: { type: Number, default: 0 },
    reset: String,
    avatar: { type: String, default: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHEAAACNCAIAAAAPTALlAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAANsSURBVHhe7dVRduIwEETR7GkWmK1HhMch9giw1dWyZNf9mZwM2F3vJ1//TM1N9dxUz0313FTPTfVGb/r9Fh8azIhNCbYTXx7AWE3JE8CDDjVEU3pI8egjHN+UBgl4QXdHNmV6Ml7W0WFNWdwFr+zlgKYM7Y7X5+vdlH0H4YhkXZuy7FCckqlfUzYNgIPSdGrKmmFwVo6LNi24LEGPpowYDMclSG/KgiFxotqlmxZcKZXblMMHxqFSiU25enicq+OmN1wsktWUYyfB0SJuesPRIilNuXQqnK7gpuB0BX1TbpwQA8Lc9IkBYW66wIYYcVNOmxYzYtx0gRkxbrrAjBhlU+6aHGMC3HSNMQFuusaYADddY0yAm64xJsBNK9jTStaUc06BSa3ctIJJrdy0gkmt3LSCSa3ctIJJrdy0gkmt3LSCSa3ctIJJrdy0gkmt3LSCSa3ctIJJrWRNCy6aH3tauekaYwLcdI0xAW66xpgAN11jTICbrjEmQNm04K5pMSPGTReYEeOmC8yIcdMFZsSImxZcNyEGhLnpEwPC9E0LbpwKpyu4KThdIaVpwaWT4GgRN73haBE3veFokaymBfcOj3N1EpsWXD0wDpVyU73cpgW3D4kT1dKbFiwYDMcl6NG0YMdIuCzBRZtyVo5OTQvWDICD0vRrWrDpUJySqWvTgmUH4YhkvZsW7OuO1+e7SlPe3cXl/kZxTaZOTRk0Bm5Kk96UHePhvgS5TTl/YBwqldWUk2fAxTopTTl2HtwtIm7KjXNiQ5iyKafNjCUxsqYcNT/2BGiacs5ZsKqVoCmHnAvbmkSbcsIZsXC/UFNefl7s3Km9Ka89O9bu0diUF14DmzdracqrroTl27jpJizfZndTXnI97N9gX1Mef1VU+GRHUx58bbR4y033ocVbW5vySNuQdVNTHmYPdHnBTVvQ5YXPTXmMLVGnxk0bUafmQ1MeYDU0+s+7pnzVXqPUkpuGUGrpZVO+ZJ/Q6w83jaLXH24qQLKHelM+a9tQ7cFNBaj2UGnKB20P2v1yUw3a/Vo35SO2HwXdVIiCbipEwVVT/tNa3TO6qdI9o5sq3TO6qVjJ+GzK7yymlHRTsVLSTcVKSZryC1NwUz031XNTPTfVuzXlRxNxUz031XNTPTfVc1M9N9VzU70v/jWV7+8ffZYE08zo+Y8AAAAASUVORK5CYII=' }, //base64 avatar. default is a blank image
    isBanned: {
        type: String,
        default: null
    },
    locked: {
        type: Boolean,
        default: false
    },
    mod: {
        type: Boolean,
        default: false
    }, //mods can ban/unban
    superMod:{
        type:Boolean,
        default:false,
    },
    wrongAttempts: { type: Number, default: 0 },

}, {
    collection: 'User'
});

// usrSchema.plugin(passportLocalMongoose, {
//     usernameField: 'user',
//     hashField: 'pass',
//     lastLoginField: 'lastLogin'
// });
const generateSalt = function () {
    return crypto.randomBytes(16).toString('base64');
},
    encryptPassword = function (txt, salt) {
        const plainText = txt.toString();
        // console.log('PASSWORD', plainText, salt);
        const hash = crypto.createHash('sha1');
        hash.update(plainText);
        hash.update(salt);
        return hash.digest('hex');
    };
usrSchema.statics.generateSalt = generateSalt;
usrSchema.statics.encryptPassword = encryptPassword;
usrSchema.methods.correctPassword = function (candidatePassword) {
    // console.log('slt', this.salt, 'and their pwd:', this.pass);
    return encryptPassword(candidatePassword, this.salt) === this.pass;
};

const User = mongoose.model('User', usrSchema);
module.exports = User;