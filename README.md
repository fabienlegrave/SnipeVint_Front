# VintedScrap - Professional Vinted Scraping Tool

A modern, full-stack application for scraping and analyzing Vinted listings with AI-powered visual analysis. Built with Next.js 14, TypeScript, and OpenAI GPT Vision for expert-level item evaluation.

## 🚀 Features

### Core Functionality
- **🔍 Smart Search**: Fast API-based search with intelligent filtering
- **📊 Comprehensive Data Extraction**: Prices, conditions, descriptions, images, engagement metrics
- **🔄 Intelligent Deduplication**: Avoid re-scraping existing items automatically
- **👁️ AI Visual Analysis**: GPT Vision analyzes photos to extract facts about condition, completeness, and authenticity
- **🤖 Smart Deal Detection**: AI-powered deal analysis based on visual facts and market comparisons
- **💾 Persistent Storage**: Supabase PostgreSQL with optimized schemas and indexing

### User Interface
- **🎨 Modern Design**: Beautiful, responsive interface with shadcn/ui components
- **📱 Mobile-First**: Fully responsive design that works on all devices
- **🔄 Real-time Updates**: Live progress tracking during AI analysis
- **🔍 Advanced Search**: Filter by price, condition, availability, text search
- **📈 AI Insights**: Visual facts, deal scores, and expert recommendations
- **⚙️ System Monitoring**: Health checks and configuration status

### Technical Excellence
- **🏗️ Modern Architecture**: Next.js 14 with App Router and TypeScript
- **🤖 AI Integration**: OpenAI GPT-4o-mini with Vision for expert analysis
- **🔒 Secure API**: Protected endpoints with API key authentication
- **📊 Database Optimization**: Trigram search, proper indexing, efficient queries
- **🛡️ Error Handling**: Comprehensive error handling and retry logic
- **📝 Detailed Logging**: Full visibility into AI analysis operations

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend**: Next.js API Routes, Node.js, OpenAI GPT Vision
- **Database**: Supabase PostgreSQL with trigram search
- **Authentication**: Vinted token-based authentication
- **AI**: OpenAI GPT-4o-mini for visual analysis and deal detection
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **Deployment**: Vercel-ready with environment variable support

## 📋 Prerequisites

- **Node.js 18+** - Latest LTS version recommended
- **Supabase Account** - Free tier is sufficient to start
- **Vinted Account** - For obtaining access tokens
- **Modern Browser** - Chrome, Firefox, Safari, or Edge

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd vinted-scrap
npm install
```

### 2. Environment Setup

Create `.env.local` file in your project root:

```env
# Frontend Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_SECRET=your_client_api_secret

# Backend Configuration (Server Only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# API Protection
API_SECRET=your_secure_api_secret_here

# AI Analysis
OPENAI_API_KEY=sk-proj-your_openai_key_here

# Vinted Authentication
VINTED_ACCESS_TOKEN=your_vinted_access_token_here

