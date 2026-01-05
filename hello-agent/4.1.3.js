require('dotenv').config();
const OpenAI = require('openai');

class HelloAgentsLLM {
  /**
   * 为本书 "Hello Agents" 定制的LLM客户端。
   * 它用于调用任何兼容OpenAI接口的服务，并默认使用流式响应。
   */
  constructor(config = {}) {
    /**
     * 初始化客户端。优先使用传入参数，如果未提供，则从环境变量加载。
     */
    this.model = config.model || process.env.LLM_MODEL_ID;
    const apiKey = config.apiKey || process.env.LLM_API_KEY;
    const baseUrl = config.baseUrl || process.env.LLM_BASE_URL;
    const timeout = config.timeout || parseInt(process.env.LLM_TIMEOUT || 60, 10);

    if (!this.model || !apiKey || !baseUrl) {
      throw new Error('模型ID、API密钥和服务地址必须被提供或在.env文件中定义。');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout,
    });
  }

  /**
   * 调用大语言模型进行思考，并返回其响应。
   * @param {Array<{role: string, content: string}>} messages - 消息数组
   * @param {number} temperature - 温度参数
   * @returns {Promise<string|null>}
   */
  async think(messages, temperature = 0) {
    console.log(`🧠 正在调用 ${this.model} 模型...`);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        stream: true,
      });

      console.log('✅ 大语言模型响应成功:');
      let collectedContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        process.stdout.write(content);
        collectedContent += content;
      }
      console.log(); // 在流式输出结束后换行

      return collectedContent;
    } catch (error) {
      console.log(`❌ 调用LLM API时发生错误: ${error.message}`);
      return null;
    }
  }
}

// --- 客户端使用示例 ---
async function main() {
  try {
    const llmClient = new HelloAgentsLLM();

    const exampleMessages = [
      { role: 'system', content: 'You are a helpful assistant that writes js code.' },
      { role: 'user', content: '写一个快速排序算法' },
    ];

    console.log('--- 调用LLM ---');
    const responseText = await llmClient.think(exampleMessages);

    if (responseText) {
      console.log('\n\n--- 完整模型响应 ---');
      console.log(responseText);
    }
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = HelloAgentsLLM;

// 如果直接运行此文件
if (require.main === module) {
  main();
}
