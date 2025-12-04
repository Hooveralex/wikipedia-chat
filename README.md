# Wikipedia AI Chat

A Next.js chat application that uses the Anthropic API (Claude) with the Wikipedia MCP (Model Context Protocol) to answer questions by searching and retrieving information from Wikipedia.

## What This Is

This is a fully functional AI chat interface where you can ask questions and Claude will automatically:
1. Search Wikipedia for relevant articles
2. Read the full article content
3. Provide comprehensive answers based on Wikipedia data

The app demonstrates how to integrate Model Context Protocol (MCP) servers with Claude AI in a Next.js application.

## Features

- Clean, modern chat interface built with shadcn/ui and Tailwind CSS
- Real-time streaming responses from Claude
- Automatic Wikipedia integration via MCP
- Shows when Wikipedia is being searched
- TypeScript for type safety
- Support for multiple rounds of tool calling (search → read article → answer)

## Prerequisites

- Node.js 18+ installed
- An Anthropic API key ([get one here](https://console.anthropic.com/))

## Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd /Users/alexhoover/Documents/projects/wikipedia-chat
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Set up your API key:**

   Edit the `.env.local` file and add your Anthropic API key:
   ```bash
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**

   Visit [http://localhost:3000](http://localhost:3000)

6. **Try it out!**

   Ask questions like:
   - "What is quantum computing?"
   - "Tell me about the Battle of the Alamo"
   - "Who was Albert Einstein?"
   - "What are the main causes of climate change?"

## How It Works

### Architecture

1. **Frontend** (`app/page.tsx`):
   - React chat interface with real-time message streaming
   - Displays user messages and AI responses
   - Shows indicators when Wikipedia is being searched

2. **API Route** (`app/api/chat/route.ts`):
   - Handles communication between frontend and Anthropic API
   - Spawns Wikipedia MCP server for each request
   - Manages multiple rounds of tool calling (search → read → respond)
   - Streams responses back to the frontend

3. **MCP Integration**:
   - Wikipedia MCP server runs via `npx wikipedia-mcp`
   - Provides two tools to Claude:
     - `search`: Find articles matching search terms
     - `readArticle`: Retrieve full article content
   - Automatically started/stopped for each chat request

4. **Streaming**:
   - Server-Sent Events (SSE) stream responses in real-time
   - User sees responses as they're generated
   - Tool use is visible with indicators

### Request Flow

```
User asks question
    ↓
Frontend sends to /api/chat
    ↓
API spawns Wikipedia MCP server
    ↓
Claude receives question + Wikipedia tools
    ↓
Claude searches Wikipedia (tool call #1)
    ↓
Claude reads relevant articles (tool call #2)
    ↓
Claude provides answer based on Wikipedia content
    ↓
Response streams back to frontend
    ↓
User sees complete answer
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Anthropic SDK** - Claude AI integration (model: claude-sonnet-4-5)
- **MCP SDK** - Model Context Protocol client
- **Wikipedia MCP** - Wikipedia search and retrieval server

## Project Structure

```
wikipedia-chat/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # API endpoint with MCP integration
│   ├── page.tsx               # Main chat interface
│   ├── globals.css            # Global styles
│   └── layout.tsx             # Root layout
├── components/
│   └── ui/                    # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
├── lib/
│   └── utils.ts               # Utility functions
├── .env.local                 # Environment variables (not in git)
├── .env.example               # Example env file
├── package.json               # Dependencies
└── README.md                  # This file
```

## Key Dependencies

```json
{
  "@anthropic-ai/sdk": "Latest",
  "@modelcontextprotocol/sdk": "Latest",
  "wikipedia-mcp": "Latest",
  "next": "15.x",
  "react": "19.x",
  "lucide-react": "Latest"
}
```

## Environment Variables

Create a `.env.local` file with:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

**Important:** Never commit `.env.local` to git. It's already in `.gitignore`.

## Troubleshooting

### Wikipedia MCP not working
- Check terminal logs for `[MCP]` prefixed messages
- Ensure `npx wikipedia-mcp` can run: `npx -y wikipedia-mcp --version`
- Verify tool calls are receiving proper parameters

### API Errors
- Verify your Anthropic API key is correct in `.env.local`
- Check you're using a valid model ID (currently `claude-sonnet-4-5`)
- Look at terminal logs for detailed error messages

### Scrolling Issues
- The chat uses native browser scrolling with `overflow-y-auto`
- Auto-scrolls to bottom on new messages

### No Streaming
- Check browser console for JavaScript errors
- Verify `/api/chat` endpoint is accessible
- Ensure Server-Sent Events are not blocked

## Development

### Adding New Features

The codebase is well-structured for adding features:

- **New UI components**: Add to `components/ui/`
- **Styling changes**: Update Tailwind classes or `globals.css`
- **Chat logic**: Modify `app/page.tsx`
- **API/MCP logic**: Modify `app/api/chat/route.ts`

### Using Different MCP Servers

To use a different MCP server instead of Wikipedia:

1. Install the MCP package
2. Update `app/api/chat/route.ts`:
   ```typescript
   const transport = new StdioClientTransport({
     command: 'npx',
     args: ['-y', 'your-mcp-package'],
   });
   ```

### Logging

Console logs are prefixed for easy filtering:
- `[MCP]` - MCP server operations
- `[Chat Error]` - Chat-related errors

## Deployment

For production deployment:

1. **Set environment variables** on your hosting platform
2. **Build the project**: `npm run build`
3. **Start production server**: `npm start`

Recommended platforms:
- Vercel (easiest for Next.js)
- Railway
- Render
- Any Node.js hosting

**Note:** Ensure your hosting platform can run `npx` commands for the MCP server.

## License

MIT

---

## Quick Reference

**Start dev server:** `npm run dev`
**Stop server:** Press `Ctrl+C` or `pkill -f "next dev"`
**View logs:** Check terminal where `npm run dev` is running
**Reset chat:** Refresh the browser page
**API endpoint:** `http://localhost:3000/api/chat`
**Frontend:** `http://localhost:3000`

## Questions?

This project demonstrates:
- ✅ Anthropic API integration with streaming
- ✅ Model Context Protocol (MCP) server integration
- ✅ Multi-round tool calling (agentic workflow)
- ✅ Modern Next.js 15 App Router patterns
- ✅ shadcn/ui component library
- ✅ Server-Sent Events (SSE) streaming
- ✅ TypeScript best practices

Built with Claude Code! 🤖
