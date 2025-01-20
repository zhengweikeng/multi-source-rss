import { Feed } from 'feed';

export class RSSGenerator {
    constructor(source, items = []) {
        this.source = source;
        this.items = items;
    }

    generate(content) {
        const currDate = new Date()
        const formatDate = `${currDate.getFullYear()}-${currDate.getMonth() + 1}-${currDate.getDate()}`;

        const feed = new Feed({
            title: this.source.name,
            description: this.source.description,
            id: this.source.url,
            link: this.source.url,
            language: 'ch',
            updated: currDate,
            generator: 'Multi-source RSS Generator',
        });

        const latestItem = {
            title: formatDate,
            id: this.source.url,
            link: this.source.url,
            description: this.source.description,
            content,
            date: currDate,
        }

        if (this.items.length > 0) {
            const firstItem = this.items[0];
            if (firstItem.title !== formatDate) {
                this.items.unshift(latestItem)
            }
        } else {
            this.items.unshift(latestItem)
        }

        for (const item of this.items) {
            feed.addItem(item);
        }

        return feed.rss2();
    }
}

// 实现一个函数，根据items构造一个rss item
// 参数datas是一个数组，每个元素是一个对象，包含title, description, content, url, imgs
// 函数返回一段html字符串，表示rss item
function generateRSSItem(datas) {
    // 遍历每一个data，获取 title, description, content, url, imgs
    let itemContent = '';
    datas.forEach(data => {
        const { title, description, content, url, imgs } = data;
        let imageHtml = '';
        // 遍历imgs，构造img标签
        imgs.forEach(img => {
            imageHtml += `<p><img src="${img}" alt="${title}"/><p>`;
        });

        itemContent += `
        <h2><a href="${url}">${title}</a></h2>
        <p>${content}</p>
        ${imageHtml}
        <p><a href="${url}">去 Product Hunt 查看</a></p>
        `
    });

    return itemContent;
}