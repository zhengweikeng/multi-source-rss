import { CONFIG } from './config';
import { crawlers } from './crawlers';
import { RSSGenerator } from './utils/rssGenerator';

export default {
    async scheduled(event, env, ctx) {
        // 定时任务：抓取所有启用的源
        for (const [sourceId, source] of Object.entries(CONFIG.sources)) {
            if (source.enabled) {
                try {
                    const cacheKey = `feed_${sourceId}`;
                    const itemsCacheKey = `feed_items_${sourceId}`;

                    const itemStr = await env.RSS_KV.get(itemsCacheKey);
                    let items = []
                    if (itemStr) {
                        items = JSON.parse(itemStr);
                    }

                    const crawler = new crawlers[sourceId](env.AI);
                    const content = await crawler.fetch();

                    const generator = new RSSGenerator(source, items);
                    const feed = generator.generate(content);
                    await env.RSS_KV.put(cacheKey, feed);
                    await env.RSS_KV.put(itemsCacheKey, JSON.stringify(generator.items));
                } catch (error) {
                    console.error(`Error fetching ${sourceId}:`, error);
                }
            }
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const paths = url.pathname.split('/');
        const sourceId = paths[1];

        if (!sourceId) {
            const availableSources = Object.entries(CONFIG.sources)
                .filter(([_, source]) => source.enabled)
                .reduce((acc, [id, source]) => {
                    // 构建完整的 RSS URL
                    const baseUrl = new URL(request.url).origin;
                    return {
                        ...acc,
                        [id]: {
                            name: source.name,
                            description: source.description,
                            websiteUrl: source.url,
                            rssUrl: `${baseUrl}${source.rssUrl}`,
                        }
                    };
                }, {});

            return new Response(JSON.stringify(availableSources, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        // 获取请求参数fresh，如果为1，强制刷新缓存
        const fresh = url.searchParams.get('fresh') === '1';
        if (fresh) {
            console.log('Force refresh feed:', sourceId);
            await this.scheduled(null, env, ctx);
        }

        // 检查源是否存在且启用
        const source = CONFIG.sources[sourceId];
        if (!source || !source.enabled) {
            return new Response('Feed not found', { status: 404 });
        }

        try {
            const cacheKey = `feed_${sourceId}`;
            const feed = await env.RSS_KV.get(cacheKey);
            return new Response(feed, {
                headers: {
                    'Content-Type': 'application/rss+xml',
                },
            });
        } catch (error) {
            return new Response('Error generating feed: ' + error.message, { status: 500 });
        }
    }
};