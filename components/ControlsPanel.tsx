
import React, { useRef, useState } from 'react';
import { ICONS } from '../constants';

interface SingleAnalysisProps {
  onImageUpload: (file: File | null) => void;
  hqOrders: string;
  onHqOrdersChange: (orders: string) => void;
  onParseOrders: () => void;
  onRunDetection: () => void;
  onGenerateCoordinates: () => void;
  onSimulate: () => void;
  imageLoaded: boolean;
  ordersParsed: boolean;
  detectionRun: boolean;
  coordsGenerated: boolean;
}

interface BatchTestProps {
    batchImages: File[];
    ordersFile: File | null;
    onBatchImagesChange: (files: FileList | null) => void;
    onOrdersFileChange: (file: File | null) => void;
    onRunBatch: () => void;
    onDownloadCsv: () => void;
    batchStatus: 'Idle' | 'Processing' | 'Complete' | 'Error';
    batchProgress: { current: number; total: number };
    isCsvReady: boolean;
}

interface CommonProps {
  ammo: number;
  onAmmoChange: (value: number) => void;
  confidence: number;
  onConfidenceChange: (value: number) => void;
}

type ControlsPanelProps = SingleAnalysisProps & BatchTestProps & CommonProps;


const Button: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string }> = ({ onClick, disabled, children, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-4 py-2 rounded transition-colors duration-200 flex items-center space-x-3 ${
      disabled 
        ? 'bg-brand-surface text-brand-text-dim cursor-not-allowed' 
        : `bg-brand-surface-light hover:bg-brand-primary hover:text-white ${className}`
    }`}
  >
    {children}
  </button>
);

const Parameters: React.FC<CommonProps> = ({ ammo, onAmmoChange, confidence, onConfidenceChange}) => (
    <div className="bg-brand-bg p-3 rounded-md border border-brand-surface-light space-y-4">
        <h3 className="text-md font-semibold text-brand-text-dim">Parameters</h3>
        <div>
        <label htmlFor="confidence" className="flex justify-between text-xs"><span>Confidence Threshold</span><span>{confidence.toFixed(2)}</span></label>
        <input type="range" id="confidence" min="0" max="1" step="0.05" value={confidence} onChange={e => onConfidenceChange(parseFloat(e.target.value))} className="w-full h-2 bg-brand-surface-light rounded-lg appearance-none cursor-pointer accent-brand-primary"/>
        </div>
        <div>
        <label htmlFor="ammo" className="flex justify-between text-xs"><span>Ammunition Budget</span><span>{ammo}</span></label>
        <input type="range" id="ammo" min="1" max="20" step="1" value={ammo} onChange={e => onAmmoChange(parseInt(e.target.value))} className="w-full h-2 bg-brand-surface-light rounded-lg appearance-none cursor-pointer accent-brand-primary"/>
        </div>
    </div>
);

const SingleAnalysisPanel: React.FC<SingleAnalysisProps & CommonProps> = (props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col space-y-4">
             <div>
                <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={(e) => props.onImageUpload(e.target.files ? e.target.files[0] : null)} className="hidden"/>
                <Button onClick={() => fileInputRef.current?.click()}>
                <ICONS.upload className="h-5 w-5"/>
                <span>1. Load Battlefield Image</span>
                </Button>
            </div>
            
            <div className="flex flex-col space-y-2">
                <label htmlFor="hq-orders" className="text-brand-text-dim">2. HQ Orders</label>
                <textarea
                id="hq-orders"
                value={props.hqOrders}
                onChange={(e) => props.onHqOrdersChange(e.target.value)}
                rows={5}
                className="bg-brand-bg rounded p-2 text-xs border border-brand-surface-light focus:ring-1 focus:ring-brand-primary focus:outline-none"
                placeholder="Paste tactical orders here..."
                />
                <Button onClick={props.onParseOrders} disabled={!props.hqOrders}>
                <span>Parse Orders</span>
                </Button>
            </div>

            <div>
                <Button onClick={props.onRunDetection} disabled={!props.imageLoaded}>
                <span>3. Run Detection</span>
                </Button>
            </div>
            
            <Parameters {...props} />

            <div>
                <Button onClick={props.onGenerateCoordinates} disabled={!props.detectionRun || !props.ordersParsed}>
                <span>4. Generate Coordinates</span>
                </Button>
            </div>

            <div className="pt-4 border-t border-brand-surface-light space-y-2">
                <Button onClick={props.onSimulate} disabled={!props.coordsGenerated} className="bg-brand-warning/20 text-brand-warning hover:bg-brand-warning hover:text-black">
                <span>5. Simulate Engagement</span>
                </Button>
            </div>
        </div>
    );
};

const BatchTestPanel: React.FC<BatchTestProps & CommonProps> = (props) => {
    const imagesInputRef = useRef<HTMLInputElement>(null);
    const ordersInputRef = useRef<HTMLInputElement>(null);
    const progressPercent = props.batchProgress.total > 0 ? (props.batchProgress.current / props.batchProgress.total) * 100 : 0;

    return (
        <div className="flex flex-col space-y-4">
            <p className="text-xs text-brand-text-dim">Upload multiple images and a corresponding JSON orders file to run a batch test and generate a CSV of targeting coordinates.</p>
            
            <div className="space-y-2">
                <input type="file" accept="image/png, image/jpeg" multiple ref={imagesInputRef} onChange={(e) => props.onBatchImagesChange(e.target.files)} className="hidden"/>
                <Button onClick={() => imagesInputRef.current?.click()}>
                    <ICONS.upload className="h-5 w-5"/>
                    <span>{props.batchImages.length > 0 ? `${props.batchImages.length} Images Loaded` : 'Upload Images'}</span>
                </Button>
            </div>

            <div className="space-y-2">
                 <input type="file" accept=".json" ref={ordersInputRef} onChange={(e) => props.onOrdersFileChange(e.target.files ? e.target.files[0] : null)} className="hidden"/>
                <Button onClick={() => ordersInputRef.current?.click()}>
                    <ICONS.upload className="h-5 w-5"/>
                    <span>{props.ordersFile ? `${props.ordersFile.name} Loaded` : 'Upload Orders JSON'}</span>
                </Button>
            </div>
            
            <Parameters {...props} />
            
            <div className="pt-4 border-t border-brand-surface-light space-y-4">
                <Button 
                    onClick={props.onRunBatch} 
                    disabled={props.batchImages.length === 0 || !props.ordersFile || props.batchStatus === 'Processing'}
                    className="bg-brand-secondary/20 text-brand-secondary hover:bg-brand-secondary hover:text-white"
                >
                    <span>{props.batchStatus === 'Processing' ? 'Processing...' : 'Run Batch Analysis'}</span>
                </Button>
                
                {props.batchStatus === 'Processing' && (
                    <div className="w-full bg-brand-bg rounded-full h-2.5">
                        <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${progressPercent}%`, transition: 'width 0.2s' }}></div>
                        <p className="text-xs text-center text-brand-text-dim mt-1">{`Processing ${props.batchProgress.current} / ${props.batchProgress.total}`}</p>
                    </div>
                )}
                
                <Button 
                    onClick={props.onDownloadCsv} 
                    disabled={!props.isCsvReady}
                    className="bg-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white"
                >
                    <span>Download Results CSV</span>
                </Button>

                {props.batchStatus === 'Error' && <p className="text-xs text-brand-danger text-center">An error occurred during batch processing. Check the console.</p>}
            </div>
        </div>
    );
};

export const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  const TabButton: React.FC<{tab: 'single' | 'batch', children: React.ReactNode}> = ({tab, children}) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium transition-colors w-full rounded-md ${activeTab === tab ? 'bg-brand-primary text-white' : 'bg-brand-surface-light text-brand-text-dim hover:bg-brand-surface'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-brand-surface h-full rounded-lg p-4 flex flex-col space-y-4 overflow-y-auto">
      <h2 className="text-lg font-bold border-b border-brand-surface-light pb-2">Mission Control</h2>
      
        <div className="grid grid-cols-2 gap-2 p-1 bg-brand-bg rounded-lg">
            <TabButton tab="single">Single Analysis</TabButton>
            <TabButton tab="batch">Batch Test</TabButton>
        </div>

      {activeTab === 'single' ? <SingleAnalysisPanel {...props} /> : <BatchTestPanel {...props} />}
    </div>
  );
};
