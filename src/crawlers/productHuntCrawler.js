import * as cheerio from 'cheerio';
import { CONFIG } from '../config';
import { translate } from '../utils/ai';

export class ProductHuntCrawler {
    constructor(ai) {
        this.ai = ai;
    }

    async fetch() {
        const url = CONFIG.sources.producthunt.url
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const products = [];

        // 获取标签属性名为data-test并且属性值为homepage-section-0的元素
        const $el = $('[data-test="homepage-section-0"]');
        // 获取该标签下所有section的元素，过滤掉属性data-test没有值的元素
        const sections = $el.find('section').filter((_, el) => $(el).attr('data-test'));
        // 遍历section元素，每次遍历都会执行调用一个异步接口，需要等待接口调用完成才能继续下一次遍历
        for (let i = 0; i < sections.length; i++) {
            const $section = $(sections[i]);
            const $a = $section.find('a').first();
            const postUrl = $a.attr('href');
            const post = await fetchProductHuntPost(postUrl);
            products.push(post);
        }

        for (const product of products) {
            product.content = await translate(this.ai, product.content);
        }

        return buildContent(products);
    }
}

async function fetchProductHuntPost(postUrl) {
    const requestUrl = `${CONFIG.sources.producthunt.url}${postUrl}`;

    const response = await fetch(requestUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${requestUrl}: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const $postPage = $('[data-sentry-component="PostPage"]');
    const titleEle = $postPage.find('h1').first();
    let imgs = [];
    const $galleryEle = $postPage.find('[data-sentry-component="Gallery"]');
    if ($galleryEle) {
        const $imgEles = $galleryEle.find('section').first().find('img');
        // 遍历imgEles
        for (let i = 0; i < $imgEles.length; i++) {
            const img = $imgEles[i];
            const srcset = $(img).attr('srcset');
            const srcsetArr = srcset.split(',').map((item) => item.trim());
            const imgSrc = srcsetArr.find((item) => item.endsWith('3x'));
            imgs.push(imgSrc.split(' ')[0]);
        }
    }

    const titleText = titleEle.text();
    const descriptText = titleEle.next().text();
    const contentText = $postPage.find('section').first().next().text();

    return {
        title: titleText,
        description: descriptText,
        content: contentText,
        url: requestUrl,
        imgs: imgs,
    };
}

function buildContent(products) {
    // 遍历每一个data，获取 title, description, content, url, imgs
    let result = '';
    products.forEach(product => {
        const { title, content, url, imgs } = product;
        let imageHtml = '';
        // 遍历imgs，构造img标签
        imgs.forEach(img => {
            imageHtml += `<p><img src="${img}" alt="${title}"/><p>`;
        });

        result += `
        <h2><a href="${url}">${title}</a></h2>
        <p>${content}</p>
        ${imageHtml}
        <p><a href="${url}">去 Product Hunt 查看</a></p>
        `
    });

    return result;
}