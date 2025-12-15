import React, { useRef, useEffect, useState } from 'react';
import { Eraser, PenLine, RotateCcw } from 'lucide-react';

interface DrawingCanvasProps {
  onSave: (dataUrl: string) => void;
  className?: string;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4a4a4a');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onSave(canvas.toDataURL('image/png'));
      }
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative w-full h-48 bg-white rounded-2xl border-2 border-dashed border-moe-200 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center px-2">
        <div className="flex gap-2">
          <button 
            onClick={() => { setColor('#4a4a4a'); setLineWidth(3); }}
            className={`p-2 rounded-full ${color === '#4a4a4a' ? 'bg-moe-200 text-white' : 'bg-white text-moe-text'}`}
          >
            <PenLine size={18} />
          </button>
          <button 
             onClick={() => { setColor('#ff9a9e'); setLineWidth(3); }}
             className={`w-9 h-9 rounded-full border-2 border-white shadow-sm bg-[#ff9a9e] ${color === '#ff9a9e' ? 'ring-2 ring-moe-300' : ''}`}
          />
           <button 
             onClick={() => { setColor('#b5ead7'); setLineWidth(3); }}
             className={`w-9 h-9 rounded-full border-2 border-white shadow-sm bg-[#b5ead7] ${color === '#b5ead7' ? 'ring-2 ring-moe-300' : ''}`}
          />
        </div>
        <button 
          onClick={clearCanvas}
          className="p-2 text-moe-text hover:text-red-400 transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;