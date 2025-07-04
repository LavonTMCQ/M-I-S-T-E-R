# 🛠️ MISTER Implementation Guide - Immediate Next Steps

## **Step 1: Backend Project Setup (Day 1-2)**

### **1.1 Initialize Backend Project**

```bash
# Create backend directory
mkdir mister-backend
cd mister-backend

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install express typescript ts-node @types/node @types/express
npm install cors helmet morgan compression dotenv
npm install ws @types/ws socket.io
npm install prisma @prisma/client
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
npm install axios zod winston

# Install development dependencies
npm install -D nodemon @types/cors @types/helmet @types/morgan
npm install -D jest @types/jest supertest @types/supertest
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### **1.2 Project Structure**

```
mister-backend/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── config/
│   │   ├── database.ts        # Database configuration
│   │   ├── security.ts        # Security settings
│   │   └── environment.ts     # Environment variables
│   ├── routes/
│   │   ├── dashboard.ts       # Dashboard API routes
│   │   ├── positions.ts       # Positions API routes
│   │   ├── activity.ts        # AI Activity API routes
│   │   ├── wallet.ts          # Wallet API routes
│   │   └── market-data.ts     # Market data API routes
│   ├── services/
│   │   ├── WalletManager.ts   # Cardano wallet management
│   │   ├── PaperTrading.ts    # Paper trading simulation
│   │   ├── MarketData.ts      # Market data aggregation
│   │   └── Database.ts        # Database operations
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── validation.ts      # Request validation
│   │   └── errorHandler.ts    # Error handling
│   ├── types/
│   │   ├── api.ts             # API type definitions
│   │   ├── trading.ts         # Trading type definitions
│   │   └── wallet.ts          # Wallet type definitions
│   └── utils/
│       ├── logger.ts          # Logging utility
│       ├── crypto.ts          # Cryptographic utilities
│       └── helpers.ts         # General helpers
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── tests/
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
├── docker-compose.yml         # Development environment
├── Dockerfile                 # Container configuration
├── package.json
├── tsconfig.json
└── .env.example
```

### **1.3 Basic Express Setup**

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Route imports
import dashboardRoutes from './routes/dashboard';
import positionsRoutes from './routes/positions';
import activityRoutes from './routes/activity';
import walletRoutes from './routes/wallet';
import marketDataRoutes from './routes/market-data';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/positions', authMiddleware, positionsRoutes);
app.use('/api/ai-activity', authMiddleware, activityRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/market-data', marketDataRoutes); // Public endpoint

// Error handling
app.use(errorHandler);

export default app;
```

## **Step 2: Database Setup (Day 2-3)**

### **2.1 Prisma Schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Wallet information
  wallets   Wallet[]
  
  // Trading data
  positions Position[]
  activities AIActivity[]
  
  @@map("users")
}

model Wallet {
  id            String   @id @default(cuid())
  userId        String
  bech32Address String   @unique
  keyId         String   // KMS key identifier
  isActive      Boolean  @default(true)
  balance       Float    @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("wallets")
}

model Position {
  id               String   @id @default(cuid())
  userId           String
  pair             String   // e.g., "ADA/USD"
  type             String   // "Long" | "Short"
  size             Float
  entryPrice       Float
  currentPrice     Float
  pnl              Float
  pnlPercent       Float
  status           String   // "open" | "closed"
  leverage         Int
  collateralAmount Float
  isVirtual        Boolean  @default(true) // Paper trading flag
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("positions")
}

model AIActivity {
  id          String   @id @default(cuid())
  userId      String
  action      String
  description String?
  pair        String?
  amount      Float?
  price       Float?
  status      String   // "success" | "info" | "error" | "pending"
  txHash      String?
  createdAt   DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@map("ai_activities")
}

