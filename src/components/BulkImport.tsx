import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, Download, Loader2, X } from 'lucide-react';
import api from '../services/api';

interface BulkImportProps {
  onImportComplete: () => void;
  onClose: () => void;
}

export default function BulkImport({ onImportComplete, onClose }: BulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    processed: number;
    success: any[];
    failed: any[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload a valid spreadsheet CSV file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/urls/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResults(res.data);
      onImportComplete();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to process bulk import. Ensure CSV is configured correctly.';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  const trigDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "long_url,custom_alias,expires_at,is_public\n"
      + "https://github.com/google,google-git,2026-12-31,true\n"
      + "https://aimagic.com,,2026-06-15,false\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "base62_bulk_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setErrorMsg(null);
  };

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans font-semibold text-lg text-zinc-100 flex items-center space-x-2">
          <Upload className="w-5 h-5 text-[#6ee7b7]" />
          <span>CSV Bulk Shortener</span>
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!results ? (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Shorten up to 100 links concurrently by submitting a standards-compliant CSV spreadsheet. Columns will map dynamically using fields listed below.
          </p>

          {/* Sample CSV CTA */}
          <button
            onClick={trigDownloadSample}
            type="button"
            className="flex items-center space-x-2 text-xs font-mono text-[#6ee7b7] hover:text-[#52cfa0] border border-dashed border-[#6ee7b7]/30 bg-[#6ee7b7]/5 px-3 py-1.5 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV template</span>
          </button>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all ${
              dragging
                ? 'border-[#6ee7b7] bg-[#6ee7b7]/5'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/35'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <Upload className={`w-8 h-8 mb-3 ${dragging ? 'text-[#6ee7b7] animate-bounce' : 'text-zinc-500'}`} />
            
            {file ? (
              <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-xs font-mono text-zinc-300">
                <FileText className="w-4 h-4 text-[#6ee7b7]" />
                <span className="truncate max-w-[180px]">{file.name}</span>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-xs font-sans font-medium text-zinc-300">
                  Drag and drop your spreadsheet, or click to browse
                </p>
                <p className="text-[10px] font-mono text-zinc-500">
                  Must be CSV format. Triggers up to 100 items limit.
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-900/10 border border-red-500/20 text-red-400 text-xs font-mono rounded flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload and Close actions */}
          <div className="flex items-center justify-end space-x-3 mt-4">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-transparent text-zinc-500 hover:text-zinc-300 transition-colors rounded text-xs font-sans"
            >
              Cancel
            </button>
            <button
              disabled={!file || uploading}
              onClick={handleUpload}
              type="button"
              className="px-4 py-2 bg-[#6ee7b7] hover:bg-[#52cfa0] disabled:opacity-40 text-[#0d0d0f] font-sans font-semibold text-xs rounded transition-colors flex items-center space-x-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing Spreadsheet...</span>
                </>
              ) : (
                <>
                  <span>Inject & Run Bulk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded">
            <span className="text-zinc-400 font-sans">Total processed:</span>
            <span className="text-zinc-100 font-bold font-mono">{results.processed} line(s)</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-2.5 bg-green-500/5 border border-green-500/20 rounded flex items-center justify-between">
              <span className="text-green-400 flex items-center space-x-1.5 font-sans pr-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Success:</span>
              </span>
              <span className="text-[#6ee7b7] font-bold">{results.success.length}</span>
            </div>
            <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded flex items-center justify-between">
              <span className="text-amber-400 flex items-center space-x-1.5 font-sans pr-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Failed:</span>
              </span>
              <span className="text-red-400 font-bold">{results.failed.length}</span>
            </div>
          </div>

          {/* Summary lists of fail rows */}
          {results.failed.length > 0 && (
            <div className="space-y-1.5">
              <span className="block font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider">
                Exclusions & Anomalies Log:
              </span>
              <div className="max-h-36 overflow-y-auto border border-zinc-800 bg-[#16161a] p-2.5 rounded divide-y divide-zinc-800/50 space-y-1">
                {results.failed.map((fail, i) => (
                  <div key={i} className="text-[10px] pt-1 text-zinc-500 flex flex-col">
                    <span className="text-amber-400 font-semibold truncate">
                      Row: {fail.row.long_url || 'Blank Cell'}
                    </span>
                    <span className="text-red-400 font-medium">Issue: {fail.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 text-zinc-400 rounded transition-colors text-xs"
            >
              Shorten another sheet
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#6ee7b7] hover:bg-[#52cfa0] text-[#0d0d0f] rounded font-semibold transition-colors text-xs"
            >
              Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
