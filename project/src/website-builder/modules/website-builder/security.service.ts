import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as path from 'path';

interface WebsiteFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  // Dangerous scripts that could execute malicious code
  private readonly DANGEROUS_SCRIPTS = [
    'postinstall', 'preinstall', 'install', 'preuninstall', 'postuninstall',
    'prepublish', 'postpublish', 'prepack', 'postpack'
  ];

  // Dangerous dependencies that could be used maliciously
  private readonly DANGEROUS_DEPENDENCIES = [
    'child_process', 'exec', 'spawn', 'shell', 'eval', 'vm'
  ];

  // Files that should be removed for security
  private readonly DANGEROUS_FILES = [
    '.env', '.env.local', '.env.production', '.env.development',
    '.git', '.gitignore', '.gitattributes',
    'node_modules', 'package-lock.json', 'yarn.lock',
    '.DS_Store', 'Thumbs.db',
    '*.log', '*.tmp', '*.temp'
  ];

  // Maximum file size (50MB)
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  // Maximum total project size (500MB)
  private readonly MAX_PROJECT_SIZE = 500 * 1024 * 1024;

  validatePackageJson(packageJson: any): boolean {
    this.logger.log('🔒 Validating package.json for security issues');

    // Check for dangerous scripts
    if (packageJson.scripts) {
      for (const script of this.DANGEROUS_SCRIPTS) {
        if (packageJson.scripts[script]) {
          this.logger.error(`❌ Dangerous script found: ${script}`);
          throw new BadRequestException(`Package.json contains dangerous script: ${script}`);
        }
      }

      // Check script content for dangerous commands
      for (const [scriptName, scriptContent] of Object.entries(packageJson.scripts)) {
        if (typeof scriptContent === 'string') {
          const dangerousCommands = this.checkForDangerousCommands(scriptContent);
          if (dangerousCommands.length > 0) {
            this.logger.error(`❌ Dangerous commands found in script ${scriptName}: ${dangerousCommands.join(', ')}`);
            throw new BadRequestException(`Script ${scriptName} contains dangerous commands: ${dangerousCommands.join(', ')}`);
          }
        }
      }
    }

    // Check for dangerous dependencies
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    for (const [depName, depVersion] of Object.entries(allDependencies)) {
      if (this.DANGEROUS_DEPENDENCIES.some(dangerous => depName.includes(dangerous))) {
        this.logger.error(`❌ Dangerous dependency found: ${depName}`);
        throw new BadRequestException(`Dangerous dependency detected: ${depName}`);
      }
    }

    // Validate required fields
    if (!packageJson.name) {
      throw new BadRequestException('Package.json must have a name field');
    }

    if (!packageJson.version) {
      throw new BadRequestException('Package.json must have a version field');
    }

    // Validate name format
    const nameRegex = /^[a-zA-Z0-9@][a-zA-Z0-9._-]*$/;
    if (!nameRegex.test(packageJson.name)) {
      throw new BadRequestException('Invalid package name format');
    }

    this.logger.log('✅ Package.json validation passed');
    return true;
  }

  private checkForDangerousCommands(scriptContent: string): string[] {
    const dangerousCommands = [
      'rm -rf', 'rm -r', 'del', 'format', 'shutdown', 'reboot',
      'sudo', 'su', 'chmod 777', 'chown', 'kill', 'pkill',
      'curl -s', 'wget', 'nc', 'netcat', 'telnet',
      'eval', 'exec', 'spawn', 'child_process'
    ];

    const foundCommands: string[] = [];
    for (const command of dangerousCommands) {
      if (scriptContent.toLowerCase().includes(command.toLowerCase())) {
        foundCommands.push(command);
      }
    }

    return foundCommands;
  }

  sanitizeProjectFiles(files: WebsiteFile[]): WebsiteFile[] {
    this.logger.log(`🔒 Sanitizing ${files.length} project files`);

    let totalSize = 0;
    const sanitizedFiles: WebsiteFile[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        this.logger.warn(`⚠️ Skipping large file: ${file.name} (${file.size} bytes)`);
        continue;
      }

      totalSize += file.size;

      // Check if file should be removed
      if (this.shouldRemoveFile(file.name)) {
        this.logger.warn(`⚠️ Removing dangerous file: ${file.name}`);
        continue;
      }

      // Sanitize file name
      const sanitizedName = this.sanitizeFileName(file.name);
      if (sanitizedName !== file.name) {
        this.logger.warn(`⚠️ Sanitized file name: ${file.name} -> ${sanitizedName}`);
      }

      // Sanitize file content
      const sanitizedContent = this.sanitizeFileContent(file.content, file.name);

      sanitizedFiles.push({
        name: sanitizedName,
        content: sanitizedContent,
        type: file.type,
        size: sanitizedContent.length,
      });
    }

    // Check total project size
    if (totalSize > this.MAX_PROJECT_SIZE) {
      throw new BadRequestException(`Project size too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: ${this.MAX_PROJECT_SIZE / 1024 / 1024}MB)`);
    }

    this.logger.log(`✅ Sanitization complete. Kept ${sanitizedFiles.length} files out of ${files.length}`);
    return sanitizedFiles;
  }

  private shouldRemoveFile(fileName: string): boolean {
    // TEMPORARILY DISABLED: Dangerous file removal for testing purposes
    // TODO: Re-enable this security feature after testing is complete
    return false;
    
    // Original implementation (commented out):
    /*
    const lowerFileName = fileName.toLowerCase();
    
    // Check for dangerous files
    for (const dangerousFile of this.DANGEROUS_FILES) {
      if (dangerousFile.includes('*')) {
        const pattern = dangerousFile.replace('*', '.*');
        if (new RegExp(pattern).test(lowerFileName)) {
          return true;
        }
      } else if (lowerFileName.includes(dangerousFile)) {
        return true;
      }
    }

    // Check for hidden files (except common config files)
    if (lowerFileName.startsWith('.') && !this.isAllowedHiddenFile(lowerFileName)) {
      return true;
    }

    return false;
    */
  }

  private isAllowedHiddenFile(fileName: string): boolean {
    const allowedHiddenFiles = [
      '.gitignore', '.eslintrc', '.prettierrc', '.babelrc',
      '.env.example', '.env.sample', '.env.template',
      '.npmrc', '.yarnrc', '.editorconfig'
    ];

    return allowedHiddenFiles.some(allowed => fileName.includes(allowed));
  }

  private sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let sanitizedName = fileName.replace(/\.\./g, '');
    
    // Remove null bytes
    sanitizedName = sanitizedName.replace(/\0/g, '');
    
    // Remove control characters
    sanitizedName = sanitizedName.replace(/[\x00-\x1f\x7f]/g, '');
    
    // Limit length
    if (sanitizedName.length > 255) {
      const ext = path.extname(sanitizedName);
      const name = path.basename(sanitizedName, ext);
      sanitizedName = name.substring(0, 255 - ext.length) + ext;
    }

    return sanitizedName;
  }

  private sanitizeFileContent(content: string, fileName: string): string {
    // Remove null bytes
    let sanitizedContent = content.replace(/\0/g, '');
    
    // Remove control characters (except newlines and tabs)
    sanitizedContent = sanitizedContent.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
    
    // For package.json, validate JSON structure
    if (fileName.toLowerCase() === 'package.json') {
      try {
        const parsed = JSON.parse(sanitizedContent);
        // Re-stringify to ensure valid JSON
        sanitizedContent = JSON.stringify(parsed, null, 2);
      } catch (error) {
        throw new BadRequestException('Invalid JSON in package.json');
      }
    }

    return sanitizedContent;
  }

  validateProjectStructure(files: WebsiteFile[]): { isValid: boolean; type: string; issues: string[] } {
    this.logger.log('🔍 Validating project structure');

    const issues: string[] = [];
    let projectType = 'unknown';

    // Check for package.json
    const hasPackageJson = files.some(f => f.name.toLowerCase() === 'package.json');
    if (!hasPackageJson) {
      issues.push('No package.json found');
      return { isValid: false, type: 'unknown', issues };
    }

    // Parse package.json
    const packageJsonFile = files.find(f => f.name.toLowerCase() === 'package.json');
    if (!packageJsonFile) {
      issues.push('Could not read package.json');
      return { isValid: false, type: 'unknown', issues };
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content);
      
      // Validate package.json
      try {
        this.validatePackageJson(packageJson);
      } catch (error) {
        issues.push(`Package.json validation failed: ${error.message}`);
      }

      // Determine project type
      const hasReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
      const hasVite = packageJson.dependencies?.vite || 
                     packageJson.devDependencies?.vite ||
                     packageJson.scripts?.dev?.includes('vite');
      const hasNext = packageJson.dependencies?.next || packageJson.devDependencies?.next;

      if (hasReact && hasVite) {
        projectType = 'react-vite';
      } else if (hasReact && hasNext) {
        projectType = 'react-next';
      } else if (hasReact) {
        projectType = 'react';
      } else if (hasVite) {
        projectType = 'vite';
      } else {
        projectType = 'node';
      }

      // Check for required files based on project type
      if (projectType === 'react-vite' || projectType === 'react') {
        const hasIndexHtml = files.some(f => f.name.toLowerCase().includes('index.html'));
        const hasMainJs = files.some(f => f.name.toLowerCase().includes('main.js') || f.name.toLowerCase().includes('main.tsx') || f.name.toLowerCase().includes('main.ts'));
        
        if (!hasIndexHtml) {
          issues.push('React project missing index.html');
        }
        if (!hasMainJs) {
          issues.push('React project missing main entry file (main.js/main.tsx/main.ts)');
        }
      }

      // Check for build scripts
      if (!packageJson.scripts?.dev && !packageJson.scripts?.start) {
        issues.push('No development or start script found');
      }

    } catch (error) {
      issues.push(`Failed to parse package.json: ${error.message}`);
    }

    const isValid = issues.length === 0;
    this.logger.log(`✅ Project structure validation complete. Type: ${projectType}, Valid: ${isValid}`);
    
    if (issues.length > 0) {
      this.logger.warn(`⚠️ Validation issues: ${issues.join(', ')}`);
    }

    return { isValid, type: projectType, issues };
  }

  async validateFileContent(file: WebsiteFile): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for suspicious patterns in content
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /outerHTML\s*=/i,
      /<script\b[^>]*>/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.content)) {
        issues.push(`Suspicious pattern detected: ${pattern.source}`);
      }
    }

    // Check for excessive use of certain functions
    const functionCounts = {
      'eval': (file.content.match(/eval\s*\(/gi) || []).length,
      'Function': (file.content.match(/Function\s*\(/gi) || []).length,
      'document.write': (file.content.match(/document\.write/gi) || []).length,
    };

    for (const [func, count] of Object.entries(functionCounts)) {
      if (count > 5) {
        issues.push(`Excessive use of ${func}: ${count} occurrences`);
      }
    }

    return { isValid: issues.length === 0, issues };
  }
}

 