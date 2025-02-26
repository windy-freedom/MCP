const http = require('http');
const url = require('url');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execPromise = promisify(exec);

// 配置
const PORT = 3001;
const OPENWEATHER_API_KEY = '778d3c9453a80994430734eba90d8ab4'; // 示例API密钥，实际使用时应从环境变量获取

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
    // 设置CORS头，允许来自任何源的请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 解析URL
    const parsedUrl = url.parse(req.url, true);
    
    // 处理静态文件请求
    if (req.method === 'GET' && !parsedUrl.pathname.startsWith('/api/')) {
        const filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'mcp_unified_client.html' : parsedUrl.pathname);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            
            // 设置内容类型
            let contentType = 'text/html';
            const ext = path.extname(filePath);
            if (ext === '.js') contentType = 'text/javascript';
            else if (ext === '.css') contentType = 'text/css';
            else if (ext === '.json') contentType = 'application/json';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.svg') contentType = 'image/svg+xml';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }
    
    // 处理API请求
    if (req.method === 'POST' && parsedUrl.pathname === '/api/mcp') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { server, tool, args } = data;
                
                console.log(`收到MCP请求: ${server}/${tool}`, args);
                
                // 根据请求调用相应的MCP工具
                let result;
                
                if (server === 'weather' && tool === 'get_current_weather') {
                    result = await callWeatherMcp(args);
                } else if (server === 'github.com/nickbaumann98/everart-forge-mcp' && tool === 'generate_image') {
                    result = await callEverartMcp(args);
                } else if (server === 'stable-diffusion' && tool === 'generate_image') {
                    result = await callStableDiffusionMcp(args);
                } else {
                    throw new Error(`不支持的服务或工具: ${server}/${tool}`);
                }
                
                console.log(`MCP请求处理完成: ${server}/${tool}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('处理请求时出错:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    // 处理其他请求
    res.writeHead(404);
    res.end('Not found');
});

// 调用Weather MCP工具
async function callWeatherMcp(args) {
    try {
        const { city } = args;
        if (!city) {
            throw new Error('缺少城市参数');
        }
        
        console.log(`获取天气信息: ${city}`);
        
        // 使用OpenWeather API
        // 尝试将中文城市名转换为英文名（简单映射）
        const cityMapping = {
            '北京': 'Beijing',
            '上海': 'Shanghai',
            '广州': 'Guangzhou',
            '深圳': 'Shenzhen',
            '杭州': 'Hangzhou',
            '南京': 'Nanjing',
            '成都': 'Chengdu',
            '武汉': 'Wuhan',
            '西安': 'Xian',
            '重庆': 'Chongqing',
            '天津': 'Tianjin',
            '苏州': 'Suzhou',
            '厦门': 'Xiamen',
            '青岛': 'Qingdao',
            '大连': 'Dalian'
        };
        
        const cityName = cityMapping[city] || city;
        console.log(`转换后的城市名: ${cityName}`);
        
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`;
        
        // 发送HTTP请求
        const weatherData = await fetchJson(url);
        
        if (weatherData.cod && weatherData.cod !== 200) {
            throw new Error(`获取天气信息失败: ${weatherData.message}`);
        }
        
        // 格式化返回结果
        return {
            city: weatherData.name,
            temperature: weatherData.main.temp,
            conditions: weatherData.weather[0].description,
            humidity: weatherData.main.humidity,
            wind_speed: weatherData.wind.speed,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('调用Weather MCP工具出错:', error);
        throw error;
    }
}

// 调用Everart MCP工具
async function callEverartMcp(args) {
    try {
        const { prompt, model = '8000', image_count = 1, format = 'svg' } = args;
        
        if (!prompt) {
            throw new Error('缺少prompt参数');
        }
        
        console.log(`生成图片: ${prompt}`);
        
        // 由于没有实际的API密钥，我们使用模拟数据
        console.log('使用模拟数据代替实际API调用');
        
        // 根据提示词生成不同的占位图URL
        const promptHash = Math.abs(prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000);
        // 使用更可靠的占位图服务
        const imageUrl = `https://picsum.photos/800/600?random=${promptHash}`;
        
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            path: imageUrl,
            prompt: prompt,
            model: model,
            format: format
        };
    } catch (error) {
        console.error('调用Everart MCP工具出错:', error);
        throw error;
    }
}

// 调用Stable Diffusion MCP工具
async function callStableDiffusionMcp(args) {
    try {
        const { 
            prompt, 
            negative_prompt = '模糊，扭曲，低质量', 
            width = 768, 
            height = 768, 
            num_outputs = 1 
        } = args;
        
        if (!prompt) {
            throw new Error('缺少prompt参数');
        }
        
        console.log(`处理图片: ${prompt}`);
        
        // 由于没有实际的API密钥，我们使用模拟数据
        console.log('使用模拟数据代替实际API调用');
        
        // 根据提示词生成不同的占位图URL
        const promptHash = Math.abs(prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000);
        
        // 模拟多张图片
        const images = [];
        for (let i = 0; i < num_outputs; i++) {
            // 使用更可靠的占位图服务
            images.push(`https://picsum.photos/768/768?random=${promptHash + i}`);
        }
        
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
            images: images,
            prompt: prompt,
            negative_prompt: negative_prompt,
            width: width,
            height: height
        };
    } catch (error) {
        console.error('调用Stable Diffusion MCP工具出错:', error);
        throw error;
    }
}

// 辅助函数：获取JSON数据
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (e) {
                    reject(new Error(`解析JSON数据失败: ${e.message}`));
                }
            });
        }).on('error', (e) => {
            reject(new Error(`HTTP请求失败: ${e.message}`));
        });
    });
}

// 启动服务器
server.listen(PORT, () => {
    console.log(`MCP统一服务器运行在 http://localhost:${PORT}`);
    console.log(`访问 http://localhost:${PORT} 查看演示页面`);
});
