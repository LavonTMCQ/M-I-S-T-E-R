# MisterLabs - Organized Development Resources

This directory contains all development resources organized for clean project structure.

## 📁 Directory Structure

### 📚 Documentation (`docs/`)
Comprehensive documentation organized by category:

#### Sone Agent Documentation (`docs/sone/`)
- **ENHANCED_SONE_SUMMARY.md** - Complete overview of Sone agent capabilities
- **VOICE_STREAMING_GUIDE.md** - Voice implementation and streaming details
- **SONE_FINANCIAL_INTEGRATION.md** - Financial agent integration guide
- **SONE_MEMORY_ENHANCEMENTS.md** - Memory system architecture and usage
- **SONE_ADVANCED_WORKFLOWS_MCP.md** - Advanced workflow configurations
- **SONE_PERSONALIZED_AGUI_INTEGRATION.md** - AGUI integration patterns

#### General Documentation (`docs/general/`)
- **TRADING_SESSION_MEMORY_GUIDE.md** - Trading memory system implementation
- **BROWSER_TOOLS_RESTORED.md** - Browser automation tools documentation
- **PERSISTENT_BROWSER_SETUP.md** - Browser session persistence setup
- **PERSISTENT_SESSIONS_GUIDE.md** - Session management strategies

### 🧪 Tests (`tests/`)
Comprehensive test suite for all agent functionality:

#### Core Agent Tests
- **test-sone-voice.js** - Voice capabilities and streaming
- **test-enhanced-sone.js** - Complete agent functionality
- **test-mrs-connection.js** - Financial agent integration

#### Trading & Analysis Tests
- **test-trading-monitor.js** - Trading analysis and monitoring
- **test-trading-memory.js** - Trading memory persistence
- **test-improved-trading.js** - Enhanced trading features
- **test-instant-trading.js** - Real-time trading capabilities

#### Technical Tests
- **test-google-voice.js** - Google Voice service integration
- **test-screenshot-fix.js** - Screenshot and visual analysis
- **demo-voice-streaming.js** - Voice streaming demonstration

### 💡 Examples (`examples/`)
TypeScript examples demonstrating various features:

- **sone-voice-example.ts** - Voice integration patterns
- **sone-advanced-workflows-test.ts** - Advanced workflow examples
- **sone-financial-agents-test.ts** - Financial integration examples
- **sone-knowledge-base-test.ts** - Knowledge base implementation
- **sone-mcp-server-standalone.ts** - MCP server configuration
- **check-registration.ts** - Registration verification

## 🚀 Usage

### Running Tests
```bash
# From the sydney-agents directory
node misterlabs/tests/test-sone-voice.js
node misterlabs/tests/test-trading-monitor.js
node misterlabs/tests/test-mrs-connection.js
```

### Running Examples
```bash
# From the sydney-agents directory
npx tsx misterlabs/examples/sone-voice-example.ts
npx tsx misterlabs/examples/sone-advanced-workflows-test.ts
```

### Accessing Documentation
All documentation is in markdown format and can be viewed directly or with any markdown viewer.

## 🎯 Purpose

This organized structure provides:
- **Clean separation** of concerns
- **Easy navigation** to relevant resources
- **Comprehensive documentation** for all features
- **Extensive test coverage** for reliability
- **Practical examples** for implementation guidance

All functionality remains intact while providing a professional, maintainable codebase structure.
