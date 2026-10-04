"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadResult {
  status: "success" | "error";
  title?: string;
  fileName?: string;
  numPages?: number;
  error?: string;
}

export function PdfImportForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setResult(null);
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: isUploading,
  });

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/knowledge/import/pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ status: "error", error: data.error || "Upload failed" });
        return;
      }

      setResult({
        status: "success",
        title: data.title,
        fileName: data.fileName,
        numPages: data.numPages,
      });
      setSelectedFile(null);
    } catch (error) {
      setResult({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import from PDF
        </CardTitle>
        <CardDescription>
          Upload a PDF document to extract its content into your knowledge base.
          Maximum file size: 10MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps({role:"button", "aria-label":"Choose a PDF document"})}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps({"aria-label":"PDF document"})} />
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-primary">Drop the PDF here...</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                Drag and drop a PDF here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF files up to 10MB
              </p>
            </>
          )}
        </div>

        {/* File rejections */}
        {fileRejections.length > 0 && (
          <p className="text-sm text-destructive">
            {fileRejections[0].errors[0]?.message || "Invalid file"}
          </p>
        )}

        {/* Selected file */}
        {selectedFile && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
              }}
              disabled={isUploading}
            >
              Remove
            </Button>
          </div>
        )}

        {/* Upload button */}
        <Button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading and processing...
            </>
          ) : (
            "Upload and Import"
          )}
        </Button>

        {/* Result */}
        {result && (
          <div
            className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
              result.status === "success"
                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
            }`}
          >
            {result.status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <div>
              {result.status === "success" ? (
                <>
                  <p className="font-medium">Successfully imported</p>
                  <p className="text-xs text-muted-foreground">
                    {result.title}
                    {result.numPages ? ` - ${result.numPages} pages` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Import failed</p>
                  <p className="mt-1 text-xs text-red-600">{result.error}</p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
