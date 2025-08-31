#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 简单的TypeScript代码质量检查
class SimpleLinter {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // 检查文件
  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 基本代码质量检查
      this.checkBasicRules(line, lineNum, filePath);
    });
  }

  checkBasicRules(line, lineNum, filePath) {
    // 检查console.log
    if (line.includes('console.log') && !line.includes('// ')) {
      this.warnings.push(`${filePath}:${lineNum} - Found console.log (should use debug logging)`);
    }

    // 检查TODO/FIXME
    if (line.includes('TODO') || line.includes('FIXME')) {
      this.warnings.push(`${filePath}:${lineNum} - Found TODO/FIXME comment`);
    }

    // 检查可能的密钥泄漏
    const secretPatterns = [
      /password\s*[:=]\s*["'][^"']{3,}["']/i,
      /secret\s*[:=]\s*["'][^"']{10,}["']/i,
      /key\s*[:=]\s*["'][^"']{10,}["']/i
    ];
    
    secretPatterns.forEach(pattern => {
      if (pattern.test(line) && !line.includes('displayName') && !line.includes('description')) {
        this.errors.push(`${filePath}:${lineNum} - Potential secret/password in code`);
      }
    });

    // 检查长行（基本的）
    if (line.length > 120) {
      this.warnings.push(`${filePath}:${lineNum} - Line too long (${line.length} > 120 chars)`);
    }

    // 检查var使用
    if (line.match(/\bvar\s+/)) {
      this.errors.push(`${filePath}:${lineNum} - Use 'const' or 'let' instead of 'var'`);
    }
  }

  // 递归检查目录
  checkDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(file)) {
        this.checkDirectory(filePath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        this.checkFile(filePath);
      }
    });
  }

  // 生成报告
  generateReport() {
    console.log('🔍 简单代码质量检查结果:\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ 没有发现问题！');
      return true;
    }

    if (this.errors.length > 0) {
      console.log('❌ 错误:');
      this.errors.forEach(error => console.log(`  ${error}`));
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  警告:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
      console.log();
    }

    console.log(`📊 总计: ${this.errors.length} 个错误, ${this.warnings.length} 个警告`);
    
    // 只有错误才返回失败状态
    return this.errors.length === 0;
  }
}

// 主函数
function main() {
  console.log('🚀 启动简单代码检查器...\n');
  
  const linter = new SimpleLinter();
  
  // 检查目标目录
  const checkDirs = ['nodes', 'credentials'];
  
  checkDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 检查目录: ${dir}`);
      linter.checkDirectory(dir);
    }
  });
  
  const success = linter.generateReport();
  
  if (!success) {
    console.log('\n💡 提示: 这是一个简化的检查器。完整的ESLint检查可能需要修复依赖问题。');
    process.exit(1);
  }
  
  process.exit(0);
}

main();