const express = require('express');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));  // Serve frontend files

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_PASSKEY,
  MPESA_SHORTCODE,
  MPESA_ACCOUNT_REF,
  MPESA_CALLBACK_URL,
  MPESA_BASE_URL
} = process.env;

async function getAccessToken() {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return response.data.access_token;
}

app.post('/stkpush', async (req, res) => {
  const { phone, amount } = req.body;
  try {
    const accessToken = await getAccessToken();
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const stkPushRequest = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: MPESA_ACCOUNT_REF,
      TransactionDesc: 'Baynex Payment'
    };

    const response = await axios.post(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, stkPushRequest, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/callback', (req, res) => {
  console.log('Callback:', JSON.stringify(req.body, null, 2));
  res.json({ resultCode: 0, resultDesc: 'Accepted' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Baynex M-PESA server running on ${PORT}`));