# Performance Tuning (Optional)
ENRICH_CONCURRENCY=2
SCRAPE_DELAY_MS=1200
```

### 3. Database Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and keys

2. **Run Database Migration**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and run the migration from `supabase/migrations/`

This creates:
- `vinted_items` table with all necessary columns
- AI Vision fields for visual analysis
- Peer key system for smart comparisons
- Optimized indexes for fast queries
- Trigram search capabilities for text search
- Proper data types for all Vinted fields

### 4. Get Vinted Access Token

**Method 1: Browser Developer Tools (Recommended)**
1. Open https://www.vinted.fr and login to your account
2. Open Developer Tools (F12)
3. Go to **Application** → **Cookies** → **https://www.vinted.fr**
4. Find the `access_token_web` cookie
5. Copy its value to `VINTED_ACCESS_TOKEN` in your `.env.local`

**Method 2: Use the Settings Page**
1. Start the development server: `npm run dev`
2. Go to http://localhost:3000/settings
3. Use the token manager interface to paste all your cookies
4. The system will automatically extract and validate the required tokens

### 5. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** to access the application.

## 🎯 Usage Guide

### Complete Scraping Workflow

#### 1. Configure Search (`/search` page)
- **Search Query**: Enter keywords (e.g., "nintendo gameboy", "vintage denim jacket")
- **Price Range**: Set minimum and maximum prices (optional)
- **Platform Filter**: Select specific gaming platforms (optional)
- **Result Limit**: Control how many items to scrape (default: 100)
- **Token Status**: Ensure your Vinted token is configured and valid

#### 2. Automated Processing Pipeline
The system automatically handles the complete workflow:

1. **🔍 Fast API Search**: Quickly finds items using Vinted's search API
2. **🔍 Deduplication Check**: Identifies which items are already in your database
3. **💾 Data Storage**: Saves all data to Supabase with proper formatting
4. **📈 Progress Tracking**: Real-time updates on each step

#### 3. AI Visual Analysis (`/items` page)
- **👁️ Vision Analysis**: Click "Analyze New Items" to run AI visual analysis
- **🤖 Smart Detection**: AI examines photos to determine condition, completeness, authenticity
- **📊 Deal Scoring**: Automatic deal detection based on visual facts and market data
- **🔄 Progress Tracking**: Real-time updates during AI analysis

#### 4. Browse and Filter (`/items` page)
- **🔍 Advanced Filtering**: Search by title, description, price range, availability
- **📊 Sorting Options**: Sort by date, price, popularity, or relevance
- **📱 Grid View**: Beautiful card-based layout with images and key info
- **🎯 AI Insights**: Visual facts, condition grades, and deal scores
- **🔗 Quick Actions**: View details or jump to original Vinted listing

#### 5. Detailed Item View (`/items/[id]`)
- **🖼️ Image Gallery**: All item photos with zoom capability
- **👁️ Visual Facts**: AI-extracted inventory (cartridge, box, manual, etc.)
- **💰 Complete Pricing**: Item price, shipping fees, buyer protection costs
- **🤖 AI Analysis**: Expert-level deal evaluation with reasoning
- **📊 Engagement Metrics**: View count, favorite count, listing age
- **🔗 External Links**: Direct links to Vinted listing

#### 6. Deal Discovery (`/deals`)
- **🔥 AI-Detected Deals**: Browse deals found by AI analysis
- **📊 Deal Scores**: 0-100 scoring with savings calculations
- **🎯 Smart Filtering**: Filter by game, platform, condition, score
- **💎 Expert Recommendations**: Strong buy, good deal, fair price, avoid

### System Configuration (`/settings`)
Monitor your application health:
- **🔑 Token Management**: Configure and validate Vinted access tokens
- **⚙️ Configuration Status**: Environment variables, API connections
- **🤖 AI Status**: OpenAI API configuration and usage
- **📊 Database Status**: Connection health and statistics

## 🏗️ Architecture Deep Dive

### File Structure
```
├── app/
│   ├── api/v1/              # API endpoints
│   │   ├── scrape/          # Scraping operations
│   │   ├── missing-ids/     # Deduplication logic
│   │   ├── upsert/          # Database operations
│   │   └── setup-token/     # Token validation
│   ├── runs/                # Scraping interface
│   ├── items/               # Browse and view items
│   ├── settings/            # System monitoring
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── layout/              # Navigation and layout
│   └── TokenSetup.tsx       # Token configuration
├── lib/
│   ├── scrape/              # Scraping modules
│   │   ├── searchCatalog.ts # API search logic
│   │   ├── serverOnlyParser.js # HTML parsing (server-only)
│   │   ├── fetchHtml.ts     # HTTP client with retries
│   │   └── concurrency.ts   # Parallel processing
│   ├── supabase.ts          # Database clients
│   ├── types.ts             # TypeScript definitions
│   └── utils.ts             # Helper functions
├── supabase/migrations/     # Database schemas
└── scripts/                 # Utility scripts
```

### Data Flow Architecture

1. **Search Phase**
   ```
   User Input → API Search → Vinted API → Raw Results
   ```

2. **Deduplication Phase**
   ```
   Raw Results → Extract IDs → Database Check → Missing/Existing Lists
   ```

3. **Enrichment Phase**
   ```
   Missing IDs → HTML Fetch → Native JS Parsing → Rich Data
   ```

4. **Storage Phase**
   ```
   Rich Data → Data Validation → Database Upsert → Success Response
   ```

### Native JavaScript Parsing Engine

Our custom parsing engine eliminates external dependencies:

- **🎯 Regex-Based Extraction**: Optimized patterns for HTML elements
- **📊 JSON-LD Processing**: Structured data extraction
- **🖼️ Image Discovery**: Multiple sources (preload, meta tags, structured data)
- **💰 Price Parsing**: Handles multiple currencies and fee structures
- **📈 Engagement Metrics**: View counts, favorites, temporal data
- **🔍 Text Processing**: Clean descriptions, titles, conditions

## 🔧 Configuration Options

### Performance Tuning

```env
# Concurrent enrichment requests (1-5 recommended)
ENRICH_CONCURRENCY=3

