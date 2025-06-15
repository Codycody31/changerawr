<p align="center">
  <img src="public/logo.png" alt="logo" /><br/>
  <strong>Ship, Change, Rawr</strong>
</p>


[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/supernova3339/changerawr)
[![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)](https://github.com/supernova3339/changerawr)
[![License](https://img.shields.io/badge/license-Sponsorware-purple.svg)](LICENSE)

## ✨ Why Changerawr?

**Developer-focused.** Headless API, beautiful documentation, SDKs, and integrations.

**Fully customizable.** Do things your way. No vendor lock-in, no forced workflows.

**For everyone.** Whether you're a solo developer, small business, or enterprise team - Changerawr scales with you.

## 🚀 Features

- **📝 Beautiful Content Editor** - Write changelogs that look professional
- **🤖 AI-Powered** - Let AI help you write better changelog entries
- **📡 Headless API** - Beautifully documented REST API for full control
- **🧩 SDKs** - Pre-built libraries for popular languages
- **🎨 Embeddable Widget** - Drop a changelog widget anywhere on your site
- **📧 Email Notifications** - Keep users informed of updates
- **🏷️ Tags & Versioning** - Organize entries exactly how you want
- **🔗 Multiple Integrations** - Connect with your existing tools
- **🔐 Modern Authentication** - Custom-built auth with passkey support
- **🖥️ Desktop-First Design** - Built for desktop use (mobile works, but it's quirky)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/supernova3339/changerawr.git
cd changerawr

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your settings

# Set up database
npx prisma generate
npx prisma migrate deploy

# Build the widget
npm run build:widget

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and you're ready to go!

### Docker Setup

```bash
docker-compose up --build
```

## ⚙️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres@localhost:5432/changerawr?schema=public"

# Authentication
JWT_ACCESS_SECRET="your-jwt-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# GitHub Integration (optional)
GITHUB_ENCRYPTION_KEY="your-github-encryption-key"

# Analytics
ANALYTICS_SALT="your-secure-random-salt-here"
```

## 📦 Widget Integration

The easiest way to add changelogs to your site - perfect for non-technical users:

```html
<!-- Basic widget -->
<script 
  src="https://your-changerawr.com/api/widget/your-project-id" 
  data-theme="light"
  async
></script>

<!-- Popup widget -->
<button id="updates-btn">What's New?</button>
<script 
  src="https://your-changerawr.com/api/widget/your-project-id" 
  data-popup="true"
  data-trigger="updates-btn"
  async
></script>
```

### Widget Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data-theme` | string | "light" | Theme: "light" or "dark" |
| `data-position` | string | "bottom-right" | Popup position |
| `data-max-height` | string | "400px" | Maximum height |
| `data-popup` | boolean | false | Enable popup mode |
| `data-trigger` | string | null | Button ID or "immediate" |

## 🛠️ Tech Stack

**Built with modern, reliable technologies:**

- **Next.js 15** - React framework with App Router
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Robust, scalable database
- **Shadcn/UI** - Beautiful, accessible UI components
- **TypeScript** - Full type safety throughout

## 🏗️ Development

### Available Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Start built development serer
npm run start:prod       # Start production server
npm run start:prod:win   # Start production server ( Windows )
npm run build:widget     # Build embeddable widget
npm run generate-swagger # Generate API docs
npm run lint             # Code linting
npm run maintenance      # Run the maintenance page

```

### Project Structure

```
changerawr/
├── app/                 # Next.js App Router
│   ├── api/            # API endpoints
│   ├── (auth)/         # Auth pages
│   └── dashboard/      # Main app
├── components/         # React components
├── lib/               # Core utilities
├── prisma/            # Database schema
├── widgets/           # Widget source
└── scripts/           # Build scripts
```

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build
docker build -t changerawr .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_ACCESS_SECRET="your-secret" \
  changerawr
```

### Manual Deployment

```bash
npm run build
npx prisma migrate deploy
npm run build:widget
npm start
```

## 🎯 Features in Detail

### AI-Powered Writing
Let AI help you craft professional changelog entries that your users will actually want to read.

### Custom Authentication
Built from scratch with modern features like passkeys. No third-party restrictions, full control.

### Developer-First API
Clean, well-documented REST API with SDKs for popular languages. Build exactly what you need.

### Email Notifications
Keep your users in the loop with beautiful email updates when you ship new features.

### Full Customization
Tags, versioning - organize your changelogs exactly how your team works.

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug fixes
- ✨ New features
- 📖 Documentation improvements
- 🎨 UI/UX enhancements

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Sponsorware License - see [LICENSE](LICENSE) for details.

This project is sponsorware, meaning you're free to use and modify the code, but you cannot create competing commercial services from it.

## 🙋‍♂️ Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/supernova3339/changerawr/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/supernova3339/changerawr/discussions)

---

**Built by developers, for developers.**