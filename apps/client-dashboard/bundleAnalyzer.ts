/**
 * Bundle Size Analyzer
 * Analyzes webpack/vite bundle output and provides optimization insights
 */

interface BundleChunk {
  fileName: string;
  size: number;
  modules?: string[];
  isEntry?: boolean;
  isDynamicEntry?: boolean;
}

interface BundleAnalysis {
  totalSize: number;
  chunkCount: number;
  largestChunks: BundleChunk[];
  recommendations: string[];
  duplicatedModules: string[];
}

export function analyzeBundleSize(bundle: Record<string, any>): BundleAnalysis {
  const chunks: BundleChunk[] = [];
  let totalSize = 0;
  const moduleMap = new Map<string, string[]>();

  // Analyze each chunk in the bundle
  for (const [fileName, chunk] of Object.entries(bundle)) {
    if (chunk.type === 'chunk') {
      const chunkData: BundleChunk = {
        fileName,
        size: chunk.code ? new Blob([chunk.code]).size : 0,
        modules: chunk.modules ? Object.keys(chunk.modules) : [],
        isEntry: chunk.isEntry,
        isDynamicEntry: chunk.isDynamicEntry
      };

      chunks.push(chunkData);
      totalSize += chunkData.size;

      // Track modules for duplication analysis
      if (chunkData.modules) {
        for (const moduleName of chunkData.modules) {
          if (!moduleMap.has(moduleName)) {
            moduleMap.set(moduleName, []);
          }
          moduleMap.get(moduleName)!.push(fileName);
        }
      }
    }
  }

  // Find duplicated modules
  const duplicatedModules = Array.from(moduleMap.entries())
    .filter(([, chunks]) => chunks.length > 1)
    .map(([module]) => module);

  // Sort chunks by size (largest first)
  const largestChunks = chunks
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  // Generate recommendations
  const recommendations = generateRecommendations(chunks, duplicatedModules, totalSize);

  const analysis: BundleAnalysis = {
    totalSize,
    chunkCount: chunks.length,
    largestChunks,
    recommendations,
    duplicatedModules
  };

  // Log analysis results
  console.group('📦 Bundle Analysis Results');
  console.log(`Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`Number of Chunks: ${chunks.length}`);
  
  if (largestChunks.length > 0) {
    console.log('\n🔍 Largest Chunks:');
    largestChunks.forEach((chunk, index) => {
      console.log(`${index + 1}. ${chunk.fileName}: ${formatBytes(chunk.size)}`);
    });
  }

  if (duplicatedModules.length > 0) {
    console.log('\n⚠️ Duplicated Modules:');
    duplicatedModules.slice(0, 5).forEach(module => {
      const chunks = moduleMap.get(module) || [];
      console.log(`- ${module} (in ${chunks.length} chunks)`);
    });
  }

  if (recommendations.length > 0) {
    console.log('\n💡 Optimization Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  console.groupEnd();

  return analysis;
}

function generateRecommendations(
  chunks: BundleChunk[], 
  duplicatedModules: string[], 
  totalSize: number
): string[] {
  const recommendations: string[] = [];

  // Check total bundle size
  if (totalSize > 1024 * 1024) { // > 1MB
    recommendations.push('Consider code splitting - total bundle size is large');
  }

  // Check for large individual chunks
  const largeChunks = chunks.filter(chunk => chunk.size > 500 * 1024); // > 500KB
  if (largeChunks.length > 0) {
    recommendations.push(`${largeChunks.length} chunks are larger than 500KB - consider splitting them`);
  }

  // Check for duplicated modules
  if (duplicatedModules.length > 0) {
    recommendations.push(`${duplicatedModules.length} modules are duplicated across chunks - optimize vendor splitting`);
  }

  // Check for too many chunks
  if (chunks.length > 50) {
    recommendations.push('Consider reducing the number of chunks to improve HTTP/2 performance');
  }

  // Check for entry chunk size
  const entryChunks = chunks.filter(chunk => chunk.isEntry);
  const largeEntryChunks = entryChunks.filter(chunk => chunk.size > 200 * 1024); // > 200KB
  if (largeEntryChunks.length > 0) {
    recommendations.push('Entry chunks are large - move non-critical code to dynamic imports');
  }

  // Check for vendor chunk optimization
  const vendorChunks = chunks.filter(chunk => 
    chunk.fileName.includes('vendor') || chunk.fileName.includes('node_modules')
  );
  if (vendorChunks.length === 0) {
    recommendations.push('Consider creating vendor chunks for better caching');
  }

  return recommendations;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for use in build scripts
export function generateBundleReport(analysis: BundleAnalysis): string {
  const report = `
# Bundle Analysis Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Size**: ${formatBytes(analysis.totalSize)}
- **Chunk Count**: ${analysis.chunkCount}
- **Duplicated Modules**: ${analysis.duplicatedModules.length}

## Largest Chunks
${analysis.largestChunks.map((chunk, i) => 
  `${i + 1}. ${chunk.fileName}: ${formatBytes(chunk.size)}`
).join('\n')}

## Recommendations
${analysis.recommendations.map((rec, i) => 
  `${i + 1}. ${rec}`
).join('\n')}

${analysis.duplicatedModules.length > 0 ? `
## Duplicated Modules
${analysis.duplicatedModules.slice(0, 10).map(mod => `- ${mod}`).join('\n')}
` : ''}
  `.trim();

  return report;
}

export type { BundleChunk, BundleAnalysis };
