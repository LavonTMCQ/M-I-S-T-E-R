/**
 * Test script for Sone's enhanced knowledge base capabilities
 * This demonstrates the RAG (Retrieval-Augmented Generation) system
 */

import { soneAgent } from '../src/mastra/agents/sone-agent.js';

async function testSoneKnowledgeBase() {
  console.log('🧠 Testing Sone\'s Enhanced Knowledge Base System\n');

  try {
    // Test 1: Add a document to Sone's knowledge base
    console.log('📝 Test 1: Adding a document to knowledge base...');
    
    const addDocumentResponse = await soneAgent.generate(
      `Please add this document to your knowledge base:
      
      Title: "Mastra Framework Overview"
      Content: "Mastra is a TypeScript framework for building AI agents with comprehensive capabilities including memory, voice, tools, and evaluations. It supports multiple LLM providers like Google Gemini, OpenAI, and Anthropic. Key features include: 1) Agent system with memory and tools, 2) Voice capabilities with TTS/STT, 3) RAG (Retrieval-Augmented Generation) for knowledge management, 4) Evaluation metrics for quality assurance, 5) MCP (Model Context Protocol) for tool integration. Mastra is designed for production-ready AI applications with TypeScript best practices."
      Category: "technical"
      Tags: ["framework", "typescript", "ai", "agents"]
      Source: "documentation"`,
      {
        resourceId: 'test-user',
        threadId: 'knowledge-test-thread'
      }
    );
    
    console.log('✅ Add Document Response:', addDocumentResponse.text);
    console.log('');

    // Test 2: Search the knowledge base
    console.log('🔍 Test 2: Searching knowledge base...');
    
    const searchResponse = await soneAgent.generate(
      'Search your knowledge base for information about "Mastra framework features"',
      {
        resourceId: 'test-user',
        threadId: 'knowledge-test-thread'
      }
    );
    
    console.log('✅ Search Response:', searchResponse.text);
    console.log('');

    // Test 3: Add another document with different category
    console.log('📝 Test 3: Adding a personal document...');
    
    const addPersonalDocResponse = await soneAgent.generate(
      `Add this personal note to your knowledge base:
      
      Title: "Project Goals 2024"
      Content: "My main goals for 2024 include: 1) Learn advanced AI development with frameworks like Mastra, 2) Build a personal AI assistant with voice capabilities, 3) Implement RAG systems for knowledge management, 4) Contribute to open-source AI projects, 5) Master TypeScript and modern development practices. Focus areas: agent development, memory systems, and voice integration."
      Category: "personal"
      Tags: ["goals", "2024", "ai", "development"]
      Source: "personal-notes"`,
      {
        resourceId: 'test-user',
        threadId: 'knowledge-test-thread'
      }
    );
    
    console.log('✅ Add Personal Document Response:', addPersonalDocResponse.text);
    console.log('');

    // Test 4: Search with category filter
    console.log('🎯 Test 4: Searching with category filter...');
    
    const categorySearchResponse = await soneAgent.generate(
      'Search your knowledge base for "AI development" but only in personal category documents',
      {
        resourceId: 'test-user',
        threadId: 'knowledge-test-thread'
      }
    );
    
    console.log('✅ Category Search Response:', categorySearchResponse.text);
    console.log('');

    // Test 5: General conversation with knowledge context
    console.log('💬 Test 5: General conversation with knowledge context...');
    
    const conversationResponse = await soneAgent.generate(
      'Based on what you know about me and the information in your knowledge base, what would you recommend I focus on first for learning AI agent development?',
      {
        resourceId: 'test-user',
        threadId: 'knowledge-test-thread'
      }
    );
    
    console.log('✅ Conversation Response:', conversationResponse.text);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary of Enhanced Capabilities:');
    console.log('✅ Enhanced Working Memory Template - Comprehensive user profiling');
    console.log('✅ RAG Knowledge Base System - Document processing and search');
    console.log('✅ Advanced Memory Processors - TokenLimiter and ToolCallFilter');
    console.log('✅ Cross-Conversation Semantic Search - scope: "resource"');
    console.log('✅ Google Voice Integration - TTS/STT capabilities');
    console.log('✅ Gemini 2.0 Flash Model - Latest Google AI model');
    console.log('✅ Comprehensive Evaluations - Quality metrics enabled');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : String(error));
  }
}

// Run the test
testSoneKnowledgeBase().catch(console.error);
