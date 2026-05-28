'use client'

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/store/calendar-store'
import { Upload, FileText, FileJson, AlertCircle, CheckCircle2, Info, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type ImportFileType = 'ics' | 'json' | 'csv' | 'excel'

interface ImportResult {
  imported: number
  skipped: number
  eventTypesMatched: number
  eventTypesCreated: number
  errors: string[]
}

export function ImportDialog() {
  const { isImportDialogOpen, closeImportDialog, currentUser, importCalendar } = useCalendarStore()
  const { toast } = useToast()

  const [fileType, setFileType] = useState<ImportFileType>('json')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    // Determine file type from extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'ics') {
      setFileType('ics')
    } else if (ext === 'json') {
      setFileType('json')
    } else if (ext === 'csv') {
      setFileType('csv')
    } else if (ext === 'xlsx' || ext === 'xls') {
      setFileType('excel')
    }

    // Read file content
    if (ext === 'xlsx' || ext === 'xls') {
      // Read Excel files as base64
      const reader = new FileReader()
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )
        setFileContent(base64)
        setResult(null)
      }
      reader.readAsArrayBuffer(file)
    } else {
      // Read text files (JSON, ICS, CSV)
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setFileContent(content)
        setResult(null)
      }
      reader.readAsText(file)
    }
  }

  const handleImport = async () => {
    if (!fileContent || !currentUser) return

    setIsImporting(true)
    setResult(null)

    try {
      const importResult = await importCalendar(currentUser.id, fileType, fileContent)
      setResult(importResult)

      if (importResult.imported > 0) {
        toast({
          title: '导入成功',
          description: `成功导入 ${importResult.imported} 个事件${importResult.eventTypesCreated > 0 ? `，新建 ${importResult.eventTypesCreated} 个事件类型` : ''}`,
        })
      }
    } catch (error) {
      toast({
        title: '导入失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFileContent('')
    setFileName('')
    setResult(null)
    closeImportDialog()
  }

  const formatButtons: { type: ImportFileType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'json', icon: <FileJson className="h-5 w-5" />, label: 'JSON', desc: '自定义格式' },
    { type: 'ics', icon: <FileText className="h-5 w-5" />, label: 'ICS', desc: 'iCalendar 标准' },
    { type: 'csv', icon: <FileSpreadsheet className="h-5 w-5" />, label: 'CSV', desc: '逗号分隔值' },
    { type: 'excel', icon: <FileSpreadsheet className="h-5 w-5" />, label: 'Excel', desc: 'XLSX/XLS' },
  ]

  return (
    <Dialog open={isImportDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            导入日历
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">文件格式</label>
            <div className="grid grid-cols-2 gap-2">
              {formatButtons.map((fb) => (
                <button
                  key={fb.type}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors',
                    fileType === fb.type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                  onClick={() => setFileType(fb.type)}
                >
                  {fb.icon}
                  <div className="text-left">
                    <div className="text-sm font-medium">{fb.label}</div>
                    <div className="text-[10px] opacity-70">{fb.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format description */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                {fileType === 'json' ? (
                  <>
                    <p className="font-medium text-foreground">JSON 格式要求</p>
                    <pre className="bg-background rounded p-2 overflow-x-auto text-[10px] leading-relaxed">{`{
  "events": [
    {
      "title": "事件标题",
      "description": "描述(可选)",
      "startDate": "2025-01-15",
      "endDate": "2025-01-16",
      "allDay": true,
      "eventTypeName": "会议"
    }
  ]
}`}</pre>
                    <p>• <code className="bg-background px-1 rounded">title</code> 和 <code className="bg-background px-1 rounded">startDate</code> 为必填</p>
                    <p>• <code className="bg-background px-1 rounded">eventTypeName</code> 会自动匹配已有类型，未匹配则新建</p>
                    <p>• 日期格式支持: YYYY-MM-DD 或 ISO 8601</p>
                  </>
                ) : fileType === 'ics' ? (
                  <>
                    <p className="font-medium text-foreground">ICS 格式要求</p>
                    <p>• 标准 iCalendar (.ics) 文件，兼容 Google Calendar、Outlook 等导出</p>
                    <p>• CATEGORIES 字段将作为事件类型名称进行匹配</p>
                    <p>• 支持全天事件和定时事件</p>
                    <p>• 重复事件(RRULE)仅导入首次出现</p>
                  </>
                ) : fileType === 'csv' ? (
                  <>
                    <p className="font-medium text-foreground">CSV 格式要求</p>
                    <pre className="bg-background rounded p-2 overflow-x-auto text-[10px] leading-relaxed">{`title,startDate,endDate,allDay,eventTypeName,description
"会议","2025-01-15","2025-01-16",true,"工作","项目讨论"
"培训","2025-01-20","",true,"学习","技术培训"`}</pre>
                    <p>• 第一行为表头，必填列: <code className="bg-background px-1 rounded">title</code>、<code className="bg-background px-1 rounded">startDate</code></p>
                    <p>• 可选列: <code className="bg-background px-1 rounded">endDate</code>、<code className="bg-background px-1 rounded">allDay</code>、<code className="bg-background px-1 rounded">eventTypeName</code>、<code className="bg-background px-1 rounded">description</code></p>
                    <p>• 也支持中文列名: 标题、开始日期、结束日期、全天、事件类型、描述</p>
                    <p>• 日期格式: YYYY-MM-DD 或 YYYY/MM/DD</p>
                    <p>• <code className="bg-background px-1 rounded">eventTypeName</code> 会自动匹配已有类型，未匹配则新建</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Excel 格式要求</p>
                    <p>• 支持 .xlsx 和 .xls 文件</p>
                    <p>• 第一行为表头，必填列: <code className="bg-background px-1 rounded">title</code>、<code className="bg-background px-1 rounded">startDate</code></p>
                    <p>• 可选列: <code className="bg-background px-1 rounded">endDate</code>、<code className="bg-background px-1 rounded">allDay</code>、<code className="bg-background px-1 rounded">eventTypeName</code>、<code className="bg-background px-1 rounded">description</code></p>
                    <p>• 也支持中文列名: 标题、开始日期、结束日期、全天、事件类型、描述</p>
                    <p>• 日期格式: YYYY-MM-DD 或 YYYY/MM/DD，也支持 Excel 日期格式</p>
                    <p>• <code className="bg-background px-1 rounded">eventTypeName</code> 会自动匹配已有类型，未匹配则新建</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择文件</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.ics,.csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <div className="space-y-1">
                  <FileText className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {fileContent.length > 0 ? `${(fileContent.length / 1024).toFixed(1)} KB` : '读取中...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击选择文件</p>
                  <p className="text-xs text-muted-foreground">支持 .json、.ics、.csv、.xlsx、.xls 文件</p>
                </div>
              )}
            </div>
          </div>

          {/* Import result */}
          {result && (
            <div className="space-y-2">
              <div className={cn(
                'rounded-lg p-3 space-y-1',
                result.imported > 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
              )}>
                <div className="flex items-center gap-2 font-medium">
                  {result.imported > 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  导入结果
                </div>
                <div className="text-xs space-y-0.5 ml-6">
                  <p>✅ 成功导入: {result.imported} 个事件</p>
                  {result.skipped > 0 && <p>⏭️ 跳过: {result.skipped} 个（重复或无效）</p>}
                  {result.eventTypesMatched > 0 && <p>🔗 匹配已有类型: {result.eventTypesMatched} 个</p>}
                  {result.eventTypesCreated > 0 && <p>🆕 新建事件类型: {result.eventTypesCreated} 个</p>}
                  {result.errors.length > 0 && (
                    <div className="mt-1 text-red-600">
                      <p>❌ 错误:</p>
                      {result.errors.slice(0, 5).map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                      {result.errors.length > 5 && <p>... 还有 {result.errors.length - 5} 个错误</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? '关闭' : '取消'}
            </Button>
            {!result && (
              <Button
                onClick={handleImport}
                disabled={!fileContent || isImporting}
              >
                {isImporting ? '导入中...' : '开始导入'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
