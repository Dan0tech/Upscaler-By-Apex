import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/enhance', upload.single('image'), async (req, res) => {
    try {
      const file = req.file;
      const { option } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Please add it to your secrets.' });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const base64Image = file.buffer.toString('base64');
      
      const modelName = option === '8kEnhance' ? 'gemini-3.1-flash-image' : 'gemini-2.5-flash-image';
      const promptText = option === '8kEnhance' 
        ? 'significantly enhance, upscale, denoise and unblur this photo to ultra-high resolution, preserving original details with maximum clarity' 
        : 'denoise, upscale, and unblur this photo, improving its clarity, sharpness, and quality without changing the subject';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: file.mimetype,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      });

      let finalOutput;
      
      // The response output contains image parts. Find the image part.
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          finalOutput = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!finalOutput) {
        return res.status(500).json({ error: 'Model failed to return a processed image' });
      }

      res.json({ output: finalOutput });
    } catch (error: any) {
      console.error("Gemini GenAI Error:", error);
      res.status(500).json({ error: error.message || 'Error processing image' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
