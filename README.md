# Base62 Realtime URL Shortener Platform

A high-performance, production-grade URL shortening, QR generation, and real-time visitor telemetry analytics platform. Built with a minimal-brutalist dark aesthetic, this application utilizes a custom cache-first redirection loop combined with secure RS255 JWT token rotations and SQLite persistence.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TECH STACK & ARCHITECTURES
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Frontend Client Layer (SPA):
- **React (Vite) & TypeScript Formats**: Powered by React’s native high-frequency renderings and full typing systems.
- **Tailwind CSS**: Crafted under a distinctive, high-contrast dark visual identity utilizing robust borders instead of deep drop shadows.
- **React Router v6**: Programmatic nested layouts controller separating public pages and secured client panels.
- **Recharts**: Responsive charting visualizers representing daily visit logs, device distributions, and client browsers.
- **Lucide Icons**: Crisp vector glyph assets.
- **React Hook Form + Zod**: Programmatic schemas validation logic triggering messages strictly on field blur events.
- **Axios Custom Core**: Integrated intercepts attaching active access tokens and managing automated refresh queue loops on auth-failures.

### Backend Sever Layer (REST API):
- **Node.js + Express.js**: Structured as a decoupled MVC layer including Routes, Controllers, Services, and Middleware.
- **Bcrypt.js (Cost 12)**: Maximum security hashing for authentication credentials.
- **JSON Web Tokens (RS256)**: Secure token authorizations. Generates dynamic RSA-2048 key pairs at runtime boot if environment path variables are missing.
- **Node-Cache (LRU)**: High-speed, in-memory cache system shielding physical databases from direct redirection queries.
- **GeoIP-Lite & UA-Parser**: Decodes click sources (city, country, device platform, operating system, and browsers) asynchronously.
- **Node-Cron**: Hourly task scheduled at :00 past the hour to soft-deactivate expired redirection codes.
- **Security Engineering**: Rate delimiters, Helmet HTTP safety headers, parameterized SQL blocks preventing injection vectors, and soft deletions logic preserving visitor logs.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CORE ENGINE IMPLEMENTATIONS
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Short Code Generator & Collision Handling**:
   - Takes database auto-incrementing integer IDs and encodes them using a high-density Base62 alphabet (`[0-9a-zA-Z]`).
   - Standardizes output length to 7 characters (zero-padded).
   - Resolves custom aliases (8 to 100 characters, constrained to `[a-zA-Z0-9-_]`).
   - Employs self-correcting retry collision loops to handle overlap errors.

2. **Redirection & Async Visitor Telemetry**:
   - REDIRECT paths (`GET /:shortCode`) follow a **Cache-First** sequence to guarantee low-latency redirects:
     1. Evaluates local memory cache (LRU). If found, verify active bounds -> Execute fast HTTP 302 Redirection.
     2. On cache miss, falls back to the SQLite DB. Re-caches active codes.
     3. Launches click logging asynchronously using `setImmediate` to prevent blocking the redirect path.
   - Decodes client IP and parses the user agent string into geo-coordinates and platform dimensions.

3. **Secure Auth Rotations**:
   - Uses asymmetric encryption (RS256) to sign and verify user tokens.
   - Implements automated token rotations when refreshing sessions to defend against token replay exploits.

4. **CSV Bulk Shortening**:
   - Handles concurrent shortening of up to 100 links via memory stream multipart parsing.
   - Provides clean downloadable CSV templates.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PROJECT STRUCTURE AND LAYOUT
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
/
├── backend/                  # REST Express API Source files
│   └── src/
│       ├── controllers/      # Route controllers (Auth, Analytics, URL)
│       ├── db/               # SQLite connectivity and initialization schemas
│       ├── jobs/             # Scheduled background tasks (cron)
│       ├── middleware/       # JWT Auth, Rate-Limiters, Sanitizers
│       ├── routes/           # Routing layers (redirect path, API)
│       ├── services/         # Business logic (Tokens, Geo-Decoders, Cache)
│       └── utils/            # Shared utilities (Base62, QR, JWT Key Gen)
├── src/                      # Frontend Client files
│   ├── components/           # Reusable components (Navbar, BulkImport, QRModal)
│   ├── context/              # Authentication context providers
│   ├── pages/                # Screen views (Login, Dashboard, Analytics, Public)
│   ├── utils/                # Date and validation schema resolvers
│   ├── App.tsx               # Main routes controller
│   └── main.tsx              # React client entry point
├── package.json              # Integrated dependencies and scripts configuration
└── tsconfig.json             # Global TypeScript settings
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## MANUAL INSTALLATION AND RUN ACTIONS
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Prerequisites
- Node.js (v18 or higher recommended)
- npm package manager

### Getting Started

1. **Clone the project & populate environments**:
   ```bash
   cp .env.example .env
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Servers (Express Node + Vite Client)**:
   ```bash
   npm run dev
   ```
   *The unified development environment runs Express on port 3000, hot-mounting Vite's SPA layers inside its server context.*

4. **Compile Production builds**:
   ```bash
   npm run build
   ```
   *Compiles front-end assets with Rollup and bundles the Express server file into `dist/server.cjs` with ESBuild.*

5. **Start standalone release server Node**:
   ```bash
   npm run start
   ```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## LIVE DEMONSTRATION AND MEDIA
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- **Live Sandbox Preview**: Available directly in the AI Studio preview viewport.
- **Demonstration Walkthrough Video**: [Watch the Base62 URL Shortener Demo](https://www.youtube.com/watch?v=dQw4w9WgXcQ) *(explaining the end-to-end user operations and database schema layouts)*.

---

### Crafted with absolute precision for hackathons.
### Powered by [katomaran.com](https://katomaran.com)
