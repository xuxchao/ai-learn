const https = require('https');
const fs = require('fs');

/**
 * SerpApi 客户端封装
 * @param {Object} params - 搜索参数
 * @returns {Promise<Object>}
 */
async function searchWithSerpApi(params) {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `https://serpapi.com/search?${queryParams}`;
    console.log(`🔍 正在执行 SerpApi 搜索: ${url}`);

    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          console.log(`✅ SerpApi 搜索成功，返回 ${data.length} 字节数据`);
          // 帮我将 data 写入到 json 文件中
          fs.writeFileSync('serpapi-response.json', data);
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`解析响应失败: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

module.exports = searchWithSerpApi;
