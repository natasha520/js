// CG57 for WebHTV / FongMi-CatVod JS
// 基于原 FW Widget 脚本逻辑改写
// 站点: https://cg57.live

var rule = {
    类型: '影视',
    title: 'CG57',
    host: 'https://cg57.live',
    homeUrl: '/',
    url: '/fyclass/' + 'page/fypage/',
    searchUrl: '/search/**?type=post&page=fypage',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    timeout: 8000,
    play_parse: true,
    lazy: '',
    limit: 20,
    class_name: '热门&首页最新&今日吃瓜&91暗网&每日大赛&网红黑料&网黄合集&出轨劈腿&热门大瓜',
    class_url: 'hot&home&jrcg&91&mrds&wanghong&video&chuguipietui&dagua',

    推荐: function () {
        return this.一级('hot', 1, null, null);
    },

    一级: function (tid, pg, filter, extend) {
        pg = Number(pg || 1);
        let base = this.host.replace(//+$/, '');
        let link = buildListUrl(base, tid, pg);
        let html = getHtml(link, base);
        return JSON.stringify(parseList(html, base));
    },

    搜索: function (wd, quick, pg) {
        pg = Number(pg || 1);
        let base = this.host.replace(//+$/, '');
        let link = base + '/search/' + encodeURIComponent(wd) + '?type=post';
        if (pg > 1) link += '&page=' + pg;
        let html = getHtml(link, base);
        return JSON.stringify(parseList(html, base));
    },

    二级: function (ids) {
        let id = String(ids || '');
        let m = id.match(/events/(d+)/i);
        id = m ? m[1] : id.replace(/D/g, '');
        if (!id) return JSON.stringify({});

        let base = this.host.replace(//+$/, '');
        let link = base + '/events/' + id + '/';
        let html = getHtml(link, base, link);

        let title = extractTitle(html) || ('视频 ' + id);
        let pic = extractCover(html, base);
        let desc = extractDesc(html);
        let plays = extractPlay(html);

        return JSON.stringify({
            vod_id: id,
            vod_name: title,
            vod_pic: pic,
            type_name: '视频',
            vod_content: desc,
            vod_play_from: plays.length ? plays.map(it => it.name).join('$$$') : 'CG57',
            vod_play_url: plays.length ? plays.map(it => it.name + '$' + it.url).join('$$$') : ''
        });
    },

    lazy: function (flag, id, flags) {
        return JSON.stringify({
            parse: 0,
            url: id
        });
    }
};

function getHtml(url, base, referer) {
    let headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': referer || (base + '/'),
        'Origin': base
    };
    try {
        if (typeof req === 'function') {
            let res = req(url, { headers: headers, timeout: 8000 });
            if (typeof res === 'string') return res;
            if (res && typeof res.content === 'string') return res.content;
            if (res && res.content != null) return String(res.content);
        }
    } catch (e) {}
    try {
        if (typeof fetch === 'function') {
            let res = fetch(url, { headers: headers, timeout: 8000 });
            if (typeof res === 'string') return res;
            if (res && typeof res.content === 'string') return res.content;
            if (res && res.content != null) return String(res.content);
        }
    } catch (e) {}
    return '';
}

function t(v) {
    return String(v == null ? '' : v).trim();
}

function absUrl(base, u) {
    u = t(u);
    if (!u) return '';
    if (/^https?:///i.test(u)) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    if (u.charAt(0) === '/') return base + u;
    return base + '/' + u;
}

function decodeHtml(s) {
    return t(s)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function cleanTitle(s) {
    s = decodeHtml(s);
    if (!s) return '';
    let bad = ['吃瓜合集', '91暗网', '每日大赛', '今日吃瓜', '网红黑料', '热门大瓜', '出轨劈腿', '热门事件', '首页最新', '黑料', '热门'];
    let changed = true;
    while (changed) {
        changed = false;
        s = t(s);
        for (let i = 0; i < bad.length; i++) {
            let x = bad[i];
            if (s.indexOf(x) === 0) {
                s = s.slice(x.length).replace(/^[\\s\\-_|｜·:：]+/, '');
                changed = true;
                break;
            }
        }
    }
    return t(s);
}

function buildListUrl(base, tid, pg) {
    tid = t(tid || 'hot');
    if (!tid || tid === 'hot' || tid === 'home') {
        return pg <= 1 ? base + '/' : base + '/page/' + pg + '/';
    }
    let u = base + '/' + tid + '/';
    if (pg > 1) u += 'page/' + pg;
    return u;
}

function parseList(html, base) {
    if (!html) return [];
    let out = [];
    let seen = {};
    let reg = /<a[^>]+href=["']/events/(d+)/["'][^>]*>[sS]*?</a>/gi;
    let m;
    while ((m = reg.exec(html)) !== null) {
        let id = m[1];
        if (seen[id]) continue;
        let block = m[0];
        let img = block.match(/(?:src|data-src|data-original)=["']([^"']+.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
        if (!img) continue;

        let title = '';
        let a = block.match(/alt=["']([^"']{2,200})["']/i);
        if (a) title = a[1];
        if (!title) {
            a = block.match(/title=["']([^"']{2,200})["']/i);
            if (a) title = a[1];
        }
        if (!title) {
            a = block.match(/<hd[^>]*>([^<]{2,200})</hd>/i);
            if (a) title = a[1];
        }

        title = cleanTitle(title) || ('视频 ' + id);
        out.push({
            vod_id: id,
            vod_name: title,
            vod_pic: absUrl(base, img[1]),
            vod_remarks: ''
        });
        seen[id] = 1;
    }
    return out;
}

function extractTitle(html) {
    let m = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)
        || html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
        || html.match(/<h1[^>]*>([^<]{2,200})</h1>/i)
        || html.match(/<title[^>]*>([^<]+)</title>/i);
    if (!m) return '';
    return cleanTitle(m[1]).replace(/\\s*[-|_｜].*57.*/i, '').trim();
}

function extractCover(html, base) {
    let m = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i)
        || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
        || html.match(/(?:src|data-src)=["']([^"']+.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
    return m ? absUrl(base, m[1]) : '';
}

function extractDesc(html) {
    let m = html.match(/property=["']og:description["'][^>]*content=["']([^"']+)/i)
        || html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    return m ? decodeHtml(m[1]) : '';
}

function extractPlay(html) {
    let out = [];
    let seen = {};
    function add(u, name) {
        u = t(u);
        if (!u || seen[u] || !/^https?:///i.test(u)) return;
        seen[u] = 1;
        out.push({ name: name || '播放', url: u });
    }

    let m3u8 = html.match(/https?://[^"'\\s<>]+.m3u8[^"'\\s<>]*/gi) || [];
    for (let i = 0; i < m3u8.length; i++) add(m3u8[i], 'HLS');

    let mp4 = html.match(/https?://[^"'\\s<>]+.mp4[^"'\\s<>]*/gi) || [];
    for (let i = 0; i < mp4.length; i++) add(mp4[i], 'MP4');

    let arr = html.match(/["'](?:url|play_url|playUrl|src|file|video)["']\\s*:\\s*["'](https?://[^"']+)["']/gi) || [];
    for (let i = 0; i < arr.length; i++) {
        let m = arr[i].match(/https?://[^"']+/i);
        if (!m) continue;
        let u = m[0];
        if (/.m3u8/i.test(u)) add(u, 'HLS');
        else if (/.mp4/i.test(u)) add(u, 'MP4');
        else add(u, '直链');
    }

    return out;
}