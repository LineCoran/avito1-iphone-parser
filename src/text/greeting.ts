// ts-nocheck
// @ts-nocheck
import { Context } from 'telegraf';
import createDebug from 'debug';
import { dataBaseBySku, getChatId, jobProcess, url } from './helpers';

let interval = {}
const debug = createDebug('bot:greeting_text');

const start = () => async (ctx: Context) => {
  const chatId = getChatId(ctx);

  if (interval[chatId]) {
    await ctx.sendMessage('Процесс уже запущен. Чтобы начать заново, для начала, остановите процесс c помощью команды /stop')
    return;
  }
  debug('Triggered "greeting" text command');
  const userName = `${ctx.message?.from.first_name} ${ctx.message?.from.last_name}`;
  await ctx.sendMessage(`Привет, ${userName}.\nБот настроен на поиск новых объявлений 1 раз в 60 секунд по ссылке ${url} \nЧтобы остановить процесс - введи команду /stop`)
  await jobProcess(ctx)

  //@ts-ignore
  interval[chatId] = setInterval(async () => {
    await jobProcess(ctx)
    Object.keys(dataBaseBySku).forEach(chatId=> {
      const countProducts = Object.keys(dataBaseBySku[chatId]).length;
      console.log(`Чат: ${chatId}; Товаров: ${countProducts}`)
    })
  }, 60000);
};

const stopJob = () => async (ctx: Context) => {

  const chatId = getChatId(ctx);

  if (interval[chatId]) {
    clearInterval(interval[chatId])
    await ctx.sendMessage('Парсинг остановлен. Напишите команду /start чтобы возобновить процесс.');
  }
  interval[chatId] = null
};

export { start, stopJob };
