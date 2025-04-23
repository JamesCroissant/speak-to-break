"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Mic, Play, Square } from "lucide-react"
import PronunciationResults from "@/components/PronunciationResult"

export default function PronunciationAssessment() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [referenceText, setReferenceText] = useState(
    "Today was a beautiful day.",
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  const startRecording = async () => {
    try {
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        const audioUrl = URL.createObjectURL(audioBlob)

        setAudioBlob(audioBlob)
        setAudioUrl(audioUrl)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
  }

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play()
    }
  }

  const processAudio = async () => {
    if (!audioBlob) return

    setIsProcessing(true)

    try {
      // WAV形式に変換
      const wavBlob = await convertToWav(audioBlob)
      
      // Create form data to send the audio file
      const formData = new FormData()
      formData.append("audio", wavBlob, "audio.wav")
      formData.append("referenceText", referenceText)

      // Send to our API route
      const response = await fetch("/api/assess-pronunciation", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process audio")
      }

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error processing audio:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // WAV形式に変換する関数
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    // AudioContextを作成
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // BlobをArrayBufferに変換
    const arrayBuffer = await blob.arrayBuffer()
    
    // 音声データをデコード
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // WAVエンコーダーを作成
    const wavBuffer = audioBufferToWav(audioBuffer)
    
    // WAVデータをBlobに変換
    return new Blob([wavBuffer], { type: 'audio/wav' })
  }

  // AudioBufferをWAV形式に変換する関数
  const audioBufferToWav = (buffer: AudioBuffer): Uint8Array => {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2
    const buffer16Bit = new Int16Array(buffer.length * numOfChan)
    const sampleRate = buffer.sampleRate
    const result = new Uint8Array(44 + length)
    let offset = 0
    let pos = 0
    let i = 0
    
    // チャンネルデータを結合
    for (i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i)
      for (let j = 0; j < channel.length; j++) {
        buffer16Bit[pos++] = channel[j] * 0x7FFF
      }
    }
    
    // WAVヘッダーを書き込み
    writeUTFBytes(result, offset, 'RIFF')
    offset += 4
    writeUint32(result, offset, 36 + length)
    offset += 4
    writeUTFBytes(result, offset, 'WAVE')
    offset += 4
    writeUTFBytes(result, offset, 'fmt ')
    offset += 4
    writeUint32(result, offset, 16)
    offset += 4
    writeUint16(result, offset, 1)
    offset += 2
    writeUint16(result, offset, numOfChan)
    offset += 2
    writeUint32(result, offset, sampleRate)
    offset += 4
    writeUint32(result, offset, sampleRate * 2 * numOfChan)
    offset += 4
    writeUint16(result, offset, numOfChan * 2)
    offset += 2
    writeUint16(result, offset, 16)
    offset += 2
    writeUTFBytes(result, offset, 'data')
    offset += 4
    writeUint32(result, offset, length)
    offset += 4
    
    // 音声データを書き込み
    const view = new DataView(result.buffer)
    for (i = 0; i < buffer16Bit.length; i++) {
      view.setInt16(offset, buffer16Bit[i], true)
      offset += 2
    }
    
    return result
  }
  
  // ヘルパー関数
  const writeUTFBytes = (view: Uint8Array, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view[offset++] = string.charCodeAt(i)
    }
  }
  
  const writeUint16 = (view: Uint8Array, offset: number, value: number) => {
    view[offset++] = value & 0xFF
    view[offset++] = value >> 8
  }
  
  const writeUint32 = (view: Uint8Array, offset: number, value: number) => {
    view[offset++] = value & 0xFF
    view[offset++] = value >> 8
    view[offset++] = value >> 16
    view[offset++] = value >> 24
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Pronunciation Assessment</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reference Text</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full p-3 border rounded-md min-h-[100px]"
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Audio Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <Button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? (
                  <>
                    <Square className="mr-2 h-4 w-4" /> Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" /> Start Recording
                  </>
                )}
              </Button>

              {/* <Button variant="outline" onClick={triggerFileInput}>
                <Upload className="mr-2 h-4 w-4" /> Upload Audio
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" /> */}
            </div>

            {audioUrl && (
              <div className="mt-4">
                <audio 
                  controls 
                  className="w-full"
                  src={audioUrl}
                >
                  <source src={audioUrl} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>

                <Button className="mt-4" onClick={processAudio} disabled={isProcessing}>
                  <Play className="mr-2 h-4 w-4" />
                  {isProcessing ? "Processing..." : "Assess Pronunciation"}
                </Button>

                {isProcessing && <Progress value={45} className="mt-2" />}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results && <PronunciationResults results={results} />}
    </div>
  )
}

