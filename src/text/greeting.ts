import { Context } from 'telegraf';
import createDebug from 'debug';
import axios from 'axios';
import { JSDOM } from 'jsdom';
const dayjs = require('dayjs');

let dataBaseBySku: Partial<Record<string, { title: string, link: string, price: string }>> = {};

// const agent = new SocksProxyAgent({
//   hostname: 'proxy_host', // IP-адрес вашего прокси
//   port: 9050,             // Порт прокси
// });

let interval: number | null = null;

const dayjsFormat = 'YYYY-MM-DD HH:mm:ss'

const debug = createDebug('bot:greeting_text');
let lastMsgId: number | null = null;

const url = 'https://www.avito.ru/sankt-peterburg/telefony/mobilnye_telefony/apple-ASgBAgICAkS0wA3OqzmwwQ2I_Dc?context=H4sIAAAAAAAA_0q0MrSqLraysFJKK8rPDUhMT1WyLrYys1LKzMvJzEtVsq4FBAAA__9-_ClVIgAAAA&geoCoords=59.939095%2C30.315868&presentationType=serp&s=104';
const root = 'https://www.avito.ru'

const parsingProcess = async (ctx: Context) => {

  const skip = Object.keys(dataBaseBySku).length === 0;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    // await ctx.sendMessage(`Статус ${response.status} ${response.statusText}`);
    let html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const items = document.querySelectorAll('[data-marker=item]');


    // await ctx.sendMessage(`Нашли: ${items.length}`)

    const newItems: string[] = []

    Array.from(items).forEach(item => {
      const id = item.getAttribute('data-item-id');
      const linkNode = item.querySelector('a[data-marker=item-title]')
      const link = `${root}${linkNode?.getAttribute('href')}` || '';
      const title = item.querySelector('h3')?.innerHTML || '';
      const price = item.querySelector('p[data-marker=item-price]')?.querySelector('meta[itemprop=price]')?.getAttribute('content') || '';
      const currency = item.querySelector('p[data-marker=item-price]')?.querySelector('meta[itemprop=priceCurrency]')?.getAttribute('content') || '';
      if (id && !dataBaseBySku[id]) {
        dataBaseBySku[id] = { link, title, price: `${Number(price).toLocaleString('ru-RU')} ${currency}` }
        newItems.push(id);
      }
    })

    return skip ? [] : newItems;
  } catch (e) {
    throw `Произошла ошибка ${e}`
  }
}

const jobProcess = async (ctx: Context) => {
  try {

    const newItemsIds = await parsingProcess(ctx)

    if (!newItemsIds.length) {
      const infoMessage = `Новых товаров пока нет.\nПоследнее время проверки:\n${dayjs().format(dayjsFormat)}`
      if (lastMsgId) {
        // @ts-ignore
        await ctx.editMessageText(infoMessage,{ message_id: lastMsgId });
      } else {
        const message = await ctx.sendMessage(infoMessage)
        lastMsgId = message.message_id
      }
      return
    }
    if (newItemsIds.length) {
      let msg = '<strong>Новые товары: </strong>\n'
      newItemsIds.forEach(id => {
        const item = dataBaseBySku[id];
        if (item) {
          const { title, link, price } = item
          const itemMsg = `<a href="${link}"><b>${title}</b></a> <b>- ${price}</b>\n`
          msg += itemMsg;
        }
      })

      msg+=`Время проверки: ${dayjs().format(dayjsFormat)}`;
      lastMsgId = null
      await ctx.replyWithHTML(msg);
    }
  } catch (e) {
    await ctx.sendMessage(`Произошла ошибка. Обратитесь в поддержку. Error: ${e}`)
  }
}

const start = () => async (ctx: Context) => {
  debug('Triggered "greeting" text command');
  const userName = `${ctx.message?.from.first_name} ${ctx.message?.from.last_name}`;
  await ctx.sendMessage(`Привет, ${userName}.\nБот настроен на поиск новых объявлений 1 раз в 60 секунд по ссылке ${url} \nЧтобы остановить процесс - введи команду /stop`)
  await jobProcess(ctx)

  //@ts-ignore
  interval = setInterval(async () => {
    await jobProcess(ctx)
  }, 30000);
};

const stopJob = () => async (ctx: Context) => {

  if (interval) {
    clearInterval(interval)
    await ctx.sendMessage('Парсинг остановлен. Напишите команду /start чтобы возобновить процесс.');
  }
  interval = null
};

export { start, stopJob };
