import 'dotenv/config';
import pkg from '@woocommerce/woocommerce-rest-api';
const WooCommerceRestApi = pkg.default;
import TelegramBot from 'node-telegram-bot-api';

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOO_URL, 
  consumerKey: process.env.WOO_CONSUMER_KEY,
  consumerSecret: process.env.WOO_CONSUMER_SECRET,
  version: 'wc/v3'
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

function generateUniqueCouponCode() {
  const baseCode = "SALE";
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `${baseCode}-${randomSuffix}`;
}

async function createCoupon() {
  const couponCode = generateUniqueCouponCode();
  const data = {
    code: couponCode,
    discount_type: "percent",
    amount: "10",
    individual_use: true,
    exclude_sale_items: true,
    minimum_amount: "100.00"
  };

  try {
    const response = await WooCommerce.post("coupons", data);
    return response.data;
  } catch (error) {
    throw error;
  }
}

bot.onText(/\/createcoupon/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const coupon = await createCoupon();
    await bot.sendMessage(chatId, `Coupon created: ${coupon.code}`);
  } catch (error) {
    await bot.sendMessage(chatId, 'Failed to create coupon.');
  }
});
