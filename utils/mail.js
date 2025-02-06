const brevo = require('@getbrevo/brevo');

exports.generateOTP = (len = 6) => {
  let OTP = "";
  for (let i = 0; i < len; i++) {
    OTP += Math.round(Math.random() * 9);
  }
  return OTP;
};

exports.sendEmail = async (subject, htmlContent, email, name) => {
  const defaultClient = brevo.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = process.env.SENDIN_BLUE_KEY;
  const apiInstance = new brevo.TransactionalEmailsApi();
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.to = [{ email, name }];
  sendSmtpEmail.sender = {
    name: "Movie Review App",
    email: process.env.OFFICIAL_EMAIL,
  };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};
