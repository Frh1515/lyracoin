# LYRA COIN - Telegram Mini App

A comprehensive Telegram Mini App for LYRA COIN featuring mining, tasks, referrals, and crypto games.

## Features

- 🎯 **Task System**: Complete daily and fixed tasks to earn points and minutes
- ⛏️ **Mining System**: Mine minutes every 6 hours, claim rewards every 24 hours
- 🔗 **Referral System**: Invite friends and earn rewards
- 🎮 **Crypto Games**: Play Crypto Candy Crush to earn additional rewards
- 💰 **TON Wallet Integration**: Connect your TON wallet for future features
- 🌍 **Multi-language**: Support for English and Arabic
- 📱 **Responsive Design**: Optimized for mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Blockchain**: TON Connect for wallet integration
- **Build Tool**: Vite
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lyra-coin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Database Schema

The app uses Supabase with the following main tables:

- `users` - User profiles and stats
- `referrals` - Referral relationships
- `daily_tasks` / `fixed_tasks` - Task definitions
- `user_daily_tasks` / `user_fixed_tasks` - Task completions
- `user_mining_progress` - Mining session tracking
- `game_sessions` - Game play tracking
- `transactions` - TON transactions
- `boosts` - Mining boost purchases

## Key Features

### Mining System
- Start 6-hour mining sessions
- Accumulate minutes over time
- Claim rewards every 24 hours
- Boost multipliers for enhanced rewards

### Task System
- Daily tasks that refresh every day
- Fixed tasks that can be completed once
- Social media engagement tasks
- Password-protected video tasks

### Referral System
- Generate unique referral links
- Track referral statistics
- Earn points and minutes for successful referrals
- Tier-based rewards (Bronze, Silver, Gold, Platinum)

### Gaming
- Crypto Candy Crush game
- Match crypto logos to earn rewards
- Special LYRA coin power-ups
- Limited daily sessions for points

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── context/            # React context providers
├── hooks/              # Custom React hooks
└── lib/
    └── supabase/       # Supabase client and functions

supabase/
└── migrations/         # Database migration files
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

The app is configured for deployment on Netlify:

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, contact the development team or create an issue in the repository.