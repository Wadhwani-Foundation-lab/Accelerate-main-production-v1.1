/**
 * Test script to verify Claude API key is working
 * Run with: npx tsx src/scripts/test-claude-api.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testClaudeAPI() {
    console.log('🧪 Testing Claude API connection...\n');

    // Check if API key is set
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ ERROR: ANTHROPIC_API_KEY is not set in .env file');
        process.exit(1);
    }

    console.log('✅ API key found in environment variables');
    console.log(`   Key preview: ${process.env.ANTHROPIC_API_KEY.substring(0, 20)}...`);
    console.log('');

    // Initialize Anthropic client
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        console.log('📡 Sending test request to Claude API...');

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: 'Say "Hello! The API key is working correctly." in exactly that format.'
                }
            ]
        });

        console.log('✅ Success! Claude API responded:\n');

        // Extract response text
        const responseText = message.content[0].type === 'text'
            ? message.content[0].text
            : 'No text response';

        console.log(`   ${responseText}`);
        console.log('');
        console.log('📊 API Response Details:');
        console.log(`   Model: ${message.model}`);
        console.log(`   Input tokens: ${message.usage.input_tokens}`);
        console.log(`   Output tokens: ${message.usage.output_tokens}`);
        console.log('');
        console.log('✅ Your Claude API integration is working perfectly!');
        console.log('   You can now generate AI insights in the application.');

    } catch (error: any) {
        console.error('❌ ERROR: Failed to connect to Claude API\n');

        if (error.status === 401) {
            console.error('   Authentication failed - Invalid API key');
            console.error('   Please check your API key at: https://console.anthropic.com/');
        } else if (error.status === 429) {
            console.error('   Rate limit exceeded');
            console.error('   Please wait a moment and try again');
        } else if (error.status === 400) {
            console.error('   Bad request:', error.message);
        } else {
            console.error('   Unexpected error:', error.message);
        }

        console.error('\n   Full error details:');
        console.error(error);
        process.exit(1);
    }
}

testClaudeAPI();
