import { Context } from 'telegraf';
import createDebug from 'debug';
import { jobProcess, url } from './helpers';
import Redis from 'ioredis';

let interval: number | null = null;
const debug = createDebug('bot:greeting_text');

// const redis = new Redis({
//   url: process.env.REDIS_HOST,
//   port: Number(process.env.REDIS_PORT || 6379),
//   password: process.env.REDIS_PASSWORD || undefined,
// });


console.log('host', process.env.REDIS_HOST);
const client = new Redis(`${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`, { password: process.env.REDIS_PASSWORD });


// const redis = new Redis({
//   url: 'https://trusting-imp-52000.upstash.io',
//   token: '********',
// })

const start = () => async (ctx: Context) => {
  debug('Triggered "greeting" text command');
  const userName = `${ctx.message?.from.first_name} ${ctx.message?.from.last_name}`;
  await ctx.sendMessage(`Привет, ${userName}.\nБот настроен на поиск новых объявлений 1 раз в 60 секунд по ссылке ${url} \nЧтобы остановить процесс - введи команду /stop`)
  // await jobProcess(ctx)

  //@ts-ignore
  await client.set('isParsing', 'true');
  // interval = setInterval(async () => {
  await jobProcess(ctx)
  // }, 30000);
};

const stopJob = () => async (ctx: Context) => {

  await client.set('isParsing', 'false');
  await ctx.sendMessage('Парсинг остановлен. Напишите команду /start чтобы возобновить процесс.');
  // if (interval) {
    // clearInterval(interval)

  // }
  // interval = null
};

const cronJob = async () => {
  debug('Executing CRON job');

  const isParsing = await client.get('isParsing');
  if (isParsing === 'true') {
    debug('Job process is active, executing...');
    // Например, создать mock контекст для выполнения jobProcess
    const ctx = {}; // Создайте "заменитель" реального контекста, если требуется
    await jobProcess(ctx as Context);
  } else {
    debug('Job process is not active, skipping...');
  }
};

export { start, stopJob, cronJob };
