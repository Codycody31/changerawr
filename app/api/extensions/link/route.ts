import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

export async function POST(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { sourcePath, path: pathParam } = body;
    const linkPath = sourcePath || pathParam;

    if (!linkPath) {
      return NextResponse.json(
        { error: 'Source path is required (use "path" or "sourcePath" parameter)' },
        { status: 400 }
      );
    }

    const absoluteSource = path.isAbsolute(linkPath)
      ? linkPath
      : path.resolve(/*turbopackIgnore: true*/ process.cwd(), linkPath);

    try {
      await fs.access(absoluteSource);
    } catch {
      return NextResponse.json(
        { error: `Source path does not exist: ${absoluteSource}` },
        { status: 400 }
      );
    }

    // ── Read metadata (extension.json first, fall back to index.ts regex) ──
    const indexPath = path.join(absoluteSource, 'index.ts');
    let extensionName: string | undefined;
    let metadata: any = {};

    try {
      const json = JSON.parse(await fs.readFile(path.join(absoluteSource, 'extension.json'), 'utf-8'));
      extensionName = json.name;
      metadata = { ...json };
    } catch {
      try {
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const nameMatch = indexContent.match(/name:\s*['"]([^'"]+)['"]/);
        if (!nameMatch) throw new Error('Could not find name field');
        extensionName = nameMatch[1];
        metadata.name = extensionName;
        const pick = (re: RegExp) => indexContent.match(re)?.[1];
        metadata.displayName = pick(/displayName:\s*['"]([^'"]+)['"]/);
        metadata.version     = pick(/version:\s*['"]([^'"]+)['"]/);
        metadata.author      = pick(/author:\s*['"]([^'"]+)['"]/);
        metadata.description = pick(/description:\s*['"]([^'"]+)['"]/);
        metadata.category    = pick(/category:\s*['"]([^'"]+)['"]/);
        metadata.icon        = pick(/icon:\s*['"]([^'"]+)['"]/);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Could not read extension metadata: ${error.message}` },
          { status: 400 }
        );
      }
    }

    if (!extensionName) {
      return NextResponse.json({ error: 'Extension name not found in metadata' }, { status: 400 });
    }

    const authorDir = (metadata.author as string | undefined)
      ?.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'community';

    const targetPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'extensions', authorDir, extensionName);

    // Ensure the author directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Remove any existing junction/directory at the target path
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch {
      // Ignore — may not exist
    }

    // Create junction (Windows directory symlink that requires no admin privileges)
    try {
      await fs.symlink(absoluteSource, targetPath, 'junction');
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to create symlink: ${error.message}` },
        { status: 500 }
      );
    }

    // Write extension.json into source if it was missing (index.ts fallback path)
    const srcExtJson = path.join(absoluteSource, 'extension.json');
    try {
      await fs.access(srcExtJson);
    } catch {
      await fs.writeFile(srcExtJson, JSON.stringify(metadata, null, 2), 'utf-8').catch(() => {});
    }

    // ── Database registration ─────────────────────────────────────────────
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

    // ── Regenerate extension imports ──────────────────────────────────────
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npm run extensions:generate', { cwd: /*turbopackIgnore: true*/ process.cwd() });
    } catch (error: any) {
      console.warn('Failed to regenerate extensions:', error.message);
    }

    return NextResponse.json({
      success: true,
      message: `Extension '${extensionName}' linked successfully. Restart dev server to see changes.`,
      path: targetPath,
      needsRestart: true,
    });

  } catch (error: any) {
    console.error('Extension link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link extension' },
      { status: 500 }
    );
  }
}