# Delay between requests in milliseconds (500-2000 recommended)
SCRAPE_DELAY_MS=800
```

### Network Configuration

```env
# Use proxy for requests (optional)
HTTPS_PROXY=http://proxy.example.com:8080

# Skip SSL verification (development only)
INSECURE_FETCH=1
```

### Security Settings

```env
# Strong API secret for endpoint protection
API_SECRET=your_very_secure_random_string_here

# Supabase service role key (full database access)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 API Reference

All API endpoints require the `x-api-key` header with your `API_SECRET`.

### Search Operations

**POST** `/api/v1/scrape/search`
```json
{
  "query": "nintendo gameboy",
  "priceFrom": 10,
  "priceTo": 100,
  "limit": 50,
  "token": "optional_override_token"
}
```

**POST** `/api/v1/scrape/enrich`
```json
{
  "ids": [123456789, 987654321]
}
```

### Database Operations

**POST** `/api/v1/missing-ids`
```json
{
  "ids": [123456789, 987654321, 555666777]
}
```

**POST** `/api/v1/upsert`
```json
[
  {
    "id": 123456789,
    "url": "https://www.vinted.fr/items/123456789",
    "title": "Vintage Nintendo Game Boy",
    "price": { "amount": 45.00, "currency_code": "EUR" },
    // ... other fields
  }
]
```

### Item Retrieval

**GET** `/api/v1/item/123456789`

Returns complete item data in API format.

## 🚢 Deployment Guide

### Vercel + Supabase (Recommended)

1. **Prepare for Deployment**
   ```bash
   npm run build  # Test build locally
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Go to Vercel dashboard → Project → Settings → Environment Variables
   - Add all variables from your `.env.local`
   - Use **production** Supabase keys (not development)

4. **Database Setup**
   - Ensure your Supabase project is in production mode
   - Run migrations in Supabase dashboard
   - Test database connectivity

### Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   npm start
   ```

2. **Environment Setup**
   - Copy `.env.local` to `.env.production.local`
   - Update with production values
   - Ensure all required variables are set

3. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start npm --name "vinted-scrap" -- start
   ```

## 🔍 Monitoring and Maintenance

### Health Checks

Visit `/settings` to monitor:
- **Database Connection**: Real-time connectivity status
- **Token Validity**: Vinted authentication status
- **API Performance**: Response times and error rates
- **Data Quality**: Completeness and freshness metrics

### Logs and Debugging

The application provides comprehensive logging:

```bash
# Development logs
npm run dev

# Production logs (if using PM2)
pm2 logs vinted-scrap

# Database logs (Supabase dashboard)
# Go to Logs section in Supabase dashboard
```

### Common Maintenance Tasks

**Token Refresh**
- Tokens typically expire every few weeks
- Use the built-in token setup interface
- Monitor the `/settings` page for expiration warnings

**Database Cleanup**
```sql
-- Remove old items (optional)
DELETE FROM vinted_items 
WHERE scraped_at < NOW() - INTERVAL '90 days';

-- Update statistics
ANALYZE vinted_items;
```

**Performance Optimization**
- Monitor concurrent request settings
- Adjust delays based on success rates
- Scale Supabase plan if needed

## 🛠️ Development Guide

### Local Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run build

# Lint code
npm run lint
```

### Adding New Features

1. **API Endpoints**: Add to `app/api/v1/`
2. **UI Components**: Follow shadcn/ui patterns in `components/ui/`
3. **Database Changes**: Create new migration files
4. **Scraping Logic**: Extend `lib/scrape/` modules

### Testing

