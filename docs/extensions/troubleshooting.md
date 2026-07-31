# Extension Troubleshooting Guide

Common issues and solutions for working with Changerawr extensions.

## Installation Issues

### Extension Won't Install

**Symptoms**: Install button doesn't work or shows an error

**Common Causes**:

1. **Invalid GitHub URL**
   - Solution: Ensure URL format is correct: `https://github.com/username/repo`
   - Check that the repository exists and is public

2. **Missing Extension Files**
   - Solution: Verify `index.ts` exists in repository root
   - Check that metadata is properly exported

3. **Network Issues**
   - Solution: Check internet connection
   - Try again in a few minutes
   - Check if GitHub is accessible

**Debug Steps**:
```bash
# Check if you can access the repository
curl https://github.com/username/repo

# Verify the extension structure
# Repository should have:
# - index.ts (main file)
# - package.json (optional)
```

### Installation Gets Stuck

**Symptoms**: Installation progress never completes

**Solutions**:
- Refresh the page
- Clear browser cache
- Check browser console for errors (F12)
- Restart the development server

### "Extension Already Installed" Error

**Symptoms**: Can't reinstall an extension you previously removed

**Solution**: The extension name is still in the database
- Go to Installed tab
- Look for the extension (may show as "broken")
- Click Uninstall first
- Then reinstall from marketplace

## Extension Not Working

### Extension Enabled But Not Rendering

**Symptoms**: Extension shows as "Active" but syntax doesn't work

**Common Causes**:

1. **Cache Not Cleared**
   ```typescript
   // The markdown engine caches compiled extensions
   // Solution: Disable and re-enable the extension
   ```

2. **Incorrect Syntax**
   - Check the extension's README for correct syntax
   - Verify you're using the exact pattern required

3. **Conflicting Extensions**
   - Try disabling other extensions one by one
   - Check if two extensions use the same syntax

**Debug Steps**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Look for messages like "Extension X failed to load"

### Toolbar Button Missing

**Symptoms**: Extension is installed but toolbar button doesn't appear

**Solutions**:

1. **Check Toolbar Configuration**
   - Verify `toolbar.buttons` is defined in metadata
   - Ensure button has valid `id`, `icon`, and `tooltip`

2. **Mobile vs Desktop**
   - Desktop: Buttons appear in toolbar
   - Mobile: Buttons appear in menu (☰)

3. **Extension Group**
   ```typescript
   // Buttons are grouped by category
   toolbar: {
     buttons: [
       {
         id: 'my-button',
         icon: 'Highlighter',
         tooltip: 'Highlight',
         group: 'formatting'  // Check this is set
       }
     ]
   }
   ```

### Toolbar Button Doesn't Do Anything

**Symptoms**: Button appears but clicking does nothing

**Solutions**:

1. **Check Action Configuration**
   ```typescript
   // Either provide action OR onClick, not both
   action: {
     before: '==',
     after: '==',
     placeholder: 'text'
   }
   // OR
   onClick: (textarea) => {
     // Custom logic
   }
   ```

2. **Custom UI Not Appearing**
   - Verify `customUI` component is properly exported
   - Check browser console for React errors
   - Ensure component accepts `textarea` and `onClose` props

## Settings Issues

### Settings Not Saving

**Symptoms**: Changes in settings dialog don't persist

**Solutions**:

1. **Check API Endpoint**
   - Verify `/api/extensions/[id]/settings` route exists
   - Check browser network tab for 404 or 500 errors

2. **Invalid Setting Values**
   - Ensure values match the type (number vs string)
   - Check that select values match option values

3. **Database Issues**
   - Restart the development server
   - Check database connection

### Settings Dialog Empty

**Symptoms**: Settings button works but dialog shows "No configurable settings"

**Solution**: Extension has no settings defined
```typescript
export const metadata = {
  // ...
  settings: [  // Add this
    {
      key: 'myOption',
      label: 'My Option',
      type: 'boolean',
      defaultValue: true
    }
  ]
};
```

### Settings Not Affecting Extension

**Symptoms**: Changing settings has no visible effect

**Explanation**: Settings are stored in database but extensions are static

**Solutions**:
- Settings are meant to configure extension behavior at load time
- For dynamic behavior, use CSS variables or generate different versions
- See [Settings Documentation](./settings.md) for details

## Extension Store Issues

### No Extensions in Store

**Symptoms**: Marketplace tab is empty