model MarketData {
  id                String   @id @default(cuid())
  pair              String
  price             Float
  change24h         Float
  changePercent24h  Float
  volume24h         Float
  high24h           Float
  low24h            Float
  timestamp         DateTime @default(now())
  
  @@map("market_data")
}
```

### **2.2 Database Service**

```typescript
// src/services/Database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('Database disconnected');
  }

  // User operations
  async createUser(email: string): Promise<any> {
    return this.prisma.user.create({
      data: { email }
    });
  }

  async getUserById(id: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        wallets: true,
        positions: true,
        activities: true
      }
    });
  }

  // Position operations
  async createPosition(data: any): Promise<any> {
    return this.prisma.position.create({ data });
  }

  async updatePosition(id: string, data: any): Promise<any> {
    return this.prisma.position.update({
      where: { id },
      data
    });
  }

  async getUserPositions(userId: string): Promise<any[]> {
    return this.prisma.position.findMany({
      where: { userId, status: 'open' },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Activity operations
  async createActivity(data: any): Promise<any> {
    return this.prisma.aIActivity.create({ data });
  }

  async getUserActivities(userId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.aIActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // Market data operations
  async saveMarketData(data: any): Promise<any> {
    return this.prisma.marketData.create({ data });
  }

  async getLatestMarketData(pair: string): Promise<any> {
    return this.prisma.marketData.findFirst({
      where: { pair },
      orderBy: { timestamp: 'desc' }
    });
  }
}

export const database = new DatabaseService();
```

## **Step 3: Paper Trading Service (Day 3-4)**

### **3.1 Paper Trading Implementation**

```typescript
// src/services/PaperTrading.ts
import { database } from './Database';
import { marketDataService } from './MarketData';
import { logger } from '../utils/logger';

export interface VirtualPosition {
  id: string;
  userId: string;
  pair: string;
  type: 'Long' | 'Short';
  size: number;
  entryPrice: number;
  leverage: number;
  collateralAmount: number;
  createdAt: Date;
}

export class PaperTradingService {
  private virtualBalance: Map<string, number> = new Map();

  constructor() {
    // Initialize with default virtual balance
    this.setVirtualBalance('default', 10000); // $10k virtual balance
  }

  setVirtualBalance(userId: string, balance: number): void {
    this.virtualBalance.set(userId, balance);
  }

  getVirtualBalance(userId: string): number {
    return this.virtualBalance.get(userId) || 10000;
  }

  async openVirtualPosition(
    userId: string,
    pair: string,
    type: 'Long' | 'Short',
    size: number,
    leverage: number
  ): Promise<VirtualPosition> {
    try {
      // Get current market price
      const marketData = await marketDataService.getCurrentPrice(pair);
      const entryPrice = marketData.price;
      
      // Calculate collateral needed
      const collateralAmount = size / leverage;
      
      // Check if user has enough virtual balance
      const currentBalance = this.getVirtualBalance(userId);
      if (currentBalance < collateralAmount) {
        throw new Error('Insufficient virtual balance');
      }

      // Create virtual position in database
      const position = await database.createPosition({
        userId,
        pair,
        type,
        size,
        entryPrice,
        currentPrice: entryPrice,
        pnl: 0,
        pnlPercent: 0,
        status: 'open',
        leverage,
        collateralAmount,
        isVirtual: true
      });

      // Update virtual balance
      this.setVirtualBalance(userId, currentBalance - collateralAmount);

      // Log activity
      await database.createActivity({
        userId,
        action: `Opened ${type} Position`,
        description: `Virtual ${type} position opened for ${pair}`,
        pair,
        amount: size,
        price: entryPrice,
        status: 'success'
      });

      logger.info(`Virtual position opened: ${position.id} for user ${userId}`);
      return position;

    } catch (error) {
      logger.error('Error opening virtual position:', error);
      throw error;
    }
  }

  async closeVirtualPosition(positionId: string, userId: string): Promise<any> {
    try {
      // Get position
      const position = await database.prisma.position.findUnique({
        where: { id: positionId }
      });

      if (!position || position.userId !== userId) {
        throw new Error('Position not found or unauthorized');
      }

      // Get current market price
      const marketData = await marketDataService.getCurrentPrice(position.pair);
      const closePrice = marketData.price;

      // Calculate P&L
      const priceDiff = closePrice - position.entryPrice;
      const multiplier = position.type === 'Long' ? 1 : -1;
      const pnl = (priceDiff * multiplier * position.size);
      const pnlPercent = (pnl / position.collateralAmount) * 100;

      // Update position
      const updatedPosition = await database.updatePosition(positionId, {
        status: 'closed',
        currentPrice: closePrice,
        pnl,
        pnlPercent,
        updatedAt: new Date()
      });

      // Return collateral + P&L to virtual balance
      const currentBalance = this.getVirtualBalance(userId);
      const returnAmount = position.collateralAmount + pnl;
      this.setVirtualBalance(userId, currentBalance + returnAmount);

      // Log activity
      await database.createActivity({
        userId,
        action: `Closed ${position.type} Position`,
        description: `Virtual position closed with ${pnl >= 0 ? 'profit' : 'loss'} of $${pnl.toFixed(2)}`,
        pair: position.pair,
        amount: position.size,
        price: closePrice,
        status: 'success'
      });

      logger.info(`Virtual position closed: ${positionId} with P&L: $${pnl.toFixed(2)}`);
      return updatedPosition;

    } catch (error) {
      logger.error('Error closing virtual position:', error);
      throw error;
    }
  }

  async updatePositionPnL(userId: string): Promise<void> {
    try {
      // Get all open positions for user
      const positions = await database.getUserPositions(userId);

      for (const position of positions) {
        // Get current market price
        const marketData = await marketDataService.getCurrentPrice(position.pair);
        const currentPrice = marketData.price;

        // Calculate current P&L
        const priceDiff = currentPrice - position.entryPrice;
        const multiplier = position.type === 'Long' ? 1 : -1;
        const pnl = (priceDiff * multiplier * position.size);
        const pnlPercent = (pnl / position.collateralAmount) * 100;

        // Update position with current P&L
        await database.updatePosition(position.id, {
          currentPrice,
          pnl,
          pnlPercent,
          updatedAt: new Date()
        });
      }

    } catch (error) {
      logger.error('Error updating position P&L:', error);
    }
  }

  async getPortfolioSummary(userId: string): Promise<any> {
    try {
      const positions = await database.getUserPositions(userId);
      const virtualBalance = this.getVirtualBalance(userId);

      const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
      const totalCollateral = positions.reduce((sum, pos) => sum + pos.collateralAmount, 0);
      const totalValue = virtualBalance + totalCollateral + totalPnL;

      return {
        totalValue,
        availableBalance: virtualBalance,
        totalPnL,
        totalPnLPercent: totalCollateral > 0 ? (totalPnL / totalCollateral) * 100 : 0,
        openPositions: positions.length,
        dailyChange: 0, // TODO: Calculate from historical data
        dailyChangePercent: 0
      };

    } catch (error) {
      logger.error('Error getting portfolio summary:', error);
      throw error;
    }
  }
}

export const paperTradingService = new PaperTradingService();
```

This implementation guide provides:

1. **Complete backend project setup** with proper TypeScript configuration
2. **Database schema and service** using Prisma with PostgreSQL
3. **Paper trading service** that simulates real trading with virtual money
4. **Proper error handling and logging** throughout
5. **Modular architecture** that can easily be extended

The paper trading approach allows you to:
- Test all trading logic with real market data
- Provide realistic user experience without financial risk
- Easily transition to real trading when ready
- Debug and optimize the AI strategy safely

Would you like me to continue with the next steps (Market Data Service, API Routes, or WebSocket implementation)?
