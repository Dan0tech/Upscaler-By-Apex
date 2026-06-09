import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Zap, Download, RefreshCw, AlertTriangle, MonitorSmartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [option, setOption] = useState<'nanoBanana' | '8kEnhance'>('nanoBanana');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResultImage(null);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // WARNING: Using API keys in the client side is generally not recommended for production
      // as it exposes the key to the browser.
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is missing. Please add it to your secrets.');
      }

      const ai = new GoogleGenAI({ apiKey });

      // Convert file to Base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Extract just the base64 content, removing the data URI prefix
      const base64Content = base64Data.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

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
                data: base64Content,
                mimeType: mimeType,
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
        throw new Error('Model failed to return a processed image');
      }

      setResultImage(finalOutput);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResultImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen h-full bg-[#050505] flex items-center justify-center font-sans overflow-hidden p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[360px] h-auto min-h-[740px] max-h-full bg-[#0b0b0f] rounded-[48px] border-[10px] border-[#1a1a1e] relative overflow-hidden flex flex-col shadow-[0_0_100px_rgba(255,0,255,0.15)] shrink-0"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-[#1a1a1e] rounded-b-2xl z-50"></div>
        
        <header className="pt-10 px-6 pb-4 flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-400 font-bold tracking-[0.2em] uppercase">AI Engine Active</span>
            <h1 className="text-xl font-black text-white italic tracking-tighter">NANO BANANA <span className="text-pink-500">2 PRO</span></h1>
          </div>
          <div className="w-8 h-8 rounded-full border border-pink-500/50 flex items-center justify-center text-pink-500 bg-pink-500/10">
            <Zap className="w-4 h-4" />
          </div>
        </header>

        <div className="flex-1 px-4 pb-6 flex flex-col gap-3 custom-scrollbar overflow-y-auto">
          
          <AnimatePresence mode="popLayout">
            {!previewUrl ? (
              <motion.div
                key="upload-box"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="relative shrink-0 h-[240px] bg-[#12121a] rounded-3xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center gap-2 group shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] cursor-pointer"
              >
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-grid" />
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform z-10">
                  <Upload className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest z-10">Upload Source</span>
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded-lg border border-white/10 text-[9px] text-white/50 z-10">PREVIEW_MODE_V2.0</div>
              </motion.div>
            ) : (
                <motion.div
                  key="preview-box"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative shrink-0 h-[240px] rounded-3xl border border-cyan-500/30 overflow-hidden shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultImage || previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-[#0a0520]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                      <div className="w-12 h-12 border-4 border-[#0ff]/20 border-t-[#0ff] rounded-full animate-spin" />
                      <p className="font-sans font-bold tracking-widest text-[#0ff] text-[10px] uppercase animate-pulse">ENHANCING...</p>
                    </div>
                  )}

                  {!isProcessing && resultImage && (
                    <div className="absolute top-3 right-3 bg-black/80 rounded-lg border border-white/10 px-2 py-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[9px] text-white/50 uppercase tracking-widest">RESTORE_COMPLETE</span>
                    </div>
                  )}
                </motion.div>
            )}
          </AnimatePresence>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 rounded-2xl bg-red-900/20 border border-red-500/50 flex flex-col gap-2 shrink-0 mb-1"
            >
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold text-[10px] uppercase tracking-widest">System Error</span>
              </div>
              <p className="text-xs text-red-200/80 leading-relaxed break-words relative overflow-auto max-h-32">
                {error}
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3 shrink-0 flex-1 content-start">
            
            <div 
              onClick={() => setOption('nanoBanana')}
              className={`col-span-2 rounded-3xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                option === 'nanoBanana' 
                 ? 'bg-[#1a1a24] border border-pink-500/20 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]'
                 : 'bg-[#16161e] border border-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col">
                <span className={`text-[10px] font-black tracking-widest uppercase ${option === 'nanoBanana' ? 'text-pink-500' : 'text-white/40'}`}>Gemini Flash Image</span>
                <h2 className="text-lg font-bold text-white">Nano Banana 2</h2>
              </div>
              <div className={`w-12 h-6 rounded-full relative border transition-colors ${option === 'nanoBanana' ? 'bg-pink-500/20 border-pink-500/40' : 'bg-white/10 border-white/20'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${option === 'nanoBanana' ? 'right-1 bg-pink-500 shadow-[0_0_10px_#ec4899]' : 'left-1 bg-white/50'}`}></div>
              </div>
            </div>

            <div 
              onClick={() => setOption('8kEnhance')}
              className={`col-span-2 rounded-3xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                option === '8kEnhance' 
                 ? 'bg-[#1a1a24] border border-cyan-500/20 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]'
                 : 'bg-[#16161e] border border-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col">
                <span className={`text-[10px] font-black tracking-widest uppercase ${option === '8kEnhance' ? 'text-cyan-500' : 'text-white/40'}`}>Gemini Pro Image</span>
                <h2 className="text-lg font-bold text-white">8K Super Enhance</h2>
              </div>
              <div className={`w-12 h-6 rounded-full relative border transition-colors ${option === '8kEnhance' ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white/10 border-white/20'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${option === '8kEnhance' ? 'right-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'left-1 bg-white/50'}`}></div>
              </div>
            </div>

            <div className={`bg-[#16161e] rounded-3xl p-4 border flex flex-col justify-between h-[110px] transition-colors ${option === 'nanoBanana' ? 'border-yellow-500/20' : 'border-white/5'}`}>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Denoise</p>
                <p className="text-sm font-bold text-white">Clean Grain</p>
              </div>
            </div>
            
            <div className={`bg-[#16161e] rounded-3xl p-4 border flex flex-col justify-between h-[110px] transition-colors ${option === '8kEnhance' ? 'border-green-500/20' : 'border-white/5'}`}>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/40 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Smart Unblur</p>
                <p className="text-sm font-bold text-white">Focus AI</p>
              </div>
            </div>

            {!resultImage ? (
              <div className="col-span-2 mt-auto h-[70px] bg-gradient-to-r from-cyan-500 to-pink-500 rounded-2xl p-[1px] shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                <button
                  onClick={processImage}
                  disabled={!file || isProcessing}
                  className={`w-full h-full bg-[#0b0b0f] rounded-2xl flex items-center justify-center gap-3 transition-transform ${(!file || isProcessing) ? 'opacity-80 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
                >
                  <span className="text-white font-black tracking-[0.2em] uppercase text-sm">
                    {isProcessing ? 'Processing...' : 'Execute Processing'}
                  </span>
                  {!isProcessing && <Zap className="w-5 h-5 text-cyan-400" />}
                </button>
              </div>
            ) : (
              <div className="col-span-2 mt-auto grid grid-cols-2 gap-3 h-[70px]">
                <div className="h-full bg-gradient-to-r from-white/20 to-white/10 rounded-2xl p-[1px]">
                  <button
                    onClick={handleReset}
                    className="w-full h-full bg-[#0b0b0f] rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 font-black tracking-[0.1em] uppercase text-[10px]">Reset</span>
                  </button>
                </div>
                <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-2xl p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  <a
                    href={resultImage}
                    target="_blank"
                    rel="noreferrer"
                    download="restored_image.jpg"
                    className="w-full h-full bg-[#0b0b0f] rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-cyan-400"
                  >
                    <Download className="w-4 h-4" />
                    <span className="font-black tracking-[0.1em] uppercase text-[10px]">Save Result</span>
                  </a>
                </div>
              </div>
            )}
            
          </div>
        </div>

        <nav className="h-20 bg-[#08080c] border-t border-white/5 px-8 flex justify-between items-center shrink-0">
          <div className="text-cyan-500 flex flex-col items-center gap-1 cursor-pointer">
            <Zap className="w-5 h-5" />
            <span className="text-[8px] uppercase font-bold tracking-widest">Portal</span>
          </div>
          <div className="text-white/20 flex flex-col items-center gap-1 hover:text-white/50 cursor-pointer transition-colors">
            <RefreshCw className="w-5 h-5" />
            <span className="text-[8px] uppercase font-bold tracking-widest">History</span>
          </div>
          <div className="text-white/20 flex flex-col items-center gap-1 hover:text-white/50 cursor-pointer transition-colors">
            <MonitorSmartphone className="w-5 h-5" />
            <span className="text-[8px] uppercase font-bold tracking-widest">Setup</span>
          </div>
        </nav>

      </motion.div>
    </div>
  );
}

