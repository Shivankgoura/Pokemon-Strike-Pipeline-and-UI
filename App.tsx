import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { ImageViewer } from './components/ImageViewer';
import { ResultsPanel } from './components/ResultsPanel';
import { parseOrders, detectPokemon, generateCoordinates, simulateEngagement } from './services/apiService';
import { GameStatus, LogEntry, ParsedOrders, Detection, Coordinate, Score, PromptData } from './types';
import { POKEMON_CLASSES } from './constants';
import { samplePromptsData } from './data';

const getImageDimensions = (file: File): Promise<{width: number; height: number}> => {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve({width: img.naturalWidth, height: img.naturalHeight});
        img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  // State for single-image analysis
  const [status, setStatus] = useState<GameStatus>(GameStatus.Idle);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hqOrders, setHqOrders] = useState<string>(samplePromptsData[0].prompt);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrders | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [ammo, setAmmo] = useState(10);
  const [confidence, setConfidence] = useState(0.7);

  // State for batch processing
  const [batchImages, setBatchImages] = useState<File[]>([]);
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [batchStatus, setBatchStatus] = useState<'Idle' | 'Processing' | 'Complete' | 'Error'>('Idle');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResultCSV, setBatchResultCSV] = useState<string | null>(null);


  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);
  
  useEffect(() => {
    if (status !== GameStatus.Idle) {
      addLog(status);
    }
  }, [status, addLog]);

  useEffect(() => {
    // Revoke the old object URL to avoid memory leaks.
    return () => {
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
    };
  }, [imageUrl]);

  const handleImageUpload = useCallback((file: File | null) => {
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setDetections([]);
      setCoordinates([]);
      setParsedOrders(null);
      setScore(null);
      addLog(`Image loaded: ${file.name}`, 'success');
      
      const matchedPrompt = samplePromptsData.find(p => p.image_id === file.name);
      if(matchedPrompt){
        setHqOrders(matchedPrompt.prompt);
        addLog(`Loaded sample HQ orders for ${file.name}`);
      } else {
        setHqOrders('');
      }

      setStatus(GameStatus.Idle);
    }
  }, [addLog]);

  const handleParseOrders = useCallback(async () => {
    if (!hqOrders) {
      addLog('HQ orders are empty.', 'error');
      return;
    }
    setStatus(GameStatus.Parsing);
    try {
      const result = await parseOrders(hqOrders);
      setParsedOrders(result);
      addLog(`Orders parsed. Targets: ${result.targets.join(', ') || 'None'}. Protected: ${result.protected.join(', ') || 'None'}.`, 'success');
    } catch (e) {
      const error = e as Error;
      addLog(`Failed to parse orders: ${error.message}`, 'error');
    } finally {
      setStatus(GameStatus.Idle);
    }
  }, [hqOrders, addLog]);
  
  const handleRunDetection = useCallback(async () => {
    if (!imageFile) {
      addLog('No image uploaded.', 'error');
      return;
    }
    setStatus(GameStatus.Detecting);
    try {
      const rawDetections = await detectPokemon(imageFile);
      const imageDims = await getImageDimensions(imageFile);

      const processedDetections: Detection[] = rawDetections.map((det, index) => {
        const [y_min, x_min, y_max, x_max] = det.bbox;
        const x = (x_min / 1000) * imageDims.width;
        const y = (y_min / 1000) * imageDims.height;
        const w = ((x_max - x_min) / 1000) * imageDims.width;
        const h = ((y_max - y_min) / 1000) * imageDims.height;
        
        return {
          ...det,
          id: index,
          bbox: [x, y, w, h],
          bboxNormalized: det.bbox as [number, number, number, number],
          isTarget: false,
          isProtected: false,
        }
      });
      
      setDetections(processedDetections);
      addLog(`Detection complete. Found ${processedDetections.length} potential targets.`, 'success');
      setStatus(GameStatus.Idle);
    } catch (e) {
      const error = e as Error;
      addLog(`Detection failed: ${error.message}`, 'error');
      setStatus(GameStatus.Idle);
    }
  }, [imageFile, addLog]);

  const updatedDetections = useMemo(() => {
    if (!parsedOrders) return detections;
    return detections
      .filter(d => d.confidence >= confidence)
      .map(d => ({
        ...d,
        isTarget: parsedOrders.targets.includes(POKEMON_CLASSES[d.class_id]),
        isProtected: parsedOrders.protected.includes(POKEMON_CLASSES[d.class_id]),
      }));
  }, [detections, parsedOrders, confidence]);

  const handleGenerateCoordinates = useCallback(async () => {
      if(updatedDetections.length === 0){
        addLog('No valid detections to generate coordinates from.', 'warning');
        return;
      }
      setStatus(GameStatus.Generating);
      try {
        const coords = await generateCoordinates(updatedDetections, ammo);
        setCoordinates(coords);
        addLog(`Generated ${coords.length} targeting coordinates.`, 'success');
        setStatus(GameStatus.Ready);
      } catch (e) {
         const error = e as Error;
        addLog(`Coordinate generation failed: ${error.message}`, 'error');
        setStatus(GameStatus.Idle);
      }
  }, [updatedDetections, ammo, addLog]);

  const handleSimulate = useCallback(async () => {
    if(coordinates.length === 0){
        addLog('No coordinates to simulate.', 'warning');
        return;
    }
    setStatus(GameStatus.Simulating);
    try {
        const result = await simulateEngagement(updatedDetections, coordinates);
        setScore(result);
        addLog(`Simulation complete. Score: ${result.total}. Hits: ${result.hits}, Collateral: ${result.collateral}, Misses: ${result.misses}.`, 'success');
        setStatus(GameStatus.Done);
    } catch (e) {
        const error = e as Error;
        addLog(`Simulation failed: ${error.message}`, 'error');
        setStatus(GameStatus.Ready);
    }
  }, [coordinates, updatedDetections, addLog]);

  const handleCoordinateUpdate = (index: number, newCoord: Coordinate) => {
    setCoordinates(coords => {
        const newCoords = [...coords];
        newCoords[index] = newCoord;
        return newCoords;
    });
  };

  const handleRunBatchAnalysis = async () => {
    if (batchImages.length === 0 || !ordersFile) {
      alert("Please upload battlefield images and an orders JSON file.");
      return;
    }

    setBatchStatus('Processing');
    setBatchProgress({ current: 0, total: batchImages.length });
    setBatchResultCSV(null);
    addLog('Starting batch analysis...', 'info');

    try {
        const ordersText = await ordersFile.text();
        const ordersData: PromptData[] = JSON.parse(ordersText);
        const ordersMap = new Map(ordersData.map(p => [p.image_id, p.prompt]));
        
        const uniqueOrders = [...new Set(ordersData.map(p => p.prompt))];
        const parsedOrdersCache = new Map<string, Promise<ParsedOrders>>();

        uniqueOrders.forEach(order => {
            if (order) {
                parsedOrdersCache.set(order, parseOrders(order));
            }
        });
        
        const results: { image_id: string; points: string; }[] = [];
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < batchImages.length; i++) {
            const imageFile = batchImages[i];
            setBatchProgress({ current: i + 1, total: batchImages.length });

            try {
                const hqOrders = ordersMap.get(imageFile.name);
                if (!hqOrders) {
                    addLog(`No orders found for ${imageFile.name}, skipping.`, 'warning');
                    continue;
                }
                
                addLog(`Processing ${imageFile.name}...`, 'info');

                const parsedPromise = parsedOrdersCache.get(hqOrders);
                if (!parsedPromise) {
                     addLog(`Could not find cached parsed orders for ${imageFile.name}, skipping.`, 'warning');
                     continue;
                }
                const parsed = await parsedPromise;

                const rawDetections = await detectPokemon(imageFile);
                const imageDims = await getImageDimensions(imageFile);

                const processedDetections: Detection[] = rawDetections.map((det, index) => {
                  const [y_min, x_min, y_max, x_max] = det.bbox;
                  const x = (x_min / 1000) * imageDims.width;
                  const y = (y_min / 1000) * imageDims.height;
                  const w = ((x_max - x_min) / 1000) * imageDims.width;
                  const h = ((y_max - y_min) / 1000) * imageDims.height;
                  
                  return {
                    ...det,
                    id: index,
                    bbox: [x, y, w, h],
                    bboxNormalized: det.bbox as [number, number, number, number],
                    isTarget: false,
                    isProtected: false,
                  }
                });

                const updatedDetectionsForBatch = processedDetections
                  .filter(d => d.confidence >= confidence)
                  .map(d => ({
                    ...d,
                    isTarget: parsed.targets.includes(POKEMON_CLASSES[d.class_id]),
                    isProtected: parsed.protected.includes(POKEMON_CLASSES[d.class_id]),
                  }));

                const coordinates = await generateCoordinates(updatedDetectionsForBatch, ammo);
                addLog(`Generated ${coordinates.length} coordinates for ${imageFile.name}.`, 'success');
                
                const pointsString = JSON.stringify(coordinates.map(c => [
                    parseFloat(c[0].toFixed(2)),
                    parseFloat(c[1].toFixed(2))
                ]));

                results.push({
                    image_id: imageFile.name,
                    points: pointsString,
                });

            } catch (e: any) {
                console.error(`Failed to process image ${imageFile.name}:`, e);
                addLog(`Error processing ${imageFile.name}: ${e.message}`, 'error');
            }

            if (i < batchImages.length - 1) {
                await delay(500);
            }
        }
        
        if (results.length > 0) {
            const csvHeader = 'image_id,points\n';
            const csvRows = results.map(r => `${r.image_id},"${r.points.replace(/"/g, '""')}"`).join('\n');
            setBatchResultCSV(csvHeader + csvRows);
            addLog('Batch analysis complete. CSV is ready for download.', 'success');
        } else {
            addLog('Batch analysis finished, but no results were generated.', 'warning');
        }
        setBatchStatus('Complete');

    } catch (e: any) {
        console.error("Batch analysis failed:", e);
        addLog(`A critical error occurred during batch setup: ${e.message}`, 'error');
        setBatchStatus('Error');
    }
  };


  const handleDownloadCsv = () => {
    if (!batchResultCSV) return;
    const blob = new Blob([batchResultCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `batch_results_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-brand-bg text-sm">
      <header className="bg-brand-surface p-3 border-b border-brand-surface-light flex justify-between items-center text-brand-text-dim">
        <h1 className="text-xl font-bold text-brand-text">Tactical Strike Dashboard</h1>
        <div className="flex items-center space-x-4">
            <span className="text-sm">Operator: <span className="font-bold text-brand-primary">Team Alpha</span></span>
            <div className="w-48 text-center bg-brand-bg px-3 py-1 rounded">
                Status: <span className="font-semibold text-brand-secondary">{status}</span>
            </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        <div className="col-span-12 lg:col-span-3 min-h-0">
          <ControlsPanel 
            // Single Analysis Props
            onImageUpload={handleImageUpload}
            hqOrders={hqOrders}
            onHqOrdersChange={setHqOrders}
            onParseOrders={handleParseOrders}
            onRunDetection={handleRunDetection}
            onGenerateCoordinates={handleGenerateCoordinates}
            onSimulate={handleSimulate}
            imageLoaded={!!imageFile}
            ordersParsed={!!parsedOrders}
            detectionRun={detections.length > 0}
            coordsGenerated={coordinates.length > 0}
            ammo={ammo}
            onAmmoChange={setAmmo}
            confidence={confidence}
            onConfidenceChange={setConfidence}
            // Batch Test Props
            batchImages={batchImages}
            ordersFile={ordersFile}
            onBatchImagesChange={(files) => setBatchImages(Array.from(files || []))}
            onOrdersFileChange={(file) => setOrdersFile(file)}
            onRunBatch={handleRunBatchAnalysis}
            onDownloadCsv={handleDownloadCsv}
            batchStatus={batchStatus}
            batchProgress={batchProgress}
            isCsvReady={!!batchResultCSV}
          />
        </div>
        
        <div className="col-span-12 lg:col-span-6 min-h-0 flex flex-col">
          <ImageViewer 
            imageUrl={imageUrl}
            detections={updatedDetections}
            coordinates={coordinates}
            onCoordinateUpdate={handleCoordinateUpdate}
          />
        </div>

        <div className="col-span-12 lg:col-span-3 min-h-0">
           <ResultsPanel 
              parsedOrders={parsedOrders}
              detections={updatedDetections}
              logs={logs}
              score={score}
            />
        </div>
      </div>
    </div>
  );
};

export default App;