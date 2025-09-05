/**
 * 🚀 Bundle Optimization Analyzer
 * Advanced bundle analysis and optimization recommendations
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { gzipSync } from 'zlib';

class BundleOptimizer {
  constructor(distPath = './dist') {
    this.distPath = distPath;
    this.results = {
      chunks: [],
      recommendations: [],
      totalSize: 0,
      gzippedSize: 0,
      optimizationPotential: 0
    };
  }

  async analyze() {
    console.log('🔍 Starting advanced bundle analysis...\n');
    
    await this.scanChunks();
    await this.generateRecommendations();
    await this.generateReport();
    
    return this.results;
  }

  async scanChunks() {
    const files = await readdir(this.distPath, { recursive: true });
    const jsFiles = files.filter(file => file.endsWith('.js'));

    for (const file of jsFiles) {
      const filePath = join(this.distPath, file);
      const content = await readFile(filePath, 'utf8');
      const size = Buffer.byteLength(content, 'utf8');
      const gzippedSize = gzipSync(content).length;

      this.results.chunks.push({
        name: file,
        size,
        gzippedSize,
        compressionRatio: ((size - gzippedSize) / size * 100).toFixed(1),
        type: this.categorizeChunk(file, content)
      });

      this.results.totalSize += size;
      this.results.gzippedSize += gzippedSize;
    }

    // Sort by size (largest first)
    this.results.chunks.sort((a, b) => b.size - a.size);
  }

  categorizeChunk(filename, content) {
    if (filename.includes('vendor-react')) return 'react-ecosystem';
    if (filename.includes('vendor-safe')) return 'safe-vendor';
    if (filename.includes('vendor-supabase')) return 'database';
    if (filename.includes('vendor-utils')) return 'utilities';
    if (filename.includes('index')) return 'main-app';
    if (filename.includes('Analytics')) return 'analytics';
    if (filename.includes('Tables')) return 'tables';
    return 'unknown';
  }

  async generateRecommendations() {
    const largeChunks = this.results.chunks.filter(chunk => chunk.size > 500000); // 500KB+
    const lowCompressionChunks = this.results.chunks.filter(chunk => 
      parseFloat(chunk.compressionRatio) < 70 // Less than 70% compression
    );

    // Large chunk recommendations
    for (const chunk of largeChunks) {
      if (chunk.type === 'main-app') {
        this.results.recommendations.push({
          type: 'code-splitting',
          severity: 'high',
          message: `Main app chunk (${this.formatSize(chunk.size)}) is too large. Consider lazy loading routes and components.`,
          chunk: chunk.name,
          estimatedSavings: Math.floor(chunk.size * 0.3) // 30% potential savings
        });
      }

      if (chunk.type === 'safe-vendor' && chunk.size > 1000000) {
        this.results.recommendations.push({
          type: 'vendor-splitting',
          severity: 'medium',
          message: `Vendor chunk (${this.formatSize(chunk.size)}) could be split further. Consider separating UI libraries from utilities.`,
          chunk: chunk.name,
          estimatedSavings: Math.floor(chunk.size * 0.2)
        });
      }
    }

    // Compression recommendations
    for (const chunk of lowCompressionChunks) {
      this.results.recommendations.push({
        type: 'compression',
        severity: 'low',
        message: `${chunk.name} has low compression ratio (${chunk.compressionRatio}%). May contain binary data or already compressed content.`,
        chunk: chunk.name,
        estimatedSavings: 0
      });
    }

    // Calculate total optimization potential
    this.results.optimizationPotential = this.results.recommendations
      .reduce((total, rec) => total + (rec.estimatedSavings || 0), 0);
  }

  async generateReport() {
    const report = this.buildTextReport();
    await writeFile('./bundle-optimization-report.md', report);
    console.log(report);
  }

  buildTextReport() {
    const totalMB = (this.results.totalSize / 1024 / 1024).toFixed(2);
    const gzippedMB = (this.results.gzippedSize / 1024 / 1024).toFixed(2);
    const compressionRatio = ((this.results.totalSize - this.results.gzippedSize) / this.results.totalSize * 100).toFixed(1);

    let report = `# 📊 Bundle Optimization Report\n\n`;
    report += `## 🎯 Summary\n`;
    report += `- **Total Bundle Size**: ${totalMB} MB (${this.formatSize(this.results.totalSize)})\n`;
    report += `- **Gzipped Size**: ${gzippedMB} MB (${this.formatSize(this.results.gzippedSize)})\n`;
    report += `- **Compression Ratio**: ${compressionRatio}%\n`;
    report += `- **Optimization Potential**: ${this.formatSize(this.results.optimizationPotential)}\n\n`;

    report += `## 📦 Chunk Analysis\n\n`;
    report += `| Chunk | Size | Gzipped | Compression | Type |\n`;
    report += `|-------|------|---------|-------------|------|\n`;
    
    for (const chunk of this.results.chunks) {
      report += `| ${chunk.name} | ${this.formatSize(chunk.size)} | ${this.formatSize(chunk.gzippedSize)} | ${chunk.compressionRatio}% | ${chunk.type} |\n`;
    }

    if (this.results.recommendations.length > 0) {
      report += `\n## 🚀 Optimization Recommendations\n\n`;
      
      const highPriority = this.results.recommendations.filter(r => r.severity === 'high');
      const mediumPriority = this.results.recommendations.filter(r => r.severity === 'medium');
      const lowPriority = this.results.recommendations.filter(r => r.severity === 'low');

      if (highPriority.length > 0) {
        report += `### 🔥 High Priority\n`;
        for (const rec of highPriority) {
          report += `- **${rec.type}**: ${rec.message}\n`;
          if (rec.estimatedSavings > 0) {
            report += `  - *Estimated savings: ${this.formatSize(rec.estimatedSavings)}*\n`;
          }
        }
        report += `\n`;
      }

      if (mediumPriority.length > 0) {
        report += `### ⚡ Medium Priority\n`;
        for (const rec of mediumPriority) {
          report += `- **${rec.type}**: ${rec.message}\n`;
          if (rec.estimatedSavings > 0) {
            report += `  - *Estimated savings: ${this.formatSize(rec.estimatedSavings)}*\n`;
          }
        }
        report += `\n`;
      }

      if (lowPriority.length > 0) {
        report += `### 💡 Low Priority\n`;
        for (const rec of lowPriority) {
          report += `- **${rec.type}**: ${rec.message}\n`;
        }
      }
    } else {
      report += `\n## ✅ Excellent!\nNo major optimization opportunities found. Your bundle is well-optimized!\n`;
    }

    return report;
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export for use in build process
export default BundleOptimizer;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new BundleOptimizer();
  optimizer.analyze().catch(console.error);
}
