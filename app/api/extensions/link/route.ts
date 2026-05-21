import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcePath, path: pathParam } = body;
    const linkPath = sourcePath || pathParam;

    if (!linkPath) {
      return NextResponse.json(
        { error: 'Source path is required (use "path" or "sourcePath" parameter)' },
        { status: 400 }
      );
    }

    // Resolve absolute path
    const absoluteSource = path.isAbsolute(linkPath)
      ? linkPath
      : path.resolve(/*turbopackIgnore: true*/ process.cwd(), linkPath);

    // Check if source exists
    try {
      await fs.access(absoluteSource);
    } catch {
      return NextResponse.json(
        { error: `Source path does not exist: ${absoluteSource}` },
        { status: 400 }
      );
    }

    // Read metadata from source
    const indexPath = path.join(absoluteSource, 'index.ts');
    let extensionName;
    let metadata: any = {};

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');

      // Extract metadata fields from the metadata object
      const nameMatch = indexContent.match(/name:\s*['"]([^'"]+)['"]/);
      const displayNameMatch = indexContent.match(/displayName:\s*['"]([^'"]+)['"]/);
      const versionMatch = indexContent.match(/version:\s*['"]([^'"]+)['"]/);
      const authorMatch = indexContent.match(/author:\s*['"]([^'"]+)['"]/);
      const descriptionMatch = indexContent.match(/description:\s*['"]([^'"]+)['"]/);
      const categoryMatch = indexContent.match(/category:\s*['"]([^'"]+)['"]/);
      const iconMatch = indexContent.match(/icon:\s*['"]([^'"]+)['"]/);

      if (nameMatch) {
        extensionName = nameMatch[1];
        metadata.name = nameMatch[1];
      } else {
        throw new Error('Could not find name in metadata');
      }

      if (displayNameMatch) metadata.displayName = displayNameMatch[1];
      if (versionMatch) metadata.version = versionMatch[1];
      if (authorMatch) metadata.author = authorMatch[1];
      if (descriptionMatch) metadata.description = descriptionMatch[1];
      if (categoryMatch) metadata.category = categoryMatch[1];
      if (iconMatch) metadata.icon = iconMatch[1];

    } catch (error: any) {
      return NextResponse.json(
        { error: `Could not read metadata: ${error.message}` },
        { status: 400 }
      );
    }

    if (!extensionName) {
      return NextResponse.json(
        { error: 'Extension name not found in metadata' },
        { status: 400 }
      );
    }

    // Create symlink in extensions directory
    const targetPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'extensions', 'changerawr', extensionName);

    // Remove existing symlink/directory if it exists
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Create symlink
    try {
      await fs.symlink(absoluteSource, targetPath, 'junction');
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to create symlink: ${error.message}` },
        { status: 500 }
      );
    }

    // Create extension.json in the source directory if it doesn't exist
    const extensionJsonPath = path.join(absoluteSource, 'extension.json');
    try {
      await fs.access(extensionJsonPath);
    } catch {
      // extension.json doesn't exist, create it
      try {
        await fs.writeFile(
          extensionJsonPath,
          JSON.stringify(metadata, null, 2),
          'utf-8'
        );
      } catch (error: any) {
        console.warn('Failed to create extension.json:', error.message);
      }
    }

    // Register extension in database
    try {
      await db.editorExtension.upsert({
        where: { name: extensionName },
        create: {
          name: extensionName,
          displayName: metadata.displayName || extensionName,
          version: metadata.version || '0.0.0',
          author: metadata.author,
          description: metadata.description,
          category: metadata.category,
          isBuiltIn: false,
          isEnabled: true,
          isLinked: true,
          sourceType: 'CUSTOM',
          sourceUrl: absoluteSource,
        },
        update: {
          version: metadata.version || '0.0.0',
          displayName: metadata.displayName || extensionName,
          author: metadata.author,
          description: metadata.description,
          category: metadata.category,
          isLinked: true,
          sourceUrl: absoluteSource,
        },
      });
    } catch (error: any) {
      console.warn('Failed to register extension in database:', error.message);
    }

    // Trigger extension regeneration script
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npm run extensions:generate', {
        cwd: /*turbopackIgnore: true*/ process.cwd(),
      });
    } catch (error: any) {
      console.warn('Failed to regenerate extensions:', error.message);
    }

    return NextResponse.json({
      success: true,
      message: `Extension '${extensionName}' linked successfully. Restart dev server to see changes.`,
      path: targetPath,
      needsRestart: true
    });

  } catch (error: any) {
    console.error('Extension link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link extension' },
      { status: 500 }
    );
  }
}
