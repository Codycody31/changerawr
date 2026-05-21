# Extension System Documentation

Welcome to the Changerawr Extension System documentation! This guide will help you understand, create, and manage extensions for the Changerawr markdown editor.

## What are Extensions?

Extensions are modular plugins that extend the functionality of the Changerawr markdown editor. They allow you to:

- Add custom markdown syntax and rendering
- Create toolbar buttons for quick formatting
- Define configurable settings
- Integrate custom UI components

## Documentation Overview

- **[Getting Started](./getting-started.md)** - Quick start guide for using extensions
- **[Creating Extensions](./creating-extensions.md)** - How to build your own extensions
- **[Extension Metadata](./metadata.md)** - Understanding extension metadata and configuration
- **[Toolbar Integration](./toolbar.md)** - Adding toolbar buttons to your extensions
- **[Settings System](./settings.md)** - Making your extensions configurable
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Quick Links

- [Extension Store](https://github.com/Changerawr/extension-store)
- [Built-in Extensions](/lib/services/core/markdown/extensions)
- [Extension Loader](/lib/services/core/markdown/extensionLoader.ts)

## Extension Types

### Built-in Extensions
Core extensions that ship with Changerawr and cannot be disabled. These provide essential markdown functionality.

### Store Extensions
Extensions available from the official Changerawr Extension Store or custom stores. Can be installed, updated, and uninstalled via the UI.

### Linked Extensions
Extensions you're actively developing! These are symlinked from a local directory, allowing you to:
- Make changes and see them instantly (with Fast Refresh)
- Debug with full source code access
- Test locally before publishing to the store
- Use the "Dev Tools" button to open source files

Perfect for extension developers and power users who want full control.

## Key Features

✅ **Easy Installation** - Install from store, GitHub, or upload directly
✅ **Hot Reloading** - Changes apply instantly without restart
✅ **Version Management** - Automatic update detection and notifications
✅ **Settings System** - Configurable options with type-safe schema
✅ **Toolbar Integration** - Custom buttons with popover support
✅ **Mobile Support** - Extensions work seamlessly on mobile devices

## Support

If you encounter issues or have questions:
- Check the [examples](./examples.md) for reference implementations
- Review the [troubleshooting guide](./troubleshooting.md)
- Submit issues on GitHub

Happy extending! 🚀