```bash
# Test single search
node scripts/scrape-once.js "nintendo gameboy" 10 100 20

# Test API endpoints
curl -X POST http://localhost:3000/api/v1/scrape/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_secret" \
  -d '{"query": "test", "limit": 5}'
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Automatic code formatting
- **Tailwind**: Consistent styling system

## ⚠️ Legal and Ethical Usage

### Important Guidelines

- **🚦 Respect Rate Limits**: Don't overload Vinted's servers
- **📋 Terms of Service**: Comply with Vinted's Terms of Service
- **🎓 Educational Use**: This tool is for educational and personal research
- **🔒 Data Privacy**: Handle scraped data responsibly and securely
- **©️ Intellectual Property**: Respect copyrights and trademarks
- **🤝 Fair Use**: Use data ethically and considerately

### Best Practices

- **Reasonable Delays**: Use appropriate delays between requests
- **Limited Scope**: Don't scrape entire catalogs unnecessarily
- **Data Retention**: Only keep data you actually need
- **Access Control**: Secure your API keys and database access
- **Monitoring**: Keep track of your scraping activity

## 🆘 Troubleshooting

### Common Issues and Solutions

**❌ "Authentication failed - token may be expired"**
- **Solution**: Update your `VINTED_ACCESS_TOKEN`
- **How**: Use the token setup interface at `/runs`
- **Prevention**: Monitor token expiration in `/settings`

**❌ "Database error" or connection issues**
- **Check**: Supabase URL and service role key in environment
- **Verify**: Database migrations have been run
- **Test**: Visit `/settings` to check connection status

**❌ "Rate limited" or "HTTP 429" errors**
- **Increase**: `SCRAPE_DELAY_MS` to 1000-2000ms
- **Decrease**: `ENRICH_CONCURRENCY` to 1-2
- **Wait**: Rate limits usually reset after 15-30 minutes

**❌ "No results found" for valid searches**
- **Verify**: Search query syntax and spelling
- **Check**: Price range isn't too restrictive
- **Test**: Try the same search on Vinted website
- **Token**: Ensure your access token is valid

**❌ Build or deployment errors**
- **Environment**: Verify all required variables are set
- **Dependencies**: Run `npm install` to update packages
- **Build**: Test with `npm run build` locally first
- **Logs**: Check Vercel deployment logs for specific errors

### Getting Help

1. **Check System Status**: Visit `/settings` for health overview
2. **Review Logs**: Check browser console and server logs
3. **Test Components**: Use individual API endpoints to isolate issues
4. **Environment**: Verify all configuration variables are correct
5. **Documentation**: Review this README for configuration details

### Performance Optimization

**Slow Scraping**
- Reduce `ENRICH_CONCURRENCY` for stability
- Increase `SCRAPE_DELAY_MS` to avoid rate limits
- Check network connectivity and proxy settings

**Database Performance**
- Monitor query performance in Supabase dashboard
- Consider upgrading Supabase plan for larger datasets
- Use appropriate indexes (already included in migrations)

**Memory Usage**
- Limit concurrent operations for large scraping runs
- Consider processing in smaller batches
- Monitor server resources during peak usage

## 🤝 Contributing

We welcome contributions to improve VintedScrap!

### Development Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request with detailed description

### Contribution Guidelines

- **Code Quality**: Follow existing patterns and TypeScript conventions
- **Testing**: Test your changes thoroughly before submitting
- **Documentation**: Update README and comments for new features
- **Performance**: Consider impact on scraping speed and resource usage
- **Security**: Ensure no sensitive data is exposed or logged

### Areas for Contribution

- **🎨 UI/UX Improvements**: Better designs, mobile optimization
- **⚡ Performance**: Faster parsing, better caching strategies
- **🔍 Search Features**: Advanced filters, saved searches
- **📊 Analytics**: Better insights and data visualization
- **🔧 DevOps**: Improved deployment and monitoring tools

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Commercial Use**: You can use this for commercial projects
- ✅ **Modification**: You can modify and distribute changes
- ✅ **Distribution**: You can distribute the original or modified versions
- ✅ **Private Use**: You can use this privately without restrictions
- ⚠️ **Liability**: No warranty or liability from the authors
- 📋 **License Notice**: Must include license notice in distributions

## 🎉 Acknowledgments

### Technologies Used
- **Next.js Team** - For the amazing React framework
- **Vercel** - For seamless deployment platform
- **Supabase** - For the excellent PostgreSQL-as-a-Service
- **Tailwind CSS** - For the utility-first CSS framework
- **shadcn/ui** - For beautiful, accessible UI components
- **Lucide** - For the comprehensive icon library

### Community
- **Open Source Community** - For inspiration and best practices
- **Vinted Users** - For creating the marketplace we're analyzing
- **Contributors** - Everyone who helps improve this project

---

## 🚀 Ready to Start?

1. **⚡ Quick Setup**: Follow the Quick Start guide above
2. **🎯 First Scrape**: Try searching for "nintendo gameboy" with a limit of 10
3. **📊 Explore Data**: Browse your results in the Items section
4. **⚙️ Monitor**: Check the Settings page for system health
5. **🔧 Customize**: Adjust settings for your specific needs

**Happy scraping!** 🛍️✨

---

*Built with ❤️ for the data analysis and e-commerce research community.*

*Last updated: January 2025*