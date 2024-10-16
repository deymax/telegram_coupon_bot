import dotenv from 'dotenv';
dotenv.config();

import pkg from '@woocommerce/woocommerce-rest-api';
const WooCommerceRestApi = pkg.default;
import TelegramBot from 'node-telegram-bot-api';
import bcrypt from 'bcrypt';
import Redis from 'ioredis';

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOO_URL,
  consumerKey: process.env.WOO_CONSUMER_KEY,
  consumerSecret: process.env.WOO_CONSUMER_SECRET,
  version: 'wc/v3',
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
const redis = new Redis();

// Хеш перевіреного пароля, взятий з .env
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH!;

// Глобальний флаг для перевірки, чи користувач є адміністратором
const isAdminAuthenticated: Record<number, boolean> = {};

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
    minimum_amount: "100.00",
  };

  try {
    const response = await WooCommerce.post("coupons", data);
    return response.data;
  } catch (error) {
    throw error;
  }
}

function showMainMenu(chatId: number) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Create Coupon", callback_data: "create_coupon" },
          { text: "Help", callback_data: "help" }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, "Choose an option:", options);
}

bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "Please enter the admin password:");
  bot.once("message", async (msg: TelegramBot.Message) => {
    const password = msg.text;
    if (password) {
      const match = await bcrypt.compare(password, adminPasswordHash);
      isAdminAuthenticated[chatId] = match; // Зберігаємо статус адміністратора
      if (match) {
        await bot.sendMessage(chatId, "You are now authenticated as an admin.");
      } else {
        await bot.sendMessage(chatId, "Wrong password. Access denied.");
      }
    }
    // Показуємо меню незалежно від того, чи пароль правильний
    showMainMenu(chatId);
  });
});

// Обробка натискання кнопок
bot.on("callback_query", async (query: TelegramBot.CallbackQuery) => {
  const chatId = query.from.id;
  const action = query.data;

  if (action === "create_coupon") {
    if (!isAdminAuthenticated[chatId]) {
      await bot.sendMessage(chatId, "Only admins can create coupons.");
      return;
    }

    try {
      const coupon = await createCoupon();
      await bot.sendMessage(chatId, `Coupon created: ${coupon.code}`);
    } catch (error) {
      await bot.sendMessage(chatId, 'Failed to create coupon.');
    }
  } else if (action === "help") {
    await bot.sendMessage(chatId, "Use the Create Coupon button to generate a new coupon. Only authenticated admins can create coupons.");
  }
});

// Обробка текстових команд /create і /help
bot.onText(/\/create/, async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  if (!isAdminAuthenticated[chatId]) {
    await bot.sendMessage(chatId, "Only admins can create coupons.");
    return;
  }

  try {
    const coupon = await createCoupon();
    await bot.sendMessage(chatId, `Coupon created: ${coupon.code}`);
  } catch (error) {
    await bot.sendMessage(chatId, 'Failed to create coupon.');
  }
});

bot.onText(/\/help/, async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "Use /create to create a coupon (admins only) or /help for assistance.");
});

// Команда для показу меню
bot.onText(/\/menu/, (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  showMainMenu(chatId);
});
