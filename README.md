# MCP客户端联动示例

这个项目展示了如何联动使用三个MCP（Model Context Protocol）客户端：weather、everart-forge和stable-diffusion，创建一个完整的工作流程。

## 工作流程

1. 使用weather-server获取指定城市的天气信息
2. 根据天气信息，使用everart-forge-mcp生成相应的天气图片
3. 使用stable-diffusion-mcp对生成的图片进行进一步处理

## 文件说明

本项目包含多个实现方式，展示了不同的MCP客户端联动方法：

### 1. weather_image_generator.html

这是一个使用Node.js服务器作为中间层的实现。它通过API调用来与MCP服务器通信。

**使用方法**：
1. 启动Node.js服务器：`node mcp_server.js`
2. 在浏览器中打开`weather_image_generator.html`
3. 输入城市名称，点击"生成天气图片"按钮

### 2. direct_mcp_client.html

这是一个模拟实现，展示了MCP客户端联动的界面和流程，但不实际调用MCP工具。

**使用方法**：
1. 在浏览器中直接打开`direct_mcp_client.html`
2. 按照界面提示操作

### 3. mcp_integration.html

这是一个尝试直接与Claude通信的实现，使用postMessage API来调用MCP工具。

**使用方法**：
1. 在浏览器中直接打开`mcp_integration.html`
2. 按照界面提示操作

### 4. claude_mcp_integration.html

这是一个使用Claude对话界面来调用MCP工具的实现。用户需要手动将生成的提示词复制到Claude对话框中。

**使用方法**：
1. 在浏览器中直接打开`claude_mcp_integration.html`
2. 按照界面提示操作，将生成的提示词复制到Claude对话框中

## 使用建议

对于实际使用，我们建议：

1. 如果您有Node.js环境，使用`weather_image_generator.html`和`mcp_server.js`的组合，这提供了最完整的自动化体验。

2. 如果您想直接在Claude界面中操作，使用`claude_mcp_integration.html`，它会生成适当的提示词，您只需复制到Claude对话框中即可。

## MCP服务器要求

要运行这些示例，您需要以下MCP服务器：

1. weather-server - 提供天气信息
2. github.com/nickbaumann98/everart-forge-mcp - 生成图片
3. stable-diffusion - 处理图片

确保这些服务器已在您的Claude配置中正确设置。

## 自定义

您可以通过修改HTML文件中的`weatherPrompts`对象来自定义不同天气条件下的提示词。这允许您根据自己的喜好调整生成的图片风格。
