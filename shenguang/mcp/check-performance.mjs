import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';

const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME || "qwen-plus",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.BASE_URL,
    },
});

const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        'chrome-devtools': {
            command: "npx",
            args: [
                "-y",
                "chrome-devtools-mcp@latest"
            ]
        }
    }
});

async function checkWebsitePerformance(url) {
    const tools = await mcpClient.getTools();
    console.log(chalk.bgGreen('✅ Chrome DevTools MCP 连接成功'));

    const chromeTools = tools.filter(t => t.name.includes('chrome') || t.name.includes('devtools') || t.name.includes('browser'));
    console.log('可用的 Chrome 工具:', chromeTools.map(t => t.name));

    const modelWithTools = model.bindTools(tools);

    const messages = [
        new (await import('@langchain/core/messages')).HumanMessage(
            `请使用 Chrome DevTools 工具检查以下网站的性能：${url}

请执行以下任务：
1. 使用 Chrome DevTools 打开并分析该网站
2. 获取页面加载性能指标，包括：
   - 页面加载时间 (LCP - Largest Contentful Paint)
   - 首次内容绘制 (FCP - First Contentful Paint)
   - 首次绘制 (FP - First Paint)
   - DOMContentLoaded 时间
   - 页面完全加载时间
   - 总资源请求数量
   - 总资源大小
3. 检查 JavaScript 执行性能
4. 检查网络请求瀑布图
5. 检查控制台错误
6. 提供性能优化建议

请详细返回所有性能指标数据和分析结果。`
        )
    ];

    console.log(chalk.bgBlue('🔍 正在分析网站性能...'));
    const response = await modelWithTools.invoke(messages);

    console.log('\n' + chalk.bgGreen('📊 性能分析结果:'));
    console.log(response.content);

    await mcpClient.close();
}

checkWebsitePerformance('https://www.233leyuan.com').catch(console.error);
