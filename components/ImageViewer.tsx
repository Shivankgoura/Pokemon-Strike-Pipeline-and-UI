
import React, { useState, useRef, useEffect } from 'react';
import { Detection, Coordinate } from '../types';
import { STATUS_COLORS, ICONS } from '../constants';

interface ImageViewerProps {
  imageUrl: string | null;
  detections: Detection[];
  coordinates: Coordinate[];
  onCoordinateUpdate: (index: number, newCoord: Coordinate) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, detections, coordinates, onCoordinateUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!imageUrl) {
        setView({ x: 0, y: 0, scale: 1 });
        setImgSize({ width: 0, height: 0 });
        return;
    }

    const container = containerRef.current;
    if (!container) return;

    let isCancelled = false;
    const img = new Image();
    
    img.onload = () => {
      if (isCancelled) return;
      
      const containerW = container.offsetWidth;
      const containerH = container.offsetHeight;

      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Fallback in case container dimensions aren't available, to prevent scale=0
      if(containerW <= 1 || containerH <= 1) {
        setView({ scale: 1, x: 0, y: 0 });
        return;
      }

      const scaleW = containerW / img.naturalWidth;
      const scaleH = containerH / img.naturalHeight;
      const initialScale = Math.min(scaleW, scaleH, 1);
      const initialWidth = img.naturalWidth * initialScale;
      const initialHeight = img.naturalHeight * initialScale;
      
      setView({
        scale: initialScale,
        x: (containerW - initialWidth) / 2,
        y: (containerH - initialHeight) / 2,
      });
    };

    img.src = imageUrl;

    return () => {
        isCancelled = true;
    };
  }, [imageUrl]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.max(0.1, view.scale + (scaleAmount * view.scale));
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - view.x) * (newScale / view.scale);
    const newY = mouseY - (mouseY - view.y) * (newScale / view.scale);

    setView({ scale: newScale, x: newX, y: newY });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPanPoint.current.x;
    const dy = e.clientY - lastPanPoint.current.y;
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
    setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };


  const getOverlayStyle = (detection: Detection) => {
    if (detection.isProtected) return STATUS_COLORS.protected;
    if (detection.isTarget) return STATUS_COLORS.target;
    return STATUS_COLORS.neutral;
  };
  
  if (!imageUrl) {
    return (
      <div className="w-full h-full bg-brand-surface rounded-lg flex items-center justify-center text-brand-text-dim">
        <p>Upload an image to begin reconnaissance.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-brand-bg rounded-lg"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
      <div 
        className="absolute top-0 left-0"
        style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0'
        }}
      >
        <div className="relative" style={{ width: imgSize.width, height: imgSize.height }}>
          <img src={imageUrl} alt="Battlefield" className="pointer-events-none" style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }} />
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {detections.map((det) => {
              const style = getOverlayStyle(det);
              const [x, y, w, h] = det.bbox;
              return (
                <div
                  key={det.id}
                  className={`absolute ${style.border} ${style.bg} border-2 rounded-sm`}
                  style={{ left: x, top: y, width: w, height: h }}
                >
                  <div 
                    className={`absolute left-0 text-xs px-1 rounded-sm ${style.bg} ${style.text} font-mono flex items-center whitespace-nowrap`}
                    style={{ top: '-1.5rem', transform: `scale(${1/view.scale})`, transformOrigin: 'top left' }}
                    >
                    {det.isProtected && <ICONS.lock className="h-3 w-3 mr-1" />}
                    {det.isTarget && <ICONS.target className="h-3 w-3 mr-1" />}
                    {det.species} ({(det.confidence * 100).toFixed(0)}%)
                  </div>
                </div>
              );
            })}
            {coordinates.map((coord, index) => (
              <ICONS.crosshairs key={index} 
                  className="absolute text-red-500 transform -translate-x-1/2 -translate-y-1/2" 
                  style={{ left: coord[0], top: coord[1], width: 24 / view.scale, height: 24 / view.scale }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
