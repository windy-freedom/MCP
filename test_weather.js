const { exec } = require('child_process');

// 测试天气MCP工具
async function testWeatherTool(city) {
    return new Promise((resolve, reject) => {
        const command = `node -e "
            const { Server } = require('@modelcontextprotocol/sdk/server');
            const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');
            
            async function main() {
                const server = new Server({
                    name: 'weather-test-client',
                    version: '0.1.0'
                });
                
                const transport = new StdioServerTransport();
                await server.connect(transport);
                
                try {
                    console.log('正在调用weather MCP工具...');
                    const result = await server.callTool('weather', 'get_current_weather', { city: '${city}' });
                    console.log('调用成功，结果:');
                    console.log(JSON.stringify(result, null, 2));
                    await server.close();
                } catch (error) {
                    console.error('调用失败:');
                    console.error(error);
                    process.exit(1);
                }
            }
            
            main().catch(console.error);
        "`;
        
        console.log(`测试城市: ${city}`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行命令时出错: ${error}`);
                console.error(`错误输出: ${stderr}`);
                return reject(new Error(`获取天气信息失败: ${stderr}`));
            }
            
            console.log(`命令输出: ${stdout}`);
            try {
                // 尝试解析JSON结果
                if (stdout.trim()) {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } else {
                    reject(new Error('没有返回数据'));
                }
            } catch (e) {
                console.error(`解析输出失败: ${e.message}`);
                reject(new Error(`解析天气数据失败: ${e.message}`));
            }
        });
    });
}

// 测试几个城市
async function runTests() {
    try {
        // 测试北京
        console.log('===== 测试北京 =====');
        await testWeatherTool('Beijing');
        
        // 测试上海
        console.log('\n===== 测试上海 =====');
        await testWeatherTool('Shanghai');
        
        // 测试中文城市名
        console.log('\n===== 测试中文城市名 =====');
        await testWeatherTool('北京');
        
    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

runTests();
