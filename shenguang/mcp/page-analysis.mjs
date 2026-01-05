import https from 'https';
import { URL } from 'url';

function fetchPage(urlString) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
        };
        
        const request = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                content: data,
                contentLength: data.length
            }));
        });
        
        request.on('error', reject);
        request.setTimeout(15000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
        
        request.end();
    });
}

function analyzePage(content, urlString) {
    const results = {
        html: {
            size: content.length,
            doctype: null,
            charset: null
        },
        scripts: [],
        stylesheets: [],
        images: [],
        links: [],
        meta: [],
        iframes: [],
        optimizations: []
    };
    
    // 1. 检查 DOCTYPE
    const doctypeMatch = content.match(/<!DOCTYPE[^>]*>/i);
    results.html.doctype = doctypeMatch ? doctypeMatch[0] : '❌ 缺失';
    
    // 2. 检查 charset
    const charsetMatch = content.match(/<meta[^>]*charset=["']?([^"'\s>]+)["']?/i);
    results.html.charset = charsetMatch ? charsetMatch[1] : '❌ 未声明';
    
    // 3. 提取外部脚本
    const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = scriptRegex.exec(content)) !== null) {
        results.scripts.push(match[1]);
    }
    
    // 4. 提取外部样式表
    const styleRegex = /<link[^>]+rel=["']?stylesheet["']?[^>]+href=["']([^"']+)["'][^>]*>/gi;
    while ((match = styleRegex.exec(content)) !== null) {
        results.stylesheets.push(match[1]);
    }
    
    // 5. 提取图片
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = imgRegex.exec(content)) !== null) {
        results.images.push(match[1]);
    }
    
    // 6. 提取链接
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    while ((match = linkRegex.exec(content)) !== null) {
        if (!results.links.includes(match[1])) {
            results.links.push(match[1]);
        }
    }
    
    // 7. 提取 meta 标签
    const metaRegex = /<meta[^>]+name=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
    while ((match = metaRegex.exec(content)) !== null) {
        results.meta.push({ name: match[1], content: match[2] });
    }
    
    // 8. 提取 iframes
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = iframeRegex.exec(content)) !== null) {
        results.iframes.push(match[1]);
    }
    
    // 9. 性能优化分析
    
    // 检查异步/延迟脚本
    const syncScripts = results.scripts.filter(s => !s.includes('async') && !s.includes('defer'));
    if (syncScripts.length > 3) {
        results.optimizations.push({
            type: 'warning',
            message: `发现 ${syncScripts.length} 个同步加载的脚本，建议使用 async 或 defer`,
            impact: '高'
        });
    }
    
    // 检查预加载
    const hasPreload = content.includes('rel="preload"');
    if (!hasPreload && results.scripts.length > 0) {
        results.optimizations.push({
            type: 'suggestion',
            message: '未发现资源预加载标签，建议为关键资源添加 preload',
            impact: '中'
        });
    }
    
    // 检查图片懒加载
    const lazyImages = results.images.filter(img => img.includes('loading="lazy"') || img.includes('loading=lazy'));
    if (results.images.length > 10 && lazyImages.length === 0) {
        results.optimizations.push({
            type: 'suggestion',
            message: `发现 ${results.images.length} 张图片，建议为不在视口中的图片添加 lazy loading`,
            impact: '中'
        });
    }
    
    // 检查 viewport meta
    const hasViewport = content.includes('name="viewport"');
    if (!hasViewport) {
        results.optimizations.push({
            type: 'warning',
            message: '缺失 viewport meta 标签，影响移动端体验',
            impact: '高'
        });
    }
    
    // 检查 favicon
    const hasFavicon = content.includes('rel="icon"') || content.includes('rel="shortcut icon"');
    if (!hasFavicon) {
        results.optimizations.push({
            type: 'info',
            message: '未检测到 favicon，建议添加',
            impact: '低'
        });
    }
    
    // 检查 X-Frame-Options
    // 需要服务器响应头，这里只是标记
    results.optimizations.push({
        type: 'info',
        message: '建议检查 X-Frame-Options 响应头以防止点击劫持',
        impact: '低'
    });
    
    return results;
}

