#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 开发服务器配置
const config = {
  buildDir: 'dist',
  watchPaths: ['nodes', 'credentials'],
  debounceMs: 1000,
};

let buildTimeout;
let isBuilding = false;

// 清理构建目录
function cleanBuild() {
  console.log('🧹 清理构建目录...');
  if (fs.existsSync(config.buildDir)) {
    fs.rmSync(config.buildDir, { recursive: true, force: true });
  }
}

// 执行构建
function build() {
  if (isBuilding) return;
  
  isBuilding = true;
  console.log('🏗️  开始构建...');
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true
  });

  buildProcess.on('close', (code) => {
    isBuilding = false;
    if (code === 0) {
      console.log('✅ 构建成功！');
      console.log('📦 产物位置:', path.resolve(config.buildDir));
    } else {
      console.log('❌ 构建失败，错误码:', code);
    }
  });

  buildProcess.on('error', (error) => {
    isBuilding = false;
    console.error('❌ 构建错误:', error);
  });
}

// 防抖构建函数
function debouncedBuild() {
  clearTimeout(buildTimeout);
  buildTimeout = setTimeout(build, config.debounceMs);
}

// 监听文件变化
function watchFiles() {
  console.log('👀 开始监听文件变化...');
  
  config.watchPaths.forEach(watchPath => {
    if (!fs.existsSync(watchPath)) {
      console.log(`⚠️  警告: 监听路径不存在 ${watchPath}`);
      return;
    }
    
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
        console.log(`📝 文件变化: ${eventType} ${path.join(watchPath, filename)}`);
        debouncedBuild();
      }
    });
    
    console.log(`📁 监听: ${watchPath}`);
  });
}

// 主函数
function main() {
  console.log('🚀 启动开发服务器...');
  console.log('📋 配置:', JSON.stringify(config, null, 2));
  
  // 初始构建
  build();
  
  // 开始监听文件变化
  watchFiles();
  
  console.log('🎯 开发服务器运行中，按 Ctrl+C 退出');
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 停止开发服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 停止开发服务器...');
  process.exit(0);
});

main();