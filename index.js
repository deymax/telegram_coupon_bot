import 'dotenv/config';
import pkg from '@woocommerce/woocommerce-rest-api';
const WooCommerceRestApi = pkg.default;
import fetch from 'node-fetch'; // For making HTTP requests to Telegram API

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOO_URL, 
  consumerKey: process.env.WOO_CONSUMER_KEY,
  consumerSecret: process.env.WOO_CONSUMER_SECRET,
  version: 'wc/v3'
});

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Function to send a message to a Telegram user
async function sendTelegramMessage(chatId, text) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
  return response.json();
}

// Function to generate a unique coupon code
function generateUniqueCouponCode() {
  const baseCode = "SALE";
  const randomSuffix = Math.floor(Math.random() * 10000); // Generate random 4-digit number
  return `${baseCode}-${randomSuffix}`;
}

// Function to create a WooCommerce coupon
async function createCoupon() {
  const couponCode = generateUniqueCouponCode();

  const data = {
    code: couponCode, // Use generated unique coupon code
    discount_type: "percent",
    amount: "10",
    individual_use: true,
    exclude_sale_items: true,
    minimum_amount: "100.00"
  };

  try {
    const response = await WooCommerce.post("coupons", data);
    console.log('Coupon created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating coupon:', error.response?.data || error.message);
    throw error;
  }
}

// Function to handle incoming messages from Telegram
async function handleIncomingMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;

  if (text.toLowerCase() === "/createcoupon") {
    try {
      const coupon = await createCoupon();
      await sendTelegramMessage(chatId, `Coupon created: ${coupon.code}`);
    } catch (error) {
      await sendTelegramMessage(chatId, 'Failed to create coupon.');
    }
  } else {
    await sendTelegramMessage(chatId, "Unknown command. Type /createcoupon to create a new coupon.");
  }
}

// Start polling Telegram for updates
async function startTelegramBot() {
  let offset = 0;

  while (true) {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${offset}`);
      const updates = await response.json();

      if (updates.result) {
        for (const update of updates.result) {
          offset = update.update_id + 1;
          if (update.message) {
            await handleIncomingMessage(update.message);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching updates:', error.message);
    }

    // Poll every 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

startTelegramBot();
