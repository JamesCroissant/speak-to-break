import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PronunciationResultsProps {
  results: {
    pronScore: number
    accuracyScore: number
    fluencyScore: number
    compScore: number
    prosodyScore: number
    // words: Array<{
    //   word: string
    //   accuracyScore: number
    //   errorType: string
    // }>
    words: any[]
  }
}

export default function PronunciationResults({ results }: PronunciationResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType) {
      case "None":
        return "bg-green-100 text-green-800"
      case "Insertion":
        return "bg-blue-100 text-blue-800"
      case "Omission":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Pronunciation Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold ${getScoreColor(results.pronScore)}`}
              >
                {results.pronScore}
              </div>
              <span className="mt-2 text-sm font-medium">Overall</span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold ${getScoreColor(results.accuracyScore)}`}
              >
                {results.accuracyScore}
              </div>
              <span className="mt-2 text-sm font-medium">Accuracy</span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold ${getScoreColor(results.fluencyScore)}`}
              >
                {results.fluencyScore}
              </div>
              <span className="mt-2 text-sm font-medium">Fluency</span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold ${getScoreColor(results.compScore)}`}
              >
                {results.compScore}
              </div>
              <span className="mt-2 text-sm font-medium">Completeness</span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold ${getScoreColor(results.prosodyScore)}`}
              >
                {results.prosodyScore}
              </div>
              <span className="mt-2 text-sm font-medium">Prosody</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Word-by-Word Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {results.words?.map((word, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{index + 1}.</span>
                  <span className="font-medium">{word.word}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getErrorTypeColor(word.errorType)}>
                    {word.errorType}
                  </Badge>
                  {word.errorType !== "Omission" && (
                    <div
                      className={`px-2 py-1 rounded-md text-white text-sm font-medium ${getScoreColor(word.accuracyScore)}`}
                    >
                      {word.accuracyScore}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

