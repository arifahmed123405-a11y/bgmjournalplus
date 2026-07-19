import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

export default function ImageViewer({ src, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Scroll wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = 10;
    let newZoom = zoom;
    if (e.deltaY < 0) {
      newZoom = Math.min(300, zoom + zoomStep);
    } else {
      newZoom = Math.max(50, zoom - zoomStep);
    }
    setZoom(newZoom);
  };

  // Dragging to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(300, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(50, prev - 25));
  };

  const handleReset = () => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 select-none"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top bar */}
      <div className="flex w-full items-center justify-between bg-zinc-900/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">Image Viewer</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">
            {zoom}%
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="rounded bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 transition-colors"
            title="Zoom Out (Scroll Down)"
            id="btn-viewer-zoomout"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 300}
            className="rounded bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 transition-colors"
            title="Zoom In (Scroll Up)"
            id="btn-viewer-zoomin"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleReset}
            className="rounded bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            title="Reset Fit"
            id="btn-viewer-reset"
          >
            <Maximize2 size={18} />
          </button>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <button
            onClick={onClose}
            className="rounded bg-rose-950/40 p-2 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition-colors"
            id="btn-viewer-close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image Stage */}
      <div
        className="relative flex-1 w-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[80vh] max-w-[90vw]"
        >
          <img
            src={src}
            alt="Trade chart screenshot"
            className="pointer-events-none select-none max-h-full max-w-full rounded border border-zinc-800 shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Instructions Overlay */}
      <div className="pb-4 text-center text-xs text-zinc-500 font-mono">
        Drag to Pan • Use mouse wheel or tracks to continuous zoom ({zoom}%) • Esc to Close
      </div>
    </div>
  );
}