**Solutions**:

1. **Store Not Configured**
   - Click "Manage Stores" in sidebar
   - Ensure at least one store is enabled
   - Default store should be enabled automatically

2. **Network Issues**
   - Check if `extensions.json` URL is accessible
   - Verify internet connection

3. **Store URL Invalid**
   - Ensure URL points to valid `extensions.json`
   - Format: `https://domain.com/path/extensions.json`

### Can't Disable Official Store

**Symptoms**: Toggle doesn't work for official store

**Solution**: This was a bug, should be fixed in latest version
- Update to latest version
- Official store can now be disabled

## README/CHANGELOG Issues

### README Not Showing

**Symptoms**: Clicking extension name does nothing

**Solutions**:

1. **No README Defined**
   ```typescript
   export const metadata = {
     // ...
     readme: `# My Extension\n\nDocumentation here...`
   };
   ```

2. **README Tab Missing**
   - README must be defined in extension metadata
   - Check that extension was installed correctly

### CHANGELOG Timeline Not Appearing

**Symptoms**: CHANGELOG shows but not in timeline format

**Explanation**: Timeline requires semantic versioning format

**Required Format**:
```markdown
# Changelog

## [1.2.0] - 2026-05-14

### Added
- New feature 1
- New feature 2

### Fixed
- Bug fix 1

## [1.1.0] - 2026-04-10

### Added
- Initial feature
```

**Format Requirements**:
- Version header: `## [X.Y.Z] - YYYY-MM-DD`
- Sections: `### Added`, `### Fixed`, etc.
- Bullet points: `- Item`

## Development Issues

### Linked Extension Not Appearing

**Symptoms**: You linked an extension but it doesn't show up in the Installed tab

**Common Causes**:

1. **Missing extension.json**
   - The link endpoint auto-generates this, but if linking failed, it may be missing
   - Solution: Check that `index.ts` has valid `metadata` export

2. **Extension Name Conflict**
   - Another extension with the same name already exists
   - Solution: Change the `name` in your metadata or uninstall the existing one

3. **Database Not Updated**
   - Sometimes the database entry isn't created
   - Solution: Try unlinking and relinking

**Debug Steps**:
1. Check browser console for errors
2. Verify symlink exists at `extensions/changerawr/[name]/`
3. Check database has an entry with `isLinked: true`
4. Run `npm run extensions:generate` manually
5. Restart the dev server

### Linked Extension Changes Not Reflecting

**Symptoms**: You're editing your linked extension but changes don't appear

**This is normal** - Linked extensions support Fast Refresh!

**If changes still don't appear**:

1. **Save the file** - Changes only apply when you save
2. **Check syntax errors** - TypeScript/JavaScript errors prevent loading
3. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
4. **Disable and re-enable** - This reloads the extension completely

### Broken Link (Orange Warning)

**Symptoms**: Extension shows as "Linked" but has broken/missing files

**Common Causes**:

1. **Source Directory Moved**
   - You moved or renamed your extension's source folder
   - Solution: Unlink and relink with the new path

2. **Source Directory Deleted**
   - The original extension directory no longer exists
   - Solution: Either restore the directory or unlink the extension

3. **Permission Issues**
   - Windows/Linux permissions blocking symlink access
   - Solution: Check file permissions, run as administrator if needed

**Auto-Cleanup**: The system automatically detects broken links and removes them when you run `npm run extensions:generate`

### Extension Changes Not Reflecting (Non-Linked)

**Symptoms**: Modified extension code in `extensions/` directory but changes don't appear

**Solutions**:

1. **Regenerate Imports**
   ```bash
   npm run extensions:generate
   ```

2. **Restart Dev Server**
   - Stop the server (Ctrl+C)
   - Start it again (`npm run dev`)

3. **Markdown Cache**
   - Disable and re-enable the extension
   - This clears the markdown engine cache

4. **Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear browser cache completely

### TypeScript Errors

**Symptoms**: Extension won't install due to type errors

**Common Issues**:

1. **Missing Type Imports**
   ```typescript
   import type { Extension } from '@changerawr/markdown';
   ```

2. **Incorrect Metadata Type**
   ```typescript
   // Don't type metadata as ExtensionMetadata (not exported)
   export const metadata = { ... };  // Plain object is fine
   ```

3. **Wrong Function Signatures**
   ```typescript
   // Parse rule replacement
   replacement: (match: string, ...groups: string[]) => string

   // Render rule
   renderRule: (content: string, attributes?: Record<string, string>) => string
   ```

