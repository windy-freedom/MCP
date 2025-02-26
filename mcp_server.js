const http = require('http');
const url = require('url');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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
        const filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'weather_image_generator.html' : parsedUrl.pathname);
        
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
                
                // 根据请求调用相应的MCP工具
                let result;
                
                if (server === 'weather' && tool === 'get_current_weather') {
                    result = await callWeatherTool(args.city);
                } else if (server === 'github.com/nickbaumann98/everart-forge-mcp' && tool === 'generate_image') {
                    result = await callEverartTool(args);
                } else if (server === 'stable-diffusion' && tool === 'generate_image') {
                    result = await callStableDiffusionTool(args);
                } else {
                    throw new Error(`不支持的服务或工具: ${server}/${tool}`);
                }
                
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

// 直接调用OpenWeather API获取天气信息
async function callWeatherTool(city) {
    return new Promise((resolve, reject) => {
        // 使用OpenWeather API密钥
        const API_KEY = '778d3c9453a80994430734eba90d8ab4';
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=zh_cn`;
        
        // 使用http模块发送请求
        http.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const weatherData = JSON.parse(data);
                    
                    if (weatherData.cod && weatherData.cod !== 200) {
                        return reject(new Error(`获取天气信息失败: ${weatherData.message}`));
                    }
                    
                    // 格式化返回结果
                    resolve({
                        content: [{
                            type: 'text',
                            text: JSON.stringify({
                                city: weatherData.name,
                                temperature: weatherData.main.temp,
                                conditions: weatherData.weather[0].description,
                                humidity: weatherData.main.humidity,
                                wind_speed: weatherData.wind.speed
                            }, null, 2)
                        }]
                    });
                } catch (e) {
                    reject(new Error(`解析天气数据失败: ${e.message}`));
                }
            });
        }).on('error', (e) => {
            reject(new Error(`请求天气API失败: ${e.message}`));
        });
    });
}

// 模拟生成图片
async function callEverartTool(args) {
    return new Promise((resolve) => {
        // 模拟生成图片的延迟
        setTimeout(() => {
            // 返回一个模拟的图片路径
            resolve({
                path: 'https://via.placeholder.com/800x600?text=Generated+Image',
                prompt: args.prompt
            });
        }, 1000);
    });
}

// 模拟处理图片
async function callStableDiffusionTool(args) {
    return new Promise((resolve) => {
        // 模拟处理图片的延迟
        setTimeout(() => {
            // 返回一个模拟的图片路径
            resolve({
                images: ['https://via.placeholder.com/800x600?text=Processed+Image'],
                prompt: args.prompt
            });
        }, 1000);
    });
}

// 启动服务器
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
