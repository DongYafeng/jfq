// 生成棋牌计分器LOGO的脚本
// 使用Canvas API生成144x144的PNG图标

const fs = require('fs');
const { createCanvas } = require('canvas');

function generateLogo() {
    // 创建144x144的画布
    const canvas = createCanvas(144, 144);
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, 144, 144);
    
    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 144, 144);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    // 绘制圆角矩形背景
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, 8, 8, 128, 128, 24);
    ctx.fill();
    
    // 绘制计算器主体
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    roundRect(ctx, 28, 24, 88, 96, 8);
    ctx.fill();
    
    // 绘制显示屏
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    roundRect(ctx, 36, 32, 72, 20, 4);
    ctx.fill();
    
    // 绘制显示屏文字
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1000', 72, 46);
    
    // 绘制按钮网格
    const buttonColors = [
        ['#667eea', '#667eea', '#667eea', '#f56565'],
        ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#f56565'],
        ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#48bb78'],
    ];
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            ctx.fillStyle = buttonColors[row][col];
            ctx.beginPath();
            roundRect(ctx, 40 + col * 18, 60 + row * 16, 14, 12, 2);
            ctx.fill();
        }
    }
    
    // 绘制底部长按钮
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    roundRect(ctx, 40, 108, 32, 8, 2);
    ctx.fill();
    
    ctx.beginPath();
    roundRect(ctx, 76, 108, 14, 8, 2);
    ctx.fill();
    
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    roundRect(ctx, 94, 108, 14, 8, 2);
    ctx.fill();
    
    // 绘制棋牌装饰元素
    ctx.fillStyle = '#f56565';
    ctx.beginPath();
    ctx.arc(108, 36, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('♠', 108, 40);
    
    // 绘制底部文字
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('计分', 72, 134);
    
    // 绘制装饰光效
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(24, 24, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(120, 120, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 保存为PNG文件
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('logo.png', buffer);
    
    console.log('✅ LOGO已生成: logo.png (144x144px)');
    console.log('📁 文件大小:', (buffer.length / 1024).toFixed(2), 'KB');
}

// 圆角矩形绘制函数
function roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 检查是否安装了canvas模块
try {
    generateLogo();
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.log('❌ 需要安装canvas模块');
        console.log('💡 请运行: npm install canvas');
        console.log('');
        console.log('🎨 或者直接使用浏览器版本:');
        console.log('   打开 logo-design.html 文件下载PNG格式LOGO');
    } else {
        console.error('生成LOGO时出错:', error);
    }
}