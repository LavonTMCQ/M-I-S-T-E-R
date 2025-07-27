"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Shield,
  Target,
  Sparkles,
  TrendingUp,
  Wallet,
  Star,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Zap,
  Mail,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";

export default function LandingPage() {
  const { mainWallet, connectWallet, isLoading } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);

    try {
      // Try to connect to Vespr wallet first
      if (window.cardano?.vespr) {
        const success = await connectWallet('vespr');
        if (success) {
          console.log('✅ Wallet connected successfully');
          // Navigate to direct trading page
          window.location.href = '/trading';
          return;
        }
      }

      // Try other wallets
      for (const walletType of ['nami', 'eternl', 'flint']) {
        if (window.cardano?.[walletType]) {
          const success = await connectWallet(walletType);
          if (success) {
            console.log(`✅ ${walletType} wallet connected successfully`);
            window.location.href = '/trading';
            return;
          }
        }
      }

      alert('No Cardano wallet found. Please install Vespr, Nami, or another Cardano wallet.');
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const features = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "AI-Powered Trading",
      description: "Advanced machine learning algorithms analyze market patterns and execute optimal trades on Strike Finance"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Non-Custodial Security",
      description: "Your funds stay in wallets you control. MISTER manages trading strategies, you control the keys."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Precision Execution",
      description: "Lightning-fast trade execution with advanced risk management and automated position sizing"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Smart Analytics",
      description: "Real-time performance tracking with professional-grade dashboards and insights"
    }
  ];

  const stats = [
    { label: "Beta Version", value: "v1.0", icon: <TrendingUp className="w-5 h-5" /> },
    { label: "AI Agents", value: "3+", icon: <Wallet className="w-5 h-5" /> },
    { label: "Trading Modes", value: "Manual & AI", icon: <Star className="w-5 h-5" /> },
    { label: "Cardano Native", value: "100%", icon: <BarChart3 className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Announcement Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                MISTER AI Trading - Now Live with Agent Vaults
                <ArrowRight className="w-4 h-4 ml-2" />
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="space-y-6"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="text-foreground">Meet </span>
                <span className="bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MISTER
                </span>
                <br />
                <span className="text-foreground/80 text-3xl md:text-5xl lg:text-6xl">
                  Your AI Trading Companion
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Advanced machine learning algorithms analyze market patterns and execute optimal trades on Strike Finance.
                Non-custodial, secure, and designed for the future of DeFi trading.
              </p>
            </motion.div>

            {/* Trading Mode Selection */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-10 max-w-4xl mx-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Direct Trading */}
                <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Direct Trading</h3>
                      <p className="text-sm text-muted-foreground">Use your own wallet</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Connect your Cardano wallet and trade directly with full control over your funds.
                  </p>
                  <Button
                    size="lg"
                    onClick={mainWallet ? () => window.location.href = '/trading' : handleConnectWallet}
                    disabled={isConnecting || isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    {isConnecting || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Connecting...
                      </>
                    ) : mainWallet ? (
                      <>
                        <TrendingUp className="mr-2 h-5 w-5" />
                        Start Direct Trading
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-5 w-5" />
                        Connect Wallet
                      </>
                    )}
                  </Button>
                </div>

                {/* Agent Vault Smart Contracts - NOW LIVE */}
                <div className="relative bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Bot className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Agent Vault Smart Contracts</h3>
                      <p className="text-sm text-muted-foreground">Secure automated trading</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Deploy your personal Agent Vault smart contract for fully automated trading with our proven 62.5% win rate ADA Custom Algorithm.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => window.location.href = '/agent-vault-setup'}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    <Bot className="mr-2 h-5 w-5" />
                    Create Agent Vault
                  </Button>

                  {/* Live Badge */}
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    LIVE
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = '/login'}
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 text-lg font-semibold transition-all duration-300"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Sign In with Email
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 text-lg font-semibold transition-all duration-300"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  View Live Performance
                </Button>
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-background"></div>
                </div>
                <span>Beta testing phase</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>Early access program</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Non-custodial & secure</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-b from-muted/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Beta Platform Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              MISTER is in active development with cutting-edge AI trading technology for Cardano
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <Card className="p-6 text-center hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl text-primary">
                        {stat.icon}
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-foreground mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium mb-6">
              <Bot className="w-4 h-4 mr-2 text-primary" />
              Powered by Advanced AI
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Why Choose <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">MISTER</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced machine learning meets institutional-grade security.
              Experience the future of automated DeFi trading on Cardano.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="h-full text-center hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <CardContent className="pt-8 pb-8">
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl text-primary group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle className="text-xl mb-4 group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-primary via-blue-600 to-purple-600 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium mb-6 bg-white/20 text-white border-white/30">
              <Zap className="w-4 h-4 mr-2" />
              Start Trading in Minutes
            </Badge>

            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to Meet <br />
              <span className="text-white/90">MISTER</span>?
            </h2>

            <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Experience fully automated trading with our proven 62.5% win rate ADA Custom Algorithm.
              Connect your wallet or create an Agent Vault for hands-free trading.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
              <Button
                size="lg"
                onClick={mainWallet ? () => window.location.href = '/trading-mode' : handleConnectWallet}
                disabled={isConnecting || isLoading}
                className="min-w-[240px] h-14 text-base font-semibold bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <Wallet className="w-5 h-5 mr-2" />
                {isConnecting || isLoading ? 'Connecting...' :
                 mainWallet ? 'Start Trading with AI' : 'Connect Profile Wallet'}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="min-w-[240px] h-14 text-base font-semibold border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                View Live Demo
              </Button>
            </div>

            {/* Final Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Bank-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Non-custodial</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>5-star rated</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
