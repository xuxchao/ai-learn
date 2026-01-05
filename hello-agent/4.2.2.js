require('dotenv').config();

/**
 * 一个基于SerpApi的实战网页搜索引擎工具。
 * 它会智能地解析搜索结果，优先返回直接答案或知识图谱信息。
 * @param {string} query - 搜索查询
 * @returns {Promise<string>}
 */
async function search(query) {
  console.log(`🔍 正在执行 [SerpApi] 网页搜索: ${query}`);

  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return '错误:SERPAPI_API_KEY 未在 .env 文件中配置。';
    }

    const params = {
      engine: 'google',
      q: query,
      api_key: apiKey,
      gl: 'cn',
      hl: 'zh-cn',
    };

    const results = await require('./serpapi-wrapper')(params);

    // 智能解析:优先寻找最直接的答案
    if (results.answer_box_list && Array.isArray(results.answer_box_list)) {
      return results.answer_box_list.join('\n');
    }

    if (results.answer_box && results.answer_box.answer) {
      return results.answer_box.answer;
    }

    if (results.knowledge_graph && results.knowledge_graph.description) {
      return results.knowledge_graph.description;
    }

    if (results.organic_results && results.organic_results.length > 0) {
      const snippets = results.organic_results
        .slice(0, 3)
        .map((res, i) => {
          const title = res.title || '';
          const snippet = res.snippet || '';
          return `[${i + 1}] ${title}\n${snippet}`;
        });
      return snippets.join('\n\n');
    }

    return `对不起，没有找到关于 '${query}' 的信息。`;
  } catch (error) {
    return `搜索时发生错误: ${error.message}`;
  }
}

// --- 使用示例 ---
async function main() {
  const result = await search('冯诺依曼体系结构');
  console.log('\n--- 搜索结果 ---');
  console.log(result);
}

module.exports = { search };

// 如果直接运行此文件
if (require.main === module) {
  main();
}
