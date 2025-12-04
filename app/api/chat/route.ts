import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Create MCP client and connect to Wikipedia MCP server
    console.log('[MCP] Starting Wikipedia MCP server...');
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', 'wikipedia-mcp'],
    });

    const client = new Client(
      {
        name: 'wikipedia-chat-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log('[MCP] Connected to Wikipedia MCP server');

    // Get available tools from MCP server
    const toolsList = await client.listTools();
    console.log('[MCP] Available tools:', toolsList.tools.map(t => t.name));

    // Convert MCP tools to Anthropic tool format
    const tools = toolsList.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.inputSchema,
    }));

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...messages];
          let continueLoop = true;

          // Loop to handle multiple rounds of tool use
          while (continueLoop) {
            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-5',
              max_tokens: 4096,
              messages: currentMessages,
              tools: tools,
              stream: true,
            });

            let currentText = '';
            let toolUseBlocks: any[] = [];
            let currentToolInputJson = '';
            let stopReason = '';

            for await (const event of response) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  currentToolInputJson = '';
                  toolUseBlocks.push({
                    type: 'tool_use',
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: {},
                  });
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  currentText += event.delta.text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`)
                  );
                } else if (event.delta.type === 'input_json_delta') {
                  const lastBlock = toolUseBlocks[toolUseBlocks.length - 1];
                  if (lastBlock) {
                    currentToolInputJson += event.delta.partial_json;
                    try {
                      lastBlock.input = JSON.parse(currentToolInputJson);
                    } catch {
                      // Still accumulating JSON
                    }
                  }
                }
              } else if (event.type === 'message_delta') {
                stopReason = event.delta.stop_reason || '';
              }
            }

            // Handle tool use
            if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
              const toolResults = [];

              for (const toolUse of toolUseBlocks) {
                console.log('[MCP] Calling tool:', toolUse.name, 'with input:', toolUse.input);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'tool_use', name: toolUse.name, input: toolUse.input })}\n\n`)
                );

                try {
                  const result = await client.callTool({
                    name: toolUse.name,
                    arguments: toolUse.input,
                  });
                  console.log('[MCP] Tool result:', result);

                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: JSON.stringify(result.content),
                  });

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', content: result.content })}\n\n`)
                  );
                } catch (error: any) {
                  console.error('[MCP] Tool call error:', error);
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: `Error: ${error.message}`,
                    is_error: true,
                  });
                }
              }

              // Add assistant message with tool use and user message with results
              currentMessages.push({
                role: 'assistant',
                content: [
                  ...(currentText ? [{ type: 'text' as const, text: currentText }] : []),
                  ...toolUseBlocks,
                ],
              });

              currentMessages.push({
                role: 'user',
                content: toolResults,
              });

              // Continue the loop to get the next response
              continueLoop = true;
            } else {
              // No more tool use, we're done
              continueLoop = false;
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          await client.close();
        } catch (error: any) {
          console.error('[Chat Error]:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
          );
          controller.close();
          await client.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
