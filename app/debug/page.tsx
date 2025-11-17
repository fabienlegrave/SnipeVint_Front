'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/layout/Navigation'
import { FileText, Download, Eye, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || 'vinted_scraper_secure_2024'

interface DebugFile {
  files: string[]
}

async function fetchDebugFiles(): Promise<DebugFile> {
  const response = await fetch('/api/v1/debug/api-response', {
    headers: {
      'x-api-key': API_SECRET
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch debug files')
  }

  return response.json()
}

async function fetchDebugFileContent(filename: string): Promise<any> {
  const response = await fetch(`/api/v1/debug/api-response?file=${encodeURIComponent(filename)}`, {
    headers: {
      'x-api-key': API_SECRET
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch debug file content')
  }

  return response.json()
}

export default function DebugPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<any>(null)

  const { data: debugFiles, isLoading, refetch } = useQuery({
    queryKey: ['debug-files'],
    queryFn: fetchDebugFiles,
    refetchOnWindowFocus: false
  })

  const { data: content, isLoading: isLoadingContent } = useQuery({
    queryKey: ['debug-file-content', selectedFile],
    queryFn: () => selectedFile ? fetchDebugFileContent(selectedFile) : null,
    enabled: !!selectedFile,
    refetchOnWindowFocus: false
  })

  const handleFileSelect = async (filename: string) => {
    setSelectedFile(filename)
    try {
      const data = await fetchDebugFileContent(filename)
      setFileContent(data)
    } catch (error) {
      console.error('Failed to load file:', error)
    }
  }

  const downloadFile = (filename: string) => {
    window.open(`/api/v1/debug/api-response?file=${encodeURIComponent(filename)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                API Debug - Raw Data
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View raw API responses to identify available data fields
              </p>
            </div>
            
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File List */}
            <Card>
              <CardHeader>
                <CardTitle>Debug Files</CardTitle>
                <CardDescription>
                  Latest API response snapshots (most recent first)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : debugFiles && debugFiles.files.length > 0 ? (
                  <div className="space-y-2">
                    {debugFiles.files.map((file) => (
                      <div
                        key={file}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFile === file
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleFileSelect(file)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-mono truncate">{file}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadFile(file)
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No debug files yet</p>
                    <p className="text-sm mt-2">Run a search to generate debug files</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Content */}
            <Card>
              <CardHeader>
                <CardTitle>File Content</CardTitle>
                <CardDescription>
                  {selectedFile ? `Viewing: ${selectedFile}` : 'Select a file to view its content'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingContent ? (
                  <Skeleton className="h-96" />
                ) : fileContent ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
                        <p className="text-lg font-semibold">{fileContent.total_items || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Available Keys</p>
                        <p className="text-lg font-semibold">{fileContent.sample_item_keys?.length || 0}</p>
                      </div>
                    </div>

                    {/* Keys List */}
                    {fileContent.sample_item_keys && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">All Available Keys:</h3>
                        <div className="flex flex-wrap gap-2">
                          {fileContent.sample_item_keys.map((key: string) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sample Item */}
                    {fileContent.sample_item_full && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Sample Item (Full Structure):</h3>
                        <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg overflow-auto text-xs max-h-96">
                          {JSON.stringify(fileContent.sample_item_full, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* All Items Keys Analysis */}
                    {fileContent.all_items_keys_analysis && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Keys Found Across All Items:</h3>
                        <div className="flex flex-wrap gap-2">
                          {fileContent.all_items_keys_analysis.map((key: string) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-mono"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a file from the list to view its content</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

