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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin, X-Requested-With');
    
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
        
        // 使用MCP工具调用实际的Everart API
        console.log('调用Everart MCP工具...');
        
        // 构建命令来调用MCP工具
        const command = `
            const { spawn } = require('child_process');
            const path = require('path');
            
            // 参数
            const args = {
                prompt: ${JSON.stringify(prompt)},
                model: ${JSON.stringify(model)},
                image_count: ${image_count},
                format: ${JSON.stringify(format)}
            };
            
            // 启动MCP服务器进程
            const mcp = spawn('node', [path.join(process.env.HOME, 'Documents/Cline/MCP/everart-forge-mcp/build/index.js')], {
                env: {
                    ...process.env,
                    EVERART_API_KEY: 'everart-k8hX9bUYNh-eMr6C2HHfzCk7naRMuJwHIBhH_0mGJAA'
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let data = '';
            let error = '';
            
            mcp.stdout.on('data', (chunk) => {
                data += chunk.toString();
            });
            
            mcp.stderr.on('data', (chunk) => {
                error += chunk.toString();
            });
            
            // 发送请求到MCP服务器
            mcp.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'callTool',
                params: {
                    name: 'generate_image',
                    arguments: args
                }
            }) + '\\n');
            
            mcp.on('close', (code) => {
                if (code !== 0) {
                    console.error('MCP进程退出，代码:', code);
                    console.error('错误:', error);
                    process.exit(1);
                }
                
                try {
                    const response = JSON.parse(data);
                    console.log(JSON.stringify(response, null, 2));
                } catch (e) {
                    console.error('解析响应失败:', e);
                    console.error('原始响应:', data);
                    process.exit(1);
                }
            });
        `;
        
        // 执行命令
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);
        
        const { stdout, stderr } = await execPromise(`node -e "${command.replace(/"/g, '\\"')}"`);
        
        if (stderr) {
            console.error('执行命令出错:', stderr);
            throw new Error(stderr);
        }
        
        // 解析响应
        const response = JSON.parse(stdout);
        
        // 从响应中提取图片路径
        const resultText = response.result.content[0].text;
        const match = resultText.match(/Saved to: (.+?)$/m);
        
        if (!match) {
            throw new Error('无法从响应中提取图片路径');
        }
        
        const imagePath = match[1];
        
        return {
            path: imagePath,
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
        
        // 使用MCP工具调用实际的Stable Diffusion API
        console.log('调用Stable Diffusion MCP工具...');
        
        // 构建命令来调用MCP工具
        const command = `
            const { spawn } = require('child_process');
            const path = require('path');
            
            // 参数
            const args = {
                prompt: ${JSON.stringify(prompt)},
                negative_prompt: ${JSON.stringify(negative_prompt)},
                width: ${width},
                height: ${height},
                num_outputs: ${num_outputs}
            };
            
            // 启动MCP服务器进程
            const mcp = spawn('node', [path.join(process.env.HOME, 'Documents/Cline/MCP/stable-diffusion-mcp/build/index.js')], {
                env: {
                    ...process.env,
                    STABLE_DIFFUSION_API_KEY: 'sk-Wg1Y7yqXaP5xfGh07H9KDL0V1TZCYK8XDb5ImYVmTJg9fTEy'
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let data = '';
            let error = '';
            
            mcp.stdout.on('data', (chunk) => {
                data += chunk.toString();
            });
            
            mcp.stderr.on('data', (chunk) => {
                error += chunk.toString();
            });
            
            // 发送请求到MCP服务器
            mcp.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'callTool',
                params: {
                    name: 'generate_image',
                    arguments: args
                }
            }) + '\\n');
            
            mcp.on('close', (code) => {
                if (code !== 0) {
                    console.error('MCP进程退出，代码:', code);
                    console.error('错误:', error);
                    process.exit(1);
                }
                
                try {
                    const response = JSON.parse(data);
                    console.log(JSON.stringify(response, null, 2));
                } catch (e) {
                    console.error('解析响应失败:', e);
                    console.error('原始响应:', data);
                    process.exit(1);
                }
            });
        `;
        
        // 执行命令
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);
        
        const { stdout, stderr } = await execPromise(`node -e "${command.replace(/"/g, '\\"')}"`);
        
        if (stderr) {
            console.error('执行命令出错:', stderr);
            throw new Error(stderr);
        }
        
        // 解析响应
        const response = JSON.parse(stdout);
        
        // 从响应中提取图片URL
        const resultText = response.result.content[0].text;
        const responseData = JSON.parse(resultText);
        
        // 提取图片URL
        const images = responseData.artifacts.map(artifact => {
            // 将base64图片数据转换为数据URL
            return `data:image/png;base64,${artifact.base64}`;
        });
        
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
