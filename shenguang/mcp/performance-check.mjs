import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkWebsitePerformance(url) {
    console.log('🚀 启动 Chrome 浏览器...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('✅ 浏览器启动成功');
    
    const page = await browser.newPage();
    
    // 启用性能监控
    await page.setCacheEnabled(false);
    
    console.log(`🌐 正在访问: ${url}`);
    const startTime = Date.now();
    
    try {
        // 导航到页面并等待网络空闲
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ 页面加载完成，耗时: ${loadTime}ms`);
        
        // 获取核心性能指标
        const performanceMetrics = await page.metrics();
        
        // 获取页面详细信息
        const pageInfo = await page.evaluate(() => {
            const timing = performance.timing;
            const navigation = performance.navigation;
            
            return {
                // 基础信息
                title: document.title,
                url: window.location.href,
                contentType: document.contentType,
                
                // 导航时序
                domainLookupStart: timing.domainLookupStart,
                domainLookupEnd: timing.domainLookupEnd,
                connectStart: timing.connectStart,
                connectEnd: timing.connectEnd,
                responseStart: timing.responseStart,
                responseEnd: timing.responseEnd,
                domLoading: timing.domLoading,
                domInteractive: timing.domInteractive,
                domContentLoadedEventStart: timing.domContentLoadedEventStart,
                domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
                loadEventStart: timing.loadEventStart,
                loadEventEnd: timing.loadEventEnd,
                
                // 计算的关键指标
                dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
                connectTime: timing.connectEnd - timing.connectStart,
                ttfb: timing.responseStart - timing.requestStart,
                domParseTime: timing.domInteractive - timing.domLoading,
                domReadyTime: timing.domContentLoadedEventEnd - timing.domLoading,
                fullLoadTime: timing.loadEventEnd - timing.navigationStart,
                
                // 页面资源
                imagesCount: document.images.length,
                linksCount: document.getElementsByTagName('a').length,
                scriptsCount: document.getElementsByTagName('script').length,
                stylesheetsCount: document.getElementsByTagName('link').length,
                formsCount: document.getElementsByTagName('form').length,
                
                // 视口信息
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                documentHeight: document.documentElement.scrollHeight,
                documentWidth: document.documentElement.scrollWidth,
            };
        });
        
        // 获取 LCP 信息
        const lcpInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    observer.disconnect();
                    resolve({
                        lcp: lastEntry ? Math.round(lastEntry.startTime) : null,
                        lcpElement: lastEntry ? lastEntry.element?.tagName : null
                    });
                });
                
                observer.observe({ type: 'largest-contentful-paint', buffered: true });
                
                // 如果已经有 LCP 数据，直接返回
                const entries = performance.getEntriesByType('largest-contentful-paint');
                if (entries.length > 0) {
                    const lastEntry = entries[entries.length - 1];
                    observer.disconnect();
                    resolve({
                        lcp: Math.round(lastEntry.startTime),
                        lcpElement: lastEntry.element?.tagName
                    });
                } else {
                    // 2秒后超时
                    setTimeout(() => {
                        observer.disconnect();
                        resolve({ lcp: null, lcpElement: null });
                    }, 2000);
                }
            });
        });
        
        // 获取 FCP 信息
        const fcpInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
                    observer.disconnect();
                    resolve({
                        fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null
                    });
                });
                
                observer.observe({ type: 'paint', buffered: true });
                
                const entries = performance.getEntriesByType('paint');
                const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
                if (fcpEntry) {
                    observer.disconnect();
                    resolve({ fcp: Math.round(fcpEntry.startTime) });
                } else {
                    setTimeout(() => {
                        observer.disconnect();
                        resolve({ fcp: null });
                    }, 2000);
                }
            });
        });
        
        // 获取网络请求信息
        const networkInfo = await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource');
            const scriptResources = resources.filter(r => r.initiatorType === 'script');
            const cssResources = resources.filter(r => r.initiatorType === 'css');
            const imageResources = resources.filter(r => r.initiatorType === 'img');
            const xhrResources = resources.filter(r => r.initiatorType === 'xmlhttprequest' || r.initiatorType === 'fetch');
            
            const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
            const totalDuration = resources.reduce((sum, r) => sum + r.duration, 0);
            
            return {
                totalRequests: resources.length,
                scriptCount: scriptResources.length,
                cssCount: cssResources.length,
                imageCount: imageResources.length,
                xhrCount: xhrResources.length,
                totalTransferSize: (totalSize / 1024).toFixed(2) + ' KB',
                averageResourceDuration: (totalDuration / resources.length).toFixed(2) + ' ms',
                totalResourceDuration: totalDuration.toFixed(2) + ' ms',
                largestResources: resources
                    .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
                    .slice(0, 5)
                    .map(r => ({
                        name: r.name.substring(0, 80),
                        size: ((r.transferSize || 0) / 1024).toFixed(2) + ' KB',
                        duration: r.duration.toFixed(2) + ' ms'
                    }))
            };
        });
        
        // 获取控制台错误
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // 等待一下收集控制台错误
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 输出详细报告
        console.log('\n' + '='.repeat(70));
        console.log('📊 233乐园 网站性能分析报告');
        console.log('='.repeat(70));
        
        console.log('\n🎯 核心性能指标:');
        console.log(`  • LCP (最大内容绘制): ${lcpInfo.lcp ? lcpInfo.lcp + ' ms' : '测量中...'}`);
        console.log(`  • FCP (首次内容绘制): ${fcpInfo.fcp ? fcpInfo.fcp + ' ms' : '测量中...'}`);
        console.log(`  • 总加载时间: ${loadTime} ms`);
        console.log(`  • DOM 解析时间: ${pageInfo.domParseTime} ms`);
        console.log(`  • DOM 就绪时间: ${pageInfo.domReadyTime} ms`);
        console.log(`  • 完整加载时间: ${pageInfo.fullLoadTime} ms`);
        
        console.log('\n🌐 网络请求分析:');
        console.log(`  • 总请求数: ${networkInfo.totalRequests}`);
        console.log(`  • 脚本请求: ${networkInfo.scriptCount}`);
        console.log(`  • 样式表请求: ${networkInfo.cssCount}`);
        console.log(`  • 图片请求: ${networkInfo.imageCount}`);
        console.log(`  • API 请求: ${networkInfo.xhrCount}`);
        console.log(`  • 总传输大小: ${networkInfo.totalTransferSize}`);
        console.log(`  • 平均资源加载时间: ${networkInfo.averageResourceDuration}`);
        
        console.log('\n🔧 网络时序:');
        console.log(`  • DNS 解析: ${pageInfo.dnsTime} ms`);
        console.log(`  • TCP 连接: ${pageInfo.connectTime} ms`);
        console.log(`  • TTFB (首字节时间): ${pageInfo.ttfb} ms`);
        
        console.log('\n📄 页面结构:');
        console.log(`  • 标题: ${pageInfo.title}`);
        console.log(`  • 图片数量: ${pageInfo.imagesCount}`);
        console.log(`  • 链接数量: ${pageInfo.linksCount}`);
        console.log(`  • 脚本数量: ${pageInfo.scriptsCount}`);
        console.log(`  • 样式表数量: ${pageInfo.stylesheetsCount}`);
        console.log(`  • 表单数量: ${pageInfo.formsCount}`);
        
        console.log('\n🔍 最大资源 (Top 5):');
        networkInfo.largestResources.forEach((r, i) => {
            console.log(`  ${i+1}. ${r.name}`);
        });
        
        if (consoleErrors.length > 0) {
            console.log('\n⚠️  控制台错误:');
            consoleErrors.forEach((err, i) => {
                console.log(`  ${i+1}. ${err.substring(0, 100)}`);
            });
        } else {
            console.log('\n✅ 无控制台错误');
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('💡 优化建议:');
        console.log('='.repeat(70));
        
        if (lcpInfo.lcp && lcpInfo.lcp > 2500) {
            console.log('  ⚡ LCP 时间过长 (>2.5s)，建议:');
            console.log('     - 优化服务器响应时间');
            console.log('     - 减少关键渲染路径资源');
            console.log('     - 使用 CDN 加速静态资源');
        }
        
        if (networkInfo.scriptCount > 20) {
            console.log('  ⚡ 脚本数量较多，建议:');
            console.log('     - 代码分割，按需加载');
            console.log('     - 移除未使用的第三方脚本');
            console.log('     - 使用 script async/defer 属性');
        }
        
        if (networkInfo.imageCount > 50) {
            console.log('  ⚡ 图片数量较多，建议:');
            console.log('     - 使用图片懒加载');
            console.log('     - 优化图片格式 (WebP/AVIF)');
            console.log('     - 响应式图片策略');
        }
        
        if (pageInfo.ttfb > 500) {
            console.log('  ⚡ TTFB 时间较长，建议:');
            console.log('     - 优化数据库查询');
            console.log('     - 使用服务器端缓存');
            console.log('     - 考虑升级服务器配置');
        }
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await browser.close();
        console.log('🔒 浏览器已关闭');
    }
}

checkWebsitePerformance('https://www.233leyuan.com');