async function analyzeWebsite(urlString) {
    console.log('🔬 开始深度页面分析...\n');
    console.log(`📍 分析目标: ${urlString}`);
    console.log('='.repeat(70));
    
    try {
        // 获取页面内容
        console.log('\n📥 正在获取页面内容...');
        const response = await fetchPage(urlString);
        console.log(`✅ 页面获取成功`);
        console.log(`   状态码: ${response.statusCode}`);
        console.log(`   内容大小: ${(response.contentLength / 1024).toFixed(2)} KB`);
        console.log(`   Content-Type: ${response.headers['content-type'] || '未知'}`);
        
        // 分析页面结构
        console.log('\n📊 页面结构分析:');
        console.log('='.repeat(70));
        
        const analysis = analyzePage(response.content, urlString);
        
        console.log(`\n🏷️  HTML 结构:`);
        console.log(`   DOCTYPE: ${analysis.html.doctype}`);
        console.log(`   字符编码: ${analysis.html.charset}`);
        
        console.log(`\n📦 资源统计:`);
        console.log(`   外部脚本: ${analysis.scripts.length} 个`);
        console.log(`   样式表: ${analysis.stylesheets.length} 个`);
        console.log(`   图片: ${analysis.images.length} 张`);
        console.log(`   链接: ${analysis.links.length} 个`);
        console.log(`   IFrames: ${analysis.iframes.length} 个`);
        
        console.log(`\n🔍 关键资源:`);
        if (analysis.scripts.length > 0) {
            console.log('   主要脚本:');
            analysis.scripts.slice(0, 5).forEach((s, i) => {
                console.log(`     ${i+1}. ${s.substring(0, 80)}`);
            });
            if (analysis.scripts.length > 5) {
                console.log(`     ... 及其他 ${analysis.scripts.length - 5} 个脚本`);
            }
        }
        
        if (analysis.stylesheets.length > 0) {
            console.log('   样式表:');
            analysis.stylesheets.slice(0, 3).forEach((s, i) => {
                console.log(`     ${i+1}. ${s.substring(0, 80)}`);
            });
        }
        
        console.log('\n⚡ 性能优化建议:');
        console.log('='.repeat(70));
        
        if (analysis.optimizations.length === 0) {
            console.log('✅ 页面结构良好，未发现明显问题');
        } else {
            analysis.optimizations.forEach((opt, i) => {
                const icon = opt.type === 'warning' ? '⚠️' : opt.type === 'suggestion' ? '💡' : 'ℹ️';
                console.log(`\n${icon} ${opt.message}`);
                console.log(`   影响程度: ${opt.impact}`);
            });
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('📋 综合建议:');
        console.log('='.repeat(70));
        
        if (analysis.scripts.length > 10) {
            console.log('\n1. 减少脚本数量:');
            console.log('   - 使用代码分割，按需加载');
            console.log('   - 合并小脚本');
            console.log('   - 移除未使用的第三方库');
        }
        
        if (analysis.stylesheets.length > 5) {
            console.log('\n2. 优化样式表:');
            console.log('   - 合并 CSS 文件');
            console.log('   - 使用 CSS-in-JS 或 CSS Modules');
            console.log('   - 关键 CSS 内联，非关键 CSS 异步加载');
        }
        
        if (analysis.images.length > 20) {
            console.log('\n3. 优化图片:');
            console.log('   - 使用 WebP/AVIF 格式');
            console.log('   - 实现响应式图片');
            console.log('   - 图片懒加载');
            console.log('   - 使用 spritesheet 合并小图标');
        }
        
        console.log('\n4. 服务器配置:');
        console.log('   - 启用 HTTP/2');
        console.log('   - 开启 Gzip/Brotli 压缩');
        console.log('   - 设置合理的缓存策略');
        console.log('   - 使用 CDN 加速');
        
        console.log('\n' + '='.repeat(70));
        
    } catch (error) {
        console.error('❌ 分析失败:', error.message);
    }
}

analyzeWebsite('https://www.233leyuan.com').catch(console.error);
