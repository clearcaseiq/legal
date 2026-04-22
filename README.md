# Injury Intelligence

A production-ready legal case assessment platform that uses AI to predict case viability and connect clients with qualified attorneys.

## 🚀 Quick Start

### Automated Setup
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run setup script
./scripts/setup.sh

# Start development servers
./scripts/dev.sh
```

### Manual Setup

#### 1. Prerequisites
- Node.js 18+ and pnpm
- Docker and Docker Compose
- Git

#### 2. Clone and Install
```bash
git clone <repository-url>
cd injury-intelligence
pnpm install
```

#### 3. Environment Setup
```bash
cp env.example .env
# Edit .env with your configuration
```

#### 4. Database Setup
```bash
# Start MySQL (Docker)
docker-compose up -d db

# Setup API
cd api
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

**Local MySQL (without Docker):** Install MySQL 8, create database `injury_intelligence`, then set `DATABASE_URL="mysql://root:password@localhost:3306/injury_intelligence"` in `api/.env`.

#### 5. Web Application
```bash
# In another terminal
cd app
pnpm install
pnpm dev
```

## 🌐 Access Points

- **Web Application**: http://localhost:3000
- **API Server**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health
- **Database**: localhost:3306 (MySQL)

## 🏗️ Architecture

### Backend (API)
- **Framework**: Node.js + Express + TypeScript
- **Database**: MySQL 8 with Prisma ORM
- **Validation**: Zod schemas
- **Logging**: Pino
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer

### Frontend (Web)
- **Framework**: Next.js + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Database
- **Engine**: MySQL 8
- **ORM**: Prisma
- **Migrations**: Prisma Migrate
- **Seeding**: Custom seed scripts

## ✨ Features

### Core Functionality
- **Case Assessment Wizard**: Multi-step form with validation
- **AI Prediction Engine**: Mock ML service for viability analysis
- **Attorney Matching**: Search and connect with qualified lawyers
- **Evidence Upload**: Secure file upload and processing
- **Statute of Limitations**: Automated SOL calculations
- **Demand Letter Generation**: Professional letter templates

### Technical Features
- **Real-time Validation**: Form validation with Zod
- **Responsive Design**: Mobile-first Tailwind CSS
- **Error Handling**: Comprehensive error boundaries
- **Loading States**: Skeleton loaders and spinners
- **Type Safety**: End-to-end TypeScript
- **API Documentation**: OpenAPI 3.0 specification

## 📁 Project Structure

```
injury-intelligence/
├── api/                     # Backend API
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── lib/             # Utilities and services
│   │   └── index.ts         # Server entry point
│   ├── prisma/              # Database schema and migrations
│   └── package.json
├── app/                     # Frontend application
│   ├── src/
│   │   ├── pages/           # Route components
│   │   ├── components/      # Reusable UI components
│   │   ├── lib/             # API client and utilities
│   │   └── main.tsx         # App entry point
│   └── package.json
├── apps/                    # Additional workspace packages
│   ├── mobile/
│   ├── ml-service/
│   └── directory-pipeline/
├── scripts/                 # Development scripts
├── docker-compose.yml       # Multi-service setup
└── README.md
```

## 🔧 Development

### Available Scripts

#### Root Level
```bash
pnpm dev          # Start all services
pnpm build        # Build all applications
pnpm clean        # Clean build artifacts
```

#### API (`api`)
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm prisma:dev   # Run migrations and seed
pnpm prisma:studio # Open Prisma Studio
```

#### Web (`app`)
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Database Management

```bash
# Reset database (WARNING: deletes all data)
./scripts/reset-db.sh

# Access database directly
docker-compose exec db psql -U postgres -d injury

# View database in browser
cd api && pnpm prisma studio
```

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:4000/health

# Create assessment
curl -X POST http://localhost:4000/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "claimType": "auto",
    "venue": {"state": "CA"},
    "incident": {
      "date": "2024-01-15",
      "narrative": "Rear-end collision at intersection"
    },
    "consents": {
      "tos": true,
      "privacy": true,
      "ml_use": true
    }
  }'

# Get prediction
curl -X POST http://localhost:4000/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"assessmentId": "your-assessment-id"}'
```

### Web Application
- Navigate to http://localhost:3000
- Complete the assessment wizard
- View results and attorney matches

## 🚀 Deployment

### Production Build
```bash
# Build all applications
pnpm build

# Start production services
docker-compose -f docker-compose.prod.yml up
```

### Environment Variables
```bash
# Required
DATABASE_URL=mysql://user:pass@host:3306/injury_intelligence
NODE_ENV=production
PORT=4000

# Optional
FILE_BUCKET=s3://your-bucket
SENDGRID_API_KEY=your-key
TWILIO_ACCOUNT_SID=your-sid
```

## 🔒 Security

### Implemented Security Measures
- **Input Validation**: Zod schema validation
- **CORS Protection**: Configurable origins
- **Rate Limiting**: 100 requests per 15 minutes
- **Helmet**: Security headers
- **File Upload Limits**: 10MB max file size
- **SQL Injection Protection**: Prisma ORM

### Recommended Production Security
- Use HTTPS in production
- Implement authentication (JWT/OAuth)
- Add request logging and monitoring
- Use environment-specific secrets
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Update documentation for new features
- Ensure all tests pass
- Follow the existing code style

## 📋 Roadmap

### Phase 1 (Current)
- [x] Basic case assessment
- [x] Mock AI predictions
- [x] Attorney matching
- [x] Demand letter generation

### Phase 2
- [ ] User authentication
- [ ] Real AI/ML integration
- [ ] Advanced evidence processing
- [ ] Payment processing
- [ ] Email notifications

### Phase 3
- [ ] Mobile application
- [ ] Advanced analytics
- [ ] Integration with legal databases
- [ ] Multi-tenant architecture

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API specification

## ⚠️ Disclaimer

This tool provides estimates only and is not legal advice. Always consult with a qualified attorney before making legal decisions. Results are based on limited information and may not reflect actual case outcomes.
