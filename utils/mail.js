const nodemailer = require('nodemailer');

exports.generateOTP = (len = 6) => {
    let OTP = "";
    for (let i = 0; i < len; i++) {
        OTP += Math.round(Math.random() * 9);
    }
    return OTP;
};

exports.createMailTransport = () => {
    return nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: process.env.MAILTRAP_USER,
            pass: process.env.MAILTRAP_PASS
        }
    });
};
