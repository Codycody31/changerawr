# Getting Started with Extensions

This guide will help you start using extensions in Changerawr.

## Installation Methods

### From the Extension Store

1. Navigate to **Admin Dashboard** → **Extensions**
2. Click on **Browse Store** tab
3. Browse or search for extensions
4. Click on an extension to view details (README, CHANGELOG, settings)
5. Click **Install** button
6. Wait for installation to complete (app will reload automatically)

### From GitHub

1. Navigate to **Admin Dashboard** → **Extensions**
2. Click **Install from GitHub** button
3. Enter the GitHub repository URL (e.g., `https://github.com/username/extension-name`)
4. Click **Install**
5. The extension will be downloaded and installed

### Upload Extension

1. Navigate to **Admin Dashboard** → **Extensions**
2. Click **Upload Extension** button
3. Upload a `.zip` file containing the extension
4. Click **Upload**

### Link Local Extension (For Development)

Perfect for developing and testing extensions locally before publishing!

1. Navigate to **Admin Dashboard** → **Extensions**
2. Use the Extension Builder or Uploader to link a local directory
3. Provide the full path to your extension directory (e.g., `C:\projects\my-extension`)
4. Click **Link**
5. The extension will be symlinked and appear with a special **"Linked"** badge

**Benefits of linking**:
- Changes to your extension code are reflected immediately (no reinstall needed)
- Extension updates with Fast Refresh - just save your code!
- Easy debugging with source files directly accessible
- "Copy Path" button quickly copies extension directory path to clipboard
- No update prompts - you control the version locally
- Perfect for rapid iteration during development

## Managing Extensions

### Viewing Installed Extensions

Click on the **Installed** tab to see all your extensions. Each extension shows:

- **Icon** - Visual identifier
- **Name** - Click to view README
- **Version** - Click to view CHANGELOG
- **Author** - Extension creator
- **Description** - What the extension does
- **Category** - Type of extension (formatting, blocks, media, etc.)
- **Status badges**:
  - 🟢 Active - Extension is enabled and working
  - 🔴 Broken - Extension files are missing (use Repair button)
  - 🔵 Update Available - New version available (not shown for linked extensions)
  - 🟠 Linked - Extension is symlinked for local development

### Enabling/Disabling Extensions

Click the **Enable** or **Disable** button on any extension. Changes apply immediately without restart.

### Configuring Extension Settings

1. Click the **Settings** button on an installed extension
2. Adjust the available settings:
   - Toggle switches for boolean options
   - Text inputs for strings
   - Number inputs with min/max constraints
   - Dropdowns for select options
   - Color pickers for color values
3. Click **Save Settings**
4. Changes apply immediately

### Updating Extensions

When an update is available:
1. You'll see an **Update Available** badge
2. Click the **Update to v{version}** button
3. Extension will update and app will reload

Or update all at once:
1. Click **Update All** button in sidebar
2. Review extensions to be updated
3. Click **Start Updates**
4. Wait for all updates to complete

### Uninstalling Extensions

1. Click the **Uninstall** button (trash icon)
2. Confirm the uninstallation
3. Extension will be removed and app will reload

**Note**: Built-in extensions cannot be uninstalled.

### Unlinking Local Extensions

For extensions that were linked for development:

1. Click the **Unlink** button (instead of Uninstall)
2. The symlink will be removed
3. Extension is removed from the database
4. Your source files remain untouched in their original location
5. Restart dev server to see changes

**Note**: Unlinking removes the connection but doesn't delete your extension source code!

## Extension Stores

### Managing Stores

1. Click **Manage Stores** button in sidebar
2. View configured stores
3. Enable/disable stores using the toggle
4. Add custom stores by providing:
   - Store ID (unique identifier)
   - Display Name
   - Store URL (must point to `extensions.json`)

### Official Store

The official Changerawr Extension Store is enabled by default:
- URL: `https://github.com/Changerawr/extension-store`
- Contains verified, high-quality extensions
- Regularly updated with new extensions

## Using Extensions

Once installed and enabled, extensions automatically integrate with the editor:

### Toolbar Buttons

- Look for new icons in the markdown toolbar
- Click to use the extension's functionality
- Mobile: Open the menu (☰) to access extension buttons

### Markdown Syntax

- Extensions add new markdown syntax
- Type the syntax in the editor
- Preview updates in real-time
- Check the extension's README for syntax details

### Custom Rendering

- Extensions can customize how markdown is rendered
- Changes appear in the preview pane
- Also affects exported content

## Tips

💡 **Keyboard Shortcuts** - Some extensions may add keyboard shortcuts (check README)

💡 **Extension Conflicts** - If two extensions conflict, try disabling one

💡 **Performance** - Disable unused extensions to optimize performance

💡 **Mobile Support** - All toolbar extensions work on mobile via the menu

💡 **Settings Persistence** - Extension settings are saved automatically

## Next Steps

- Learn how to [create your own extensions](./creating-extensions.md)
- Understand [extension metadata](./metadata.md)
- Explore [example extensions](./examples.md)
