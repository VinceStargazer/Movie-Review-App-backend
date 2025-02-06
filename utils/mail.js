const SibApiV3Sdk = require('sib-api-v3-sdk');;

exports.generateOTP = (len = 6) => {
  let OTP = "";
  for (let i = 0; i < len; i++) {
    OTP += Math.round(Math.random() * 9);
  }
  return OTP;
};

exports.sendEmail = async (subject, htmlContent, email, name) => {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = process.env.SENDIN_BLUE_KEY;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.to = [{ email, name }];
  sendSmtpEmail.sender = {
    name: "Movie Review App",
    email: process.env.OFFICIAL_EMAIL,
  };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};
