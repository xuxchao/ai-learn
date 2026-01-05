import https from 'https';
import dns from 'dns';
import { performance } from 'perf_hooks';
import net from 'net';
import { URL } from 'url';

function measureDNS(domain) {
    return new Promise((resolve) => {
        const start = performance.now();
        dns.resolve4(domain, (err, addresses) => {
            const end = performance.now();
            if (err) {
                resolve({ time: null, error: err.message });
            } else {
                resolve({
                    time: Math.round(end - start),
                    addresses
                });
            }
        });
    });
}

function measureTCP(hostname, port = 443) {
    return new Promise((resolve) => {
        const start = performance.now();
        const socket = new net.Socket();

        socket.setTimeout(10000);

        socket.on('connect', () => {
            const end = performance.now();
            socket.destroy();
            resolve({ time: Math.round(end - start) });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ time: null, error: 'Connection timeout' });
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve({ time: null, error: err.message });
        });

        socket.connect(port, hostname);
    });
}

function measureHTTPS(url) {
    return new Promise((resolve) => {
        const start = performance.now();

        const request = https.get(url, (res) => {
            const statusCode = res.statusCode;
            const contentLength = parseInt(res.headers['content-length'] || '0');

            let dataLength = 0;

            res.on('data', (chunk) => {
                dataLength += chunk.length;
            });

            res.on('end', () => {
                const end = performance.now();
                const totalTime = Math.round(end - start);

                resolve({
                    TTFB: Math.round(end - start - dataLength * 0.001),
                    totalTime,
                    statusCode,
                    contentLength,
                    dataLength,
                    headers: res.headers
                });
            });
        });

        request.on('error', (err) => {
            resolve({ error: err.message });
        });

        request.setTimeout(30000, () => {
            request.destroy();
            resolve({ error: 'Request timeout' });
        });
    });
}

function getDomain(urlString) {
    try {
        const url = new URL(urlString);
        return url.hostname;
    } catch {
        return null;
    }
}

async function checkWebsitePerformance(urlString) {
    console.log('🚀 开始性能检测...\n');

    const domain = getDomain(urlString);
    if (!domain) {
        console.error('❌ 无效的 URL');
        return;
    }

    console.log(`📍 目标网站: ${urlString}`);
    console.log(`🌐 域名: ${domain}`);
    console.log('='.repeat(70));

    // 1. DNS 解析
    console.log('\n🔍 DNS 解析...');
    const dnsResult = await measureDNS(domain);
    console.log(`   DNS 解析时间: ${dnsResult.time ? dnsResult.time + ' ms' : '失败 - ' + dnsResult.error}`);
    if (dnsResult.addresses) {
        console.log(`   IP 地址: ${dnsResult.addresses.join(', ')}`);
    }

    // 2. TCP 连接
    console.log('\n🔌 TCP 连接...');
    const tcpResult = await measureTCP(domain);
    console.log(`   TCP 连接时间: ${tcpResult.time ? tcpResult.time + ' ms' : '失败 - ' + tcpResult.error}`);

    // 3. HTTPS 请求
    console.log('\n🌐 HTTPS 请求...');
    const httpsResult = await measureHTTPS(urlString);

    if (httpsResult.error) {
        console.log(`   ❌ 请求失败: ${httpsResult.error}`);
    } else {
        console.log(`   状态码: ${httpsResult.statusCode}`);
        console.log(`   TTFB (首字节时间): ${httpsResult.TTFB} ms`);
        console.log(`   总响应时间: ${httpsResult.totalTime} ms`);
        console.log(`   响应头大小: ${httpsResult.contentLength ? (httpsResult.contentLength / 1024).toFixed(2) + ' KB' : '未知'}`);
        console.log(`   实际接收数据: ${(httpsResult.dataLength / 1024).toFixed(2)} KB`);

        console.log('\n📋 关键响应头:');
        console.log(`   • Content-Type: ${httpsResult.headers['content-type'] || '未知'}`);
        console.log(`   • Server: ${httpsResult.headers['server'] || '未知'}`);
        console.log(`   • Cache-Control: ${httpsResult.headers['cache-control'] || '未设置'}`);
        console.log(`   • X-Powered-By: ${httpsResult.headers['x-powered-by'] || '未披露'}`);
    }

    // 性能评估
    console.log('\n' + '='.repeat(70));
    console.log('📊 性能评估:');
    console.log('='.repeat(70));

    let score = 100;
    const issues = [];

    if (dnsResult.time && dnsResult.time > 100) {
        score -= 5;
        issues.push(`⚠️ DNS 解析时间较长 (${dnsResult.time}ms)`);
    }

    if (tcpResult.time && tcpResult.time > 200) {
        score -= 10;
        issues.push(`⚠️ TCP 连接时间较长 (${tcpResult.time}ms)`);
    }

    if (httpsResult.TTFB && httpsResult.TTFB > 500) {
        score -= 15;
        issues.push(`⚠️ TTFB 时间过长 (${httpsResult.TTFB}ms)，服务器响应慢`);
    }

    if (httpsResult.statusCode && httpsResult.statusCode >= 400) {
        score -= 20;
        issues.push(`❌ 服务器返回错误状态码 (${httpsResult.statusCode})`);
    }

    console.log(`\n🏆 综合评分: ${score}/100`);

    if (issues.length > 0) {
        console.log('\n🔧 发现的问题:');
        issues.forEach(issue => console.log(`   ${issue}`));
    } else {
        console.log('\n✅ 未发现明显性能问题');
    }

    console.log('\n💡 优化建议:');

    if (httpsResult.TTFB > 200) {
        console.log('   1. 优化服务器响应:');
        console.log('      - 使用 CDN 加速内容分发');
        console.log('      - 优化数据库查询');
        console.log('      - 启用服务器端缓存');
    }

    if (!httpsResult.headers?.['cache-control']) {
        console.log('   2. 启用缓存控制:');
        console.log('      - 设置 Cache-Control 头');
        console.log('      - 为静态资源设置较长的缓存时间');
    }

    console.log('   3. 考虑使用 HTTP/2 或 HTTP/3');
    console.log('   4. 启用 Gzip/Brotli 压缩');
    console.log('   5. 优化图片和静态资源');

    console.log('\n' + '='.repeat(70));

    return {
        domain,
        dnsTime: dnsResult.time,
        tcpTime: tcpResult.time,
        ttfb: httpsResult.TTFB,
        totalTime: httpsResult.totalTime,
        statusCode: httpsResult.statusCode,
        score
    };
}

checkWebsitePerformance('https://www.233leyuan.com').catch(console.error);
