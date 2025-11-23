import axios from "axios";

export const sendSMS = async (phone, message) => {
  try {
    const response = await axios.post(
      process.env.SMS_API_URL,
      {
        to: phone,
        from: process.env.SMS_SENDER_NAME,
        content: message,
      },
      {
        headers: {
          Authorization: `Basic ${process.env.SMS_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`SMS sent to ${phone}:`, response.data);
    return true;
  } catch (error) {
    console.error(`Failed to send SMS to ${phone}:`, error.response?.data || error.message);
    return false;
  }
};

