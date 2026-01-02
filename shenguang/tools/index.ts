import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { tool } from '@langchain/core/tools';
import { HumanMessage, BaseMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import fs from 'node:fs/promises';
import { z } from 'zod';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

const model = new ChatOpenAI({
    modelName: process.env["MODEL_NAME"] || "qwen-coder-turbo",
    apiKey: process.env["API_KEY"] || '你的 apiKey',
    configuration: {
        baseURL: process.env["BASE_URL"] || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
});

const readFileTool = tool(
    async ({ filePath }) => {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
        return `文件内容:\n${content}`;
    },
    {
        name: 'read_file',
        description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
        schema: z.object({
            filePath: z.string().describe('要读取的文件路径'),
        }),
    }
);

const tools = [
    readFileTool
];

const modelWithTools = model.bindTools(tools);

const messages: BaseMessage[] = [
    new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
`),
    new HumanMessage('请读取 D:/my/ai-learn/shenguang/tools/index.ts 文件内容并解释代码')
];

let response = await modelWithTools.invoke(messages);
messages.push(response);

while (response.tool_calls && response.tool_calls.length > 0) {

    console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`);

    // 执行所有工具调用
    const toolResults = await Promise.all(
        response.tool_calls.map(async (toolCall) => {
            const tool = tools.find(t => t.name === toolCall.name);
            if (!tool) {
                return `错误: 找不到工具 ${toolCall.name}`;
            }

            console.log(`  [执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`);
            try {
                const result = await tool.invoke(toolCall.args as any);
                return result;
            } catch (error) {
                return `错误: ${(error as Error).message}`;
            }
        })
    );

    // 将工具结果添加到消息历史
    response.tool_calls.forEach((toolCall, index) => {
        messages.push(
            new ToolMessage({
                content: toolResults[index] as string,
                tool_call_id: toolCall.id as string,
            })
        );
    });

    // 再次调用模型，传入工具结果
    response = await modelWithTools.invoke(messages);
}

console.log('\n[最终回复]');
console.log(response.content);