### Regex Not Matching

**Symptoms**: Custom syntax doesn't get parsed

**Solutions**:

1. **Missing Global Flag**
   ```typescript
   pattern: /==([^=]+)==/g  // Must have 'g' flag
   ```

2. **Escaping Issues**
   ```typescript
   // Escape special regex characters
   pattern: /\[\[([^\]]+)\]\]/g  // Brackets must be escaped
   ```

3. **Greedy vs Non-Greedy**
   ```typescript
   pattern: /\*\*(.+?)\*\*/g    // Non-greedy (.*?)
   pattern: /\*\*(.+)\*\*/g     // Greedy (.*)
   ```

4. **Test Your Regex**
   - Use [regex101.com](https://regex101.com)
   - Select "JavaScript" flavor
   - Test with your expected input

## Performance Issues

### Slow Rendering

**Symptoms**: Markdown preview is laggy with extension enabled

**Solutions**:

1. **Optimize Regex**
   - Avoid catastrophic backtracking
   - Use atomic groups where possible
   - Test regex performance with large inputs

2. **Simplify Render Rules**
   - Avoid complex DOM manipulation
   - Keep generated HTML simple
   - Cache expensive operations

3. **Disable Unused Extensions**
   - Each enabled extension adds processing overhead
   - Only keep necessary extensions active

### Memory Issues

**Symptoms**: Browser becomes slow or crashes

**Solutions**:
- Check for memory leaks in custom UI components
- Avoid storing large objects in extension state
- Clear browser cache and reload

## Mobile Issues

### Extension Button Not in Mobile Menu

**Symptoms**: Toolbar button visible on desktop but not mobile

**Solution**: This was a bug, should be fixed
- Update to latest version
- Mobile menu now includes all toolbar extensions
- Custom UI opens in mobile-friendly dialog

### Custom UI Broken on Mobile

**Symptoms**: Popover doesn't work properly on mobile

**Solutions**:
- Ensure component is responsive
- Test on actual mobile device or browser dev tools
- Custom UI automatically opens in full-screen dialog on mobile

## Getting Help

### Check Extension README

Most extensions include documentation:
1. Click extension name in Installed tab
2. Read the README for usage examples
3. Check CHANGELOG for recent changes

### Browser Console

Press F12 and check:
- **Console** tab for JavaScript errors
- **Network** tab for failed requests
- **Application** tab for storage issues

### Extension Source Code

For locally developed extensions:
1. Check `extensions/` directory
2. Review `index.ts` for the extension code
3. Verify exports are correct

### Community Support

- Submit issues on GitHub
- Check official extension store for updates
- Review example extensions for reference

## Error Messages

### "Extension files are missing or corrupted"

**Solution**: Use the **Repair** button
- Extension will be re-downloaded from source
- Settings are preserved
- May need to re-enable after repair

### "Failed to load extension metadata"

**Solutions**:
- Extension `index.ts` has syntax errors
- Metadata export is missing or malformed
- Check browser console for specific error

### "Invalid extension structure"

**Solutions**:
- Ensure `index.ts` exists
- Verify both `metadata` and `extension` are exported
- Check that extension follows the correct format

### "Extension already exists"

**Solutions**:
- An extension with this name is already installed
- Uninstall existing version first
- Or change the `name` in metadata

## Best Practices to Avoid Issues

✅ **Test thoroughly**
- Test on both desktop and mobile
- Try with different content
- Enable/disable to verify it works both ways

✅ **Follow conventions**
- Use kebab-case for extension names
- Follow semantic versioning
- Include README and CHANGELOG

✅ **Handle errors gracefully**
- Don't assume content format
- Provide fallbacks for missing data
- Log errors to console for debugging

✅ **Keep it simple**
- Start with basic functionality
- Add features incrementally
- Test each addition

## Still Having Issues?

If you've tried the solutions above and still have problems:

1. **Gather Information**:
   - Browser console errors
   - Extension metadata
   - Steps to reproduce

2. **Check Versions**:
   - Changerawr version
   - Extension version
   - Browser version

3. **Report Issue**:
   - Include all gathered information
   - Provide minimal reproduction example
   - Share extension code if possible

4. **Temporary Workarounds**:
   - Disable the problematic extension
   - Use alternative extension if available
   - Manually write the markdown (without custom syntax)